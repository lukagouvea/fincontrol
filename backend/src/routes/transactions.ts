import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { addMonthsClamped, isOwnCard } from '../lib/cards.js';
import { CATEGORY_NOT_FOUND, isOwnCategory } from '../lib/categories.js';

const app = new Hono<{ Variables: { userId: string } }>();

// Protege todas as rotas
app.use('/*', authMiddleware);

// --- SCHEMAS DE VALIDAÇÃO (Zod) ---

// 1. Para Transação Simples (Renda ou Despesa à vista)
const transactionSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.number().positive("O valor deve ser positivo"),
  date: z.iso.datetime(), // Espera ISO String (UTC)
  type: z.enum(['income', 'expense']),
  categoryId: z.uuid("ID de categoria inválido"),
  isPaid: z.boolean().optional().default(false), // Novo campo que adicionamos no schema
  // Forma de pagamento: id do cartão ou null = À vista.
  cardId: z.uuid().nullable().optional(),
});

// 2. Para Compra Parcelada
const installmentSchema = z.object({
  description: z.string().min(1),
  totalAmount: z.number().positive(),
  totalInstallments: z.number().min(2, "Mínimo de 2 parcelas").max(60),
  date: z.iso.datetime(), // Data da compra (1ª parcela)
  categoryId: z.uuid(),
  cardId: z.uuid().nullable().optional(),
});

const CARD_NOT_FOUND = { error: 'Cartão não encontrado' };

// --- ROTAS ---

const listInclude = {
  category: { select: { id: true, name: true, color: true, type: true } },
  installmentGroup: { select: { totalInstallments: true } },
} as const;

type ListedTransaction = Awaited<ReturnType<typeof prisma.transaction.findMany<{ include: typeof listInclude }>>>[number];

const formatListed = (t: ListedTransaction) => ({
  ...t,
  amount: Number(t.amount),
  installmentInfo: t.installmentGroupId
    ? { current: t.installmentNumber, total: t.installmentGroup?.totalInstallments }
    : null,
});

// Todas as transações de um cartão (fatura e limite usado). Lista pequena por
// cartão; o cliente agrupa por fatura.
app.get('/by-card/:cardId', async (c) => {
  const userId = c.var.userId;
  const cardId = c.req.param('cardId');
  if (!(await isOwnCard(userId, cardId))) return c.json(CARD_NOT_FOUND, 404);
  const transactions = await prisma.transaction.findMany({
    where: { userId, cardId },
    include: listInclude,
    orderBy: { date: 'desc' },
  });
  return c.json(transactions.map(formatListed));
});

// Compras parceladas que ainda têm parcelas deste mês em diante (Compromissos).
// Devolve todas as parcelas desses grupos, inclusive as já passadas, para
// mostrar o progresso "parcela 4 de 10".
app.get('/installments/active', async (c) => {
  const userId = c.var.userId;
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const groups = await prisma.transaction.findMany({
    where: { userId, installmentGroupId: { not: null }, date: { gte: monthStart } },
    select: { installmentGroupId: true },
    distinct: ['installmentGroupId'],
  });
  const ids = groups.map((g) => g.installmentGroupId!).filter(Boolean);
  if (!ids.length) return c.json([]);
  const transactions = await prisma.transaction.findMany({
    where: { userId, installmentGroupId: { in: ids } },
    include: listInclude,
    orderBy: [{ installmentGroupId: 'asc' }, { installmentNumber: 'asc' }],
  });
  return c.json(transactions.map(formatListed));
});

// 1. LISTAR (GET /transactions?month=11&year=2025)
app.get('/', async (c) => {
  const userId = c.var.userId;
  const month = Number(c.req.query('month')); // 1 a 12
  const year = Number(c.req.query('year'));

  if (!month || !year) {
    return c.json({ error: 'Parâmetros month e year são obrigatórios' }, 400);
  }

  // Define o intervalo do mês
  // Nota: No Date() do JS, mês vai de 0-11. Ajustamos aqui.
  const startDate = new Date(year, month - 1, 1); 
  const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Último momento do mês

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: listInclude,
      orderBy: {
        date: 'desc', // Mais recentes primeiro
      },
    });

    // Opcional: Formatamos o retorno para facilitar pro front
    const formatted = transactions.map(formatListed);

    return c.json(formatted);

  } catch (error) {
    console.error(error);
    return c.json({ error: 'Erro ao buscar transações' }, 500);
  }
});

