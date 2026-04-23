import { Hono } from 'hono';
import { z } from 'zod';
import Groq from 'groq-sdk';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const app = new Hono<{ Variables: { userId: string } }>();

app.use('/*', authMiddleware);

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ANALYZE_DEFAULT_MODEL = 'groq/compound';

function normalizeSeverity(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (
    normalized.includes('alta') ||
    normalized.includes('alto') ||
    normalized.includes('high') ||
    normalized.includes('severa') ||
    normalized.includes('severo') ||
    normalized.includes('critica')
  ) {
    return 'alta';
  }

  if (
    normalized.includes('media') ||
    normalized.includes('medio') ||
    normalized.includes('moderada') ||
    normalized.includes('moderado') ||
    normalized.includes('medium')
  ) {
    return 'media';
  }

  if (
    normalized.includes('baixa') ||
    normalized.includes('baixo') ||
    normalized.includes('low') ||
    normalized.includes('leve')
  ) {
    return 'baixa';
  }

  return normalized;
}

const severitySchema = z.preprocess(normalizeSeverity, z.enum(['alta', 'media', 'baixa']));

const biasSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().min(1),
  evidencias: z.array(z.string().min(1)).min(1),
  severidade: severitySchema,
  recomendacao: z.string().min(1),
});

const behavioralInsightsSchema = z.object({
  perfil: z.string().min(1),
  gatilho_principal: z.string().min(1),
  vieses: z.array(biasSchema).length(3),
});

type BehavioralInsights = z.infer<typeof behavioralInsightsSchema>;
type TxForBehavioral = {
  date: Date;
  amount: unknown;
  description: string;
  category: { name: string } | null;
};

function toAmount(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    throw new Error('Valor de transação inválido para análise');
  }
  return amount;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildPayload(transactions: TxForBehavioral[]) {
  const normalized = transactions.map((transaction) => ({
    ...transaction,
    amount: toAmount(transaction.amount),
  }));

  const totalGasto = normalized.reduce((s, t) => s + t.amount, 0);
  const qtd = normalized.length;

  const porCategoria: Record<string, { total: number; count: number }> = {};
  for (const t of normalized) {
    const cat = t.category?.name ?? 'Sem Categoria';
    porCategoria[cat] ??= { total: 0, count: 0 };
    porCategoria[cat].total += t.amount;
    porCategoria[cat].count++;
  }

  const porDiaSemana: Record<string, { total: number; count: number }> = {};
  for (const t of normalized) {
    const d = DAY_NAMES[t.date.getDay()];
    porDiaSemana[d] ??= { total: 0, count: 0 };
    porDiaSemana[d].total += t.amount;
    porDiaSemana[d].count++;
  }

  const porFaixaMes = { d1a5: 0, d6a15: 0, d16a31: 0 };
  for (const t of normalized) {
    const dia = t.date.getDate();
    if (dia <= 5) porFaixaMes.d1a5 += t.amount;
    else if (dia <= 15) porFaixaMes.d6a15 += t.amount;
    else porFaixaMes.d16a31 += t.amount;
  }

  const fimDeSemana = normalized
    .filter((t) => [0, 6].includes(t.date.getDay()))
    .reduce((s, t) => s + t.amount, 0);

  const top5 = [...normalized]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((t) => ({
      v: round2(t.amount),
      d: t.description.slice(0, 30),
      c: t.category?.name ?? '-',
      ds: DAY_NAMES[t.date.getDay()],
      dm: t.date.getDate(),
    }));

  return {
    n: qtd,
    total: round2(totalGasto),
    media: qtd > 0 ? round2(totalGasto / qtd) : 0,
    fds: round2(fimDeSemana),
    util: round2(totalGasto - fimDeSemana),
    cat: Object.fromEntries(
      Object.entries(porCategoria)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([k, v]) => [k, { t: round2(v.total), n: v.count }]),
    ),
    sem: Object.fromEntries(
      Object.entries(porDiaSemana).map(([k, v]) => [k, { t: round2(v.total), n: v.count }]),
    ),
    mes: {
      d1a5: round2(porFaixaMes.d1a5),
      d6a15: round2(porFaixaMes.d6a15),
      d16a31: round2(porFaixaMes.d16a31),
    },
    top5,
  };
}

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

