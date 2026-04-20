import { Hono } from 'hono';
import Groq from 'groq-sdk';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const app = new Hono<{ Variables: { userId: string } }>();

app.use('/*', authMiddleware);

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function buildPayload(
  transactions: Array<{
    date: Date;
    amount: unknown;
    description: string;
    category: { name: string } | null;
  }>,
) {
  const totalGasto = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const qtd = transactions.length;

  const porCategoria: Record<string, { total: number; count: number }> = {};
  for (const t of transactions) {
    const cat = t.category?.name ?? 'Sem Categoria';
    porCategoria[cat] ??= { total: 0, count: 0 };
    porCategoria[cat].total += Number(t.amount);
    porCategoria[cat].count++;
  }

  const porDiaSemana: Record<string, { total: number; count: number }> = {};
  for (const t of transactions) {
    const d = DAY_NAMES[t.date.getDay()];
    porDiaSemana[d] ??= { total: 0, count: 0 };
    porDiaSemana[d].total += Number(t.amount);
    porDiaSemana[d].count++;
  }

  const porFaixaMes = { d1a5: 0, d6a15: 0, d16a31: 0 };
  for (const t of transactions) {
    const dia = t.date.getDate();
    if (dia <= 5) porFaixaMes.d1a5 += Number(t.amount);
    else if (dia <= 15) porFaixaMes.d6a15 += Number(t.amount);
    else porFaixaMes.d16a31 += Number(t.amount);
  }

  const fimDeSemana = transactions
    .filter((t) => [0, 6].includes(t.date.getDay()))
    .reduce((s, t) => s + Number(t.amount), 0);

  const top5 = [...transactions]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map((t) => ({
      v: Math.round(Number(t.amount) * 100) / 100,
      d: t.description.slice(0, 30),
      c: t.category?.name ?? '-',
      ds: DAY_NAMES[t.date.getDay()],
      dm: t.date.getDate(),
    }));

  const r = (n: number) => Math.round(n * 100) / 100;

  return {
    n: qtd,
    total: r(totalGasto),
    media: r(totalGasto / qtd),
    fds: r(fimDeSemana),
    util: r(totalGasto - fimDeSemana),
    cat: Object.fromEntries(
      Object.entries(porCategoria)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([k, v]) => [k, { t: r(v.total), n: v.count }]),
    ),
    sem: Object.fromEntries(
      Object.entries(porDiaSemana).map(([k, v]) => [k, { t: r(v.total), n: v.count }]),
    ),
    mes: { d1a5: r(porFaixaMes.d1a5), d6a15: r(porFaixaMes.d6a15), d16a31: r(porFaixaMes.d16a31) },
    top5,
  };
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

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const GROQ_MODEL   = process.env.GROQ_MODEL ?? 'groq/compound';

  if (!GROQ_API_KEY) {
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
    console.log(`[behavioral] model=${GROQ_MODEL} tx=${transactions.length} payload=${totalBytes}B`);

    const groq = new Groq({ apiKey: GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: 1500,
      temperature: 0.65,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    });

    const fullText = completion.choices[0]?.message?.content ?? '';

    return c.json({
      fullText,
      transactionCount: transactions.length,
      periodDays: 90,
      model: completion.model,
    });
  } catch (error) {
    console.error('Erro no agente comportamental:', error);
    return c.json({ error: 'Erro interno ao processar a análise.' }, 500);
  }
});

export default app;
