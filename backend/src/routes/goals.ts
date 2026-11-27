import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const app = new Hono<{ Variables: { userId: string } }>();
app.use('/*', authMiddleware);

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const monthDate = (key: string) => new Date(`${key}-01T00:00:00Z`);

const goalSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome à meta').max(80),
  target: z.number().positive('O valor da meta deve ser maior que zero'),
  deadline: z.string().regex(MONTH, 'Use YYYY-MM').nullable().optional(),
});
const createSchema = goalSchema.extend({
  // "Já guardado" ao criar vira a primeira contribuição.
  initial: z.number().min(0).optional(),
});
const contributionSchema = z.object({
  // Positivo guarda; negativo retira.
  amount: z.number().refine((v) => v !== 0, 'Informe um valor'),
  date: z.iso.datetime(),
  sourceMonth: z.string().regex(MONTH).nullable().optional(),
});

const include = { contributions: { orderBy: { date: 'desc' as const } } };
type GoalRow = Awaited<ReturnType<typeof prisma.goal.findMany<{ include: typeof include }>>>[number];

const cents = (value: unknown) => Math.round(Number(value) * 100);
const formatGoal = (goal: GoalRow) => ({
  id: goal.id,
  name: goal.name,
  target: Number(goal.target),
  deadline: goal.deadline ? goal.deadline.toISOString().slice(0, 7) : null,
  saved: goal.contributions.reduce((sum, c) => sum + cents(c.amount), 0) / 100,
  createdAt: (goal.createdAt ?? new Date()).toISOString(),
  contributions: goal.contributions.map((c) => ({
    id: c.id,
    amount: Number(c.amount),
    date: c.date.toISOString(),
    sourceMonth: c.sourceMonth ? c.sourceMonth.toISOString().slice(0, 7) : null,
  })),
});

const findOwn = (userId: string, id: string) => prisma.goal.findFirst({ where: { id, userId }, include });

app.get('/', async (c) => {
  const goals = await prisma.goal.findMany({ where: { userId: c.var.userId }, include, orderBy: { createdAt: 'asc' } });
  return c.json(goals.map(formatGoal));
});

app.post('/', zValidator('json', createSchema), async (c) => {
  const userId = c.var.userId;
  const { initial, deadline, ...body } = c.req.valid('json');
  const goal = await prisma.goal.create({
    data: {
      ...body,
      userId,
      deadline: deadline ? monthDate(deadline) : null,
      ...(initial && initial > 0 && { contributions: { create: { userId, amount: initial, date: new Date() } } }),
    },
    include,
  });
  return c.json(formatGoal(goal), 201);
});

app.put('/:id', zValidator('json', goalSchema.partial()), async (c) => {
  const existing = await findOwn(c.var.userId, c.req.param('id'));
  if (!existing) return c.json({ error: 'Meta não encontrada' }, 404);
  const { deadline, ...body } = c.req.valid('json');
  const goal = await prisma.goal.update({
    where: { id: existing.id },
    data: { ...body, ...(deadline !== undefined && { deadline: deadline ? monthDate(deadline) : null }) },
    include,
  });
  return c.json(formatGoal(goal));
});

app.delete('/:id', async (c) => {
  const existing = await findOwn(c.var.userId, c.req.param('id'));
  if (!existing) return c.json({ error: 'Meta não encontrada' }, 404);
  await prisma.goal.delete({ where: { id: existing.id } });
  return c.json({ deleted: true });
});

// Guardar ou retirar. Retirar não pode deixar o guardado negativo.
app.post('/:id/contributions', zValidator('json', contributionSchema), async (c) => {
  const userId = c.var.userId;
  const existing = await findOwn(userId, c.req.param('id'));
  if (!existing) return c.json({ error: 'Meta não encontrada' }, 404);
  const body = c.req.valid('json');
  const saved = formatGoal(existing).saved;
  if (cents(saved) + cents(body.amount) < 0) return c.json({ error: 'Não dá para retirar mais do que está guardado' }, 400);
  const contribution = await prisma.goalContribution.create({
    data: {
      userId,
      goalId: existing.id,
      amount: body.amount,
      date: new Date(body.date),
      sourceMonth: body.sourceMonth ? monthDate(body.sourceMonth) : null,
    },
  });
  return c.json({ id: contribution.id, amount: Number(contribution.amount), date: contribution.date.toISOString() }, 201);
});

app.delete('/:id/contributions/:contributionId', async (c) => {
  const contribution = await prisma.goalContribution.findFirst({
    where: { id: c.req.param('contributionId'), goalId: c.req.param('id'), userId: c.var.userId },
  });
  if (!contribution) return c.json({ error: 'Aporte não encontrado' }, 404);
  await prisma.goalContribution.delete({ where: { id: contribution.id } });
  return c.json({ deleted: true });
});

export default app;
