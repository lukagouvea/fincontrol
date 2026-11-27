import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { isOwnCard } from '../lib/cards.js';

const app = new Hono<{ Variables: { userId: string } }>();
app.use('/*', authMiddleware);

const MAX_ITEMS = 2000;

const importSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  cardId: z.uuid().nullable(),
  items: z
    .array(
      z.object({
        date: z.iso.datetime(),
        description: z.string().trim().min(1).max(255),
        amount: z.number().positive(),
        type: z.enum(['income', 'expense']),
        categoryId: z.uuid(),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

// Cria a importação e as transações de uma vez (tudo ou nada).
app.post('/', zValidator('json', importSchema), async (c) => {
  const userId = c.var.userId;
  const body = c.req.valid('json');
  if (!(await isOwnCard(userId, body.cardId))) return c.json({ error: 'Cartão não encontrado' }, 404);

  // Categorias: do usuário e do tipo de cada lançamento.
  const categoryIds = [...new Set(body.items.map((item) => item.categoryId))];
  const categories = await prisma.category.findMany({ where: { id: { in: categoryIds }, userId }, select: { id: true, type: true } });
  const typeOf = new Map(categories.map((category) => [category.id, category.type]));
  if (body.items.some((item) => typeOf.get(item.categoryId) !== item.type)) return c.json({ error: 'Categoria não encontrada' }, 404);

  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.importBatch.create({
      data: { userId, cardId: body.cardId, fileName: body.fileName, count: body.items.length },
    });
    await tx.transaction.createMany({
      data: body.items.map((item) => ({
        userId,
        description: item.description,
        amount: item.amount,
        date: new Date(item.date),
        type: item.type,
        categoryId: item.categoryId,
        cardId: item.type === 'expense' ? body.cardId : null,
        importBatchId: created.id,
      })),
    });
    return created;
  });

  const total = body.items.reduce((sum, item) => sum + Math.round(item.amount * 100) * (item.type === 'expense' ? 1 : -1), 0) / 100;
  return c.json({ id: batch.id, count: batch.count, total }, 201);
});

// Desfazer a importação inteira.
app.delete('/:id', async (c) => {
  const userId = c.var.userId;
  const batch = await prisma.importBatch.findFirst({ where: { id: c.req.param('id'), userId } });
  if (!batch) return c.json({ error: 'Importação não encontrada' }, 404);
  const [removed] = await prisma.$transaction([
    prisma.transaction.deleteMany({ where: { importBatchId: batch.id, userId } }),
    prisma.importBatch.delete({ where: { id: batch.id } }),
  ]);
  return c.json({ deleted: removed.count });
});

export default app;