function extractJsonBlock(text: string): { thinking: string; rawJson: string } {
  const tagged = text.match(/<json>\s*([\s\S]*?)\s*<\/json>/i);
  if (tagged?.[1]) {
    return {
      thinking: text.slice(0, tagged.index ?? 0).trim(),
      rawJson: tagged[1].trim(),
    };
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error('Resposta da IA sem bloco JSON válido');
  }

  return {
    thinking: text.slice(0, firstBrace).trim(),
    rawJson: text.slice(firstBrace, lastBrace + 1).trim(),
  };
}

function parseBehavioralInsights(fullText: string): { thinking: string; insights: BehavioralInsights } {
  const { thinking, rawJson } = extractJsonBlock(fullText);
  const parsed = JSON.parse(rawJson);
  const insights = behavioralInsightsSchema.parse(parsed);
  return { thinking, insights };
}

const SYSTEM_PROMPT = `Você é um especialista em behavioral finance e psicologia econômica aplicada às finanças pessoais brasileiras.

Você receberá um resumo estatístico dos gastos de um usuário dos últimos 90 dias. Os dados já estão agregados por categoria, dia da semana, faixa do mês e incluem as 5 maiores transações.

Analise os dados pensando em voz alta. Examine cada dimensão:

1. **Categorias**: Quais concentram gastos? Há subscription creep (muitas assinaturas pequenas)? Existe mental accounting (gastar "livremente" em certas categorias)?
2. **Dias da semana**: O usuário gasta mais no fim de semana? Há um padrão de compras em dias específicos?
3. **Faixa do mês**: Os dias 1-5 (pós-recebimento) têm gastos maiores? Isso pode indicar present bias — a sensação de "tenho dinheiro agora".
4. **Top 5 maiores transações**: Parecem planejadas ou impulsivas? Em que dias do mês e da semana ocorreram?
5. **Fim de semana vs dia útil**: A proporção revela padrão de consumo hedônico ou social?

Cite valores específicos dos dados em seu raciocínio. Seja analítico e mostre seu processo de pensamento antes de concluir.

Ao final do raciocínio, retorne EXATAMENTE este bloco JSON e nada mais após ele:

<json>
{
  "perfil": "Uma frase descrevendo o perfil comportamental do usuário",
  "gatilho_principal": "O principal gatilho de gastos identificado com base nos dados",
  "vieses": [
    {
      "nome": "Nome do viés cognitivo em português",
      "descricao": "Explicação clara do viés com referência a dados reais do sumário",
      "evidencias": ["evidência concreta com número real", "segunda evidência", "terceira evidência"],
      "severidade": "alta",
      "recomendacao": "Sugestão prática e acionável para mitigar esse viés"
    }
  ]
}
</json>

Identifique exatamente 3 vieses. O campo severidade deve ser: alta, media ou baixa.`;

app.post('/analyze', async (c) => {
  const userId = c.var.userId;

  const groqConfig = getGroqConfig(ANALYZE_DEFAULT_MODEL);
  if (!groqConfig) {
    return c.json({ error: 'GROQ_API_KEY não configurada no servidor' }, 500);
  }

  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const transactions = await prisma.transaction.findMany({
      where: { userId, type: 'expense', date: { gte: ninetyDaysAgo } },
      include: { category: { select: { name: true } } },
      orderBy: { date: 'asc' },
    });

    if (transactions.length < 5) {
      return c.json(
        { error: 'Dados insuficientes. Adicione pelo menos 5 transações de despesa para análise.' },
        400,
      );
    }

    const payload = buildPayload(transactions);
    const userContent = `Estatísticas (90 dias):\n${JSON.stringify(payload)}`;
    const totalBytes = Buffer.byteLength(SYSTEM_PROMPT + userContent, 'utf8');
    console.log(
      `[behavioral] route=analyze model=${groqConfig.model} tx=${transactions.length} payload=${totalBytes}B`,
    );

    const { text: fullText, model } = await requestGroqText({
      apiKey: groqConfig.apiKey,
      model: groqConfig.model,
      maxTokens: 1500,
      temperature: 0.65,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: userContent,
    });

    if (!fullText) {
      return c.json({ error: 'O modelo não retornou conteúdo para a análise.' }, 502);
    }

    const { thinking, insights } = parseBehavioralInsights(fullText);

    return c.json({
      thinking,
      insights,
      fullText,
      transactionCount: transactions.length,
      periodDays: 90,
      model,
    });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      console.error('Resposta inválida do modelo no agente comportamental:', error);
      return c.json({ error: 'Resposta inválida recebida do modelo de análise.' }, 502);
    }

    console.error('Erro no agente comportamental:', error);
    return c.json({ error: 'Erro interno ao processar a análise.' }, 500);
  }
});

export default app;
