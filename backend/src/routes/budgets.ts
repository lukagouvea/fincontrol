import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const app = new Hono<{ Variables: { userId: string } }>();
app.use('/*', authMiddleware);

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const monthDate = (key: string) => new Date(`${key}-01T00:00:00Z`);
const monthKey = (date: Date) => date.toISOString().slice(0, 7);

const saveSchema = z.object({
  // Vale só neste mês (false) ou deste mês em diante (true).
  repeat: z.boolean(),
  limits: z
    .array(
      z.object({
        categoryId: z.uuid(),
        // null = sem limite
        amount: z.number().min(0).nullable(),
      }),
    )
    .max(200),
});

// Todos os registros de limite do usuário; o cliente resolve o mês.
app.get('/', async (c) => {
  const rows = await prisma.budgetLimit.findMany({
    where: { userId: c.var.userId },
    orderBy: [{ month: 'asc' }],
  });
  return c.json(
    rows.map((row) => ({
      categoryId: row.categoryId,
      month: monthKey(row.month),
      amount: row.amount === null ? null : Number(row.amount),
      repeat: row.repeat,
    })),
  );
});

// Salva os limites de um mês. Com repeat, também valem nos meses seguintes:
// os registros posteriores dessas categorias são apagados.
app.put('/:month', zValidator('json', saveSchema), async (c) => {
  const userId = c.var.userId;
  const key = c.req.param('month');
  if (!MONTH.test(key)) return c.json({ error: 'Use YYYY-MM' }, 400);
  const { repeat, limits } = c.req.valid('json');
  const ids = [...new Set(limits.map((l) => l.categoryId))];
  if (ids.length !== limits.length) return c.json({ error: 'Categoria repetida' }, 400);
  const owned = await prisma.category.count({ where: { id: { in: ids }, userId, type: 'expense' } });
  if (owned !== ids.length) return c.json({ error: 'Categoria não encontrada' }, 404);

  const month = monthDate(key);
  await prisma.$transaction([
    ...(repeat ? [prisma.budgetLimit.deleteMany({ where: { userId, categoryId: { in: ids }, month: { gt: month } } })] : []),
    ...limits.map((limit) =>
      prisma.budgetLimit.upsert({
        where: { categoryId_month: { categoryId: limit.categoryId, month } },
        create: { userId, categoryId: limit.categoryId, month, amount: limit.amount, repeat },
        update: { amount: limit.amount, repeat },
      }),
    ),
  ]);
  return c.json({ saved: limits.length, month: key, repeat });
});

export default app;
