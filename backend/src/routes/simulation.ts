import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import Groq from 'groq-sdk';
import { authMiddleware } from '../middleware/auth.js';

const app = new Hono<{ Variables: { userId: string } }>();

app.use('/*', authMiddleware);

const INTERPRET_DEFAULT_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const interpretSimulationSchema = z.object({
  meta: z.coerce.number().positive(),
  prazo: z.coerce.number().int().positive(),
  sobra: z.coerce.number(),
  desvio: z.coerce.number().nonnegative(),
  prob: z.coerce.number(),
  mediana: z.coerce.number(),
  p90: z.coerce.number(),
  p10: z.coerce.number(),
  mesMediana: z.coerce.number().int().positive().nullable(),
  extraNecessario: z.coerce.number(),
  extra: z.coerce.number().positive().optional(),
  probExtra: z.coerce.number().optional(),
});

type InterpretSimulationInput = z.infer<typeof interpretSimulationSchema>;

const INTERPRET_SYSTEM_PROMPT =
  'Você é um consultor financeiro brasileiro especializado em planejamento de metas. Seja direto, cite os números, e dê uma recomendação prática.';

function getGroqConfig(defaultModel: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    model: process.env.GROQ_MODEL ?? defaultModel,
  };
}

async function requestGroqText(params: {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  userPrompt: string;
}) {
  const groq = new Groq({ apiKey: params.apiKey });

  const completion = await groq.chat.completions.create({
    model: params.model,
    max_tokens: params.maxTokens,
    temperature: params.temperature,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userPrompt },
    ],
  });

  return {
    text: completion.choices[0]?.message?.content?.trim() ?? '',
    model: completion.model,
  };
}

function buildInterpretSimulationPrompt(body: InterpretSimulationInput) {
  return [
    'Interprete esta simulação Monte Carlo de meta financeira de forma direta e objetiva.',
    'Português brasileiro, 3-4 frases com os números. Sem listas, sem bullet points.',
    `- Meta: R$${body.meta.toLocaleString('pt-BR')} em ${body.prazo} meses`,
    `- Sobra mensal atual: R$${body.sobra.toLocaleString('pt-BR')}/mês ± R$${body.desvio.toLocaleString('pt-BR')}`,
    `- Probabilidade de sucesso: ${body.prob}%`,
    `- Mediana final: R$${body.mediana.toLocaleString('pt-BR')} | P90: R$${body.p90.toLocaleString('pt-BR')} | P10: R$${body.p10.toLocaleString('pt-BR')}`,
    body.mesMediana
      ? `- 50% das simulações atingem a meta no mês ${body.mesMediana}`
      : '- Menos de 50% atingem no prazo',
    body.extraNecessario > 0
      ? `- Faltam R$${body.extraNecessario.toLocaleString('pt-BR')}/mês para 80% de probabilidade`
      : '- Meta já com 80%+ de probabilidade',
    body.extra && body.extra > 0
      ? `- Hipótese (+R$${body.extra.toLocaleString('pt-BR')}/mês): ${body.probExtra}% de probabilidade`
      : '',
    'Conclua com a ação mais específica e impactante para aumentar a probabilidade de sucesso.',
  ]
    .filter(Boolean)
    .join('\n');
}

app.post('/interpret', zValidator('json', interpretSimulationSchema), async (c) => {
  const groqConfig = getGroqConfig(INTERPRET_DEFAULT_MODEL);
  if (!groqConfig) {
    return c.json({ error: 'GROQ_API_KEY não configurada no servidor' }, 500);
  }

  try {
    const body = c.req.valid('json');
    const prompt = buildInterpretSimulationPrompt(body);

    const { text, model } = await requestGroqText({
      apiKey: groqConfig.apiKey,
      model: groqConfig.model,
      maxTokens: 400,
      temperature: 0.6,
      systemPrompt: INTERPRET_SYSTEM_PROMPT,
      userPrompt: prompt,
    });

    if (!text) {
      return c.json({ error: 'O modelo não retornou conteúdo para a interpretação.' }, 502);
    }

    return c.json({ text, model });
  } catch (error) {
    console.error('Erro na interpretação Monte Carlo:', error);
    return c.json({ error: 'Erro ao interpretar a simulação.' }, 500);
  }
});

export default app;
