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
        // null = limite "Geral" (parte não dividida por categoria)
        categoryId: z.uuid().nullable(),
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
  const keys = limits.map((l) => l.categoryId ?? 'geral');
  if (new Set(keys).size !== keys.length) return c.json({ error: 'Categoria repetida' }, 400);
  const ids = limits.map((l) => l.categoryId).filter((id): id is string => !!id);
  const owned = ids.length ? await prisma.category.count({ where: { id: { in: ids }, userId, type: 'expense' } }) : 0;
  if (owned !== ids.length) return c.json({ error: 'Categoria não encontrada' }, 404);

  const month = monthDate(key);
  const general = limits.find((l) => l.categoryId === null);
  await prisma.$transaction(async (tx) => {
    if (repeat) {
      await tx.budgetLimit.deleteMany({
        where: {
          userId,
          month: { gt: month },
          OR: [{ categoryId: { in: ids } }, ...(general ? [{ categoryId: null }] : [])],
        },
      });
    }
    for (const limit of limits) {
      if (limit.categoryId) {
        await tx.budgetLimit.upsert({
          where: { categoryId_month: { categoryId: limit.categoryId, month } },
          create: { userId, categoryId: limit.categoryId, month, amount: limit.amount, repeat },
          update: { amount: limit.amount, repeat },
        });
      } else {
        // Sem categoria não cabe no @@unique do Prisma (NULL); índice parcial no banco.
        const existing = await tx.budgetLimit.findFirst({ where: { userId, categoryId: null, month } });
        if (existing) await tx.budgetLimit.update({ where: { id: existing.id }, data: { amount: limit.amount, repeat } });
        else await tx.budgetLimit.create({ data: { userId, categoryId: null, month, amount: limit.amount, repeat } });
      }
    }
  });
  return c.json({ saved: limits.length, month: key, repeat });
});

export default app;
