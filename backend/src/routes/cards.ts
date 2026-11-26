import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const app = new Hono<{ Variables: { userId: string } }>();
app.use('/*', authMiddleware);

export const CARD_COLORS = ['verde', 'azul', 'laranja', 'grafite'] as const;

const cardSchema = z.object({
  name: z.string().trim().min(1, 'Dê um apelido ao cartão').max(60),
  // Só os 4 últimos dígitos: o número completo nunca é pedido nem guardado.
  last4: z.string().regex(/^\d{4}$/, 'Informe os 4 últimos dígitos'),
  limit: z.number().positive('O limite deve ser maior que zero'),
  closingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  color: z.enum(CARD_COLORS).default('verde'),
});

const updateSchema = cardSchema.partial().extend({
  // false desarquiva.
  archived: z.boolean().optional(),
});

const paymentSchema = z.object({
  invoiceMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM'),
  amount: z.number().positive('O valor deve ser maior que zero'),
  paidAt: z.iso.datetime(),
});

const monthKey = (date: Date) => date.toISOString().slice(0, 7);
const monthStart = (key: string) => new Date(`${key}-01T00:00:00Z`);

type CardRow = Awaited<ReturnType<typeof prisma.card.findMany<{ include: { payments: true } }>>>[number];

const formatCard = (card: CardRow) => ({
  id: card.id,
  name: card.name,
  last4: card.last4,
  limit: Number(card.limit),
  closingDay: card.closingDay,
  dueDay: card.dueDay,
  color: card.color,
  archived: !!card.archivedAt,
  // Faturas que venceram antes do cadastro contam como pagas no cliente.
  createdAt: (card.createdAt ?? new Date()).toISOString(),
  payments: card.payments
    .sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime())
    .map((p) => ({
      id: p.id,
      invoiceMonth: monthKey(p.invoiceMonth),
      amount: Number(p.amount),
      paidAt: p.paidAt.toISOString(),
    })),
});

const findOwn = (userId: string, id: string) =>
  prisma.card.findFirst({ where: { id, userId }, include: { payments: true } });

// Lista todos, inclusive arquivados (o histórico continua mostrando o nome).
app.get('/', async (c) => {
  const cards = await prisma.card.findMany({
    where: { userId: c.var.userId },
    include: { payments: true },
    orderBy: { createdAt: 'asc' },
  });
  return c.json(cards.map(formatCard));
});

app.post('/', zValidator('json', cardSchema), async (c) => {
  const body = c.req.valid('json');
  const card = await prisma.card.create({
    data: { ...body, userId: c.var.userId },
    include: { payments: true },
  });
  return c.json(formatCard(card), 201);
});

app.put('/:id', zValidator('json', updateSchema), async (c) => {
  const userId = c.var.userId;
  const existing = await findOwn(userId, c.req.param('id'));
  if (!existing) return c.json({ error: 'Cartão não encontrado' }, 404);
  const { archived, ...fields } = c.req.valid('json');
  const card = await prisma.card.update({
    where: { id: existing.id },
    data: {
      ...fields,
      ...(archived !== undefined && { archivedAt: archived ? new Date() : null }),
    },
    include: { payments: true },
  });
  return c.json(formatCard(card));
});

// Cartão sem uso é apagado; com histórico é arquivado (some das escolhas,
// mas as compras continuam mostrando o cartão).
app.delete('/:id', async (c) => {
  const userId = c.var.userId;
  const existing = await findOwn(userId, c.req.param('id'));
  if (!existing) return c.json({ error: 'Cartão não encontrado' }, 404);
  const [transactions, rules] = await Promise.all([
    prisma.transaction.count({ where: { cardId: existing.id } }),
    prisma.recurringRule.count({ where: { cardId: existing.id } }),
  ]);
  if (transactions === 0 && rules === 0 && existing.payments.length === 0) {
    await prisma.card.delete({ where: { id: existing.id } });
    return c.json({ deleted: true });
  }
  await prisma.card.update({ where: { id: existing.id }, data: { archivedAt: new Date() } });
  return c.json({ archived: true });
});

// Registrar pagamento de fatura. Não cria transação: não é um gasto novo.
app.post('/:id/payments', zValidator('json', paymentSchema), async (c) => {
  const userId = c.var.userId;
  const existing = await findOwn(userId, c.req.param('id'));
  if (!existing) return c.json({ error: 'Cartão não encontrado' }, 404);
  const body = c.req.valid('json');
  const payment = await prisma.invoicePayment.create({
    data: {
      userId,
      cardId: existing.id,
      invoiceMonth: monthStart(body.invoiceMonth),
      amount: body.amount,
      paidAt: new Date(body.paidAt),
    },
  });
  return c.json(
    { id: payment.id, invoiceMonth: body.invoiceMonth, amount: Number(payment.amount), paidAt: payment.paidAt.toISOString() },
    201,
  );
});

// Desfazer um pagamento registrado por engano.
app.delete('/:id/payments/:paymentId', async (c) => {
  const userId = c.var.userId;
  const payment = await prisma.invoicePayment.findFirst({
    where: { id: c.req.param('paymentId'), cardId: c.req.param('id'), userId },
  });
  if (!payment) return c.json({ error: 'Pagamento não encontrado' }, 404);
  await prisma.invoicePayment.delete({ where: { id: payment.id } });
  return c.json({ deleted: true });
});

export default app;
