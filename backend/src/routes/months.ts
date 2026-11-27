import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const app = new Hono<{ Variables: { userId: string } }>();
app.use('/*', authMiddleware);

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

// Marca a virada de um mês fechado como vista. Nunca volta para um mês anterior.
app.post('/:month/seen', async (c) => {
  const month = c.req.param('month');
  if (!MONTH.test(month)) return c.json({ error: 'Use YYYY-MM' }, 400);
  const userId = c.var.userId;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { lastClosingSeen: true } });
  if (!user) return c.json({ error: 'Usuário não encontrado' }, 404);
  if (user.lastClosingSeen && user.lastClosingSeen >= month) return c.json({ lastClosingSeen: user.lastClosingSeen });
  const updated = await prisma.user.update({ where: { id: userId }, data: { lastClosingSeen: month }, select: { lastClosingSeen: true } });
  return c.json(updated);
});

export default app;