// 2. CRIAR SIMPLES (POST /transactions)
app.post('/', zValidator('json', transactionSchema), async (c) => {
  const userId = c.var.userId;
  const body = c.req.valid('json');
  if (!(await isOwnCard(userId, body.cardId))) return c.json(CARD_NOT_FOUND, 404);
  if (!(await isOwnCategory(userId, body.categoryId, body.type))) return c.json(CATEGORY_NOT_FOUND, 404);

  try {
    const transaction = await prisma.transaction.create({
      data: {
        userId: userId,
        description: body.description,
        amount: body.amount,
        date: new Date(body.date),
        type: body.type,
        categoryId: body.categoryId,
        cardId: body.cardId ?? null,
      }
    });

    return c.json(transaction, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Erro ao criar transação' }, 500);
  }
});

// 3. CRIAR PARCELADO (POST /transactions/installment)
// Essa é a rota "Complexa" que substitui o generateParcelas do front
app.post('/installment', zValidator('json', installmentSchema), async (c) => {
  const userId = c.var.userId;
  const body = c.req.valid('json');
  if (!(await isOwnCard(userId, body.cardId))) return c.json(CARD_NOT_FOUND, 404);
  if (!(await isOwnCategory(userId, body.categoryId, 'expense'))) return c.json(CATEGORY_NOT_FOUND, 404);

  try {
    // Usamos transaction interativa do Prisma para garantir integridade
    // Se falhar na criação das parcelas, ele desfaz a criação do grupo.
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Cria o Cabeçalho (O Grupo)
      const group = await tx.installmentGroup.create({
        data: {
          userId: userId,
          description: body.description,
          totalAmount: body.totalAmount,
          totalInstallments: body.totalInstallments,
          cardId: body.cardId ?? null,
        }
      });

      // B. Prepara as N parcelas
      // O valor da parcela pode dar dízima (ex: 100 / 3 = 33.333...)
      // Vamos arredondar e jogar a diferença na primeira parcela
      const rawInstallmentValue = Math.floor((body.totalAmount / body.totalInstallments) * 100) / 100;
      const diff = Math.round((body.totalAmount - (rawInstallmentValue * body.totalInstallments)) * 100) / 100;

      const transactionsPayload = [];
      const baseDate = new Date(body.date);

      for (let i = 0; i < body.totalInstallments; i++) {
        const isFirst = i === 0;
        const amount = isFirst ? (rawInstallmentValue + diff) : rawInstallmentValue;
        
        // Mês inicial + i, sem transbordar (31/jan → 28/fev, não 3/mar).
        const installmentDate = addMonthsClamped(baseDate, i);

        transactionsPayload.push({
          userId: userId,
          categoryId: body.categoryId,
          description: body.description, // O front pode adicionar "(1/10)" na exibição
          amount: amount,
          date: installmentDate,
          type: 'expense', // Parcelamento geralmente é despesa
          installmentGroupId: group.id,
          installmentNumber: i + 1,
          cardId: body.cardId ?? null,
        });
      }

      // C. Insere todas de uma vez
      await tx.transaction.createMany({
        data: transactionsPayload
      });

      return group;
    });

    return c.json({ message: 'Compra parcelada criada com sucesso', groupId: result.id }, 201);

  } catch (error) {
    console.error('Erro no parcelamento:', error);
    return c.json({ error: 'Erro ao processar parcelamento' }, 500);
  }
});

// 4. EDITAR (PUT /transactions/:id)
app.put('/:id', zValidator('json', transactionSchema.partial()), async (c) => {
  const userId = c.var.userId;
  const id = c.req.param('id');
  const body = c.req.valid('json');

  // Verifica se pertence ao usuário
  const existing = await prisma.transaction.findFirst({ where: { id, userId: userId } });
  if (!existing) return c.json({ error: 'Transação não encontrada' }, 404);
  if (!(await isOwnCard(userId, body.cardId))) return c.json(CARD_NOT_FOUND, 404);
  if (!(await isOwnCategory(userId, body.categoryId, body.type ?? existing.type))) return c.json(CATEGORY_NOT_FOUND, 404);

  // Trocar o cartão de uma parcela troca o da compra inteira.
  if (existing.installmentGroupId && body.cardId !== undefined && body.cardId !== existing.cardId) {
    await prisma.$transaction([
      prisma.installmentGroup.update({ where: { id: existing.installmentGroupId }, data: { cardId: body.cardId } }),
      prisma.transaction.updateMany({ where: { installmentGroupId: existing.installmentGroupId }, data: { cardId: body.cardId } }),
    ]);
  }

  // Se for parcela, bloqueia edição de valor/data (por enquanto, para simplificar)
  // Ou permite editar apenas aquela parcela específica
  
  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      description: body.description,
      amount: body.amount,
      date: body.date ? new Date(body.date) : undefined,
      categoryId: body.categoryId,
      type: body.type,
      cardId: body.cardId,
    }
  });

  return c.json(updated);
});

// 5. DELETAR (DELETE /transactions/:id)
// Lógica inteligente: Se for parcela, deleta TUDO. Se for simples, deleta UMA.
app.delete('/:id', async (c) => {
  const userId = c.var.userId;
  const id = c.req.param('id');

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: userId }
  });

  if (!transaction) return c.json({ error: 'Transação não encontrada' }, 404);

  try {
    if (transaction.installmentGroupId) {
      // É uma parcela! Deletamos o GRUPO MÃE.
      // O "ON DELETE CASCADE" do banco vai apagar todas as parcelas automaticamente.
      await prisma.installmentGroup.delete({
        where: { id: transaction.installmentGroupId }
      });
      return c.json({ message: 'Compra parcelada inteira removida' });
    } else {
      // Transação simples
      await prisma.transaction.delete({
        where: { id }
      });
      return c.json({ message: 'Transação removida' });
    }
  } catch (error) {
    return c.json({ error: 'Erro ao deletar' }, 500);
  }
});

export default app;