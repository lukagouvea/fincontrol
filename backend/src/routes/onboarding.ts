import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const app = new Hono<{ Variables: { userId: string } }>();
app.use('/*', authMiddleware);

/** Categorias criadas para quem começa sem nenhuma (ícones = chaves do cliente). */
export const DEFAULT_CATEGORIES = [
  { name: 'Moradia', type: 'expense', icon: 'house' },
  { name: 'Alimentação', type: 'expense', icon: 'utensils' },
  { name: 'Transporte', type: 'expense', icon: 'car' },
  { name: 'Lazer', type: 'expense', icon: 'play' },
  { name: 'Saúde', type: 'expense', icon: 'heart' },
  { name: 'Assinaturas', type: 'expense', icon: 'repeat' },
  { name: 'Outros', type: 'expense', icon: 'tag' },
  { name: 'Salário', type: 'income', icon: 'briefcase' },
  { name: 'Extras', type: 'income', icon: 'badge-dollar-sign' },
] as const;

const completeSchema = z.object({
  // Orçamento mensal inicial: vira o limite "Geral" do mês atual, repetido.
  budget: z.number().positive().nullable().optional(),
  // Mês local de quem está configurando ("AAAA-MM"). O relógio do servidor é UTC:
  // às 22h30 de 30/nov no Brasil ele já está em dezembro.
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
});

// Conclui a configuração inicial. Idempotente: categorias só são criadas se a
// conta não tiver nenhuma.
app.post('/complete', zValidator('json', completeSchema), async (c) => {
  const userId = c.var.userId;
  const { budget, month: monthKey } = c.req.valid('json');
  const now = new Date();
  // Sem o mês (cliente antigo durante o deploy), usa o do servidor.
  const month = monthKey ? new Date(`${monthKey}-01T00:00:00Z`) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const result = await prisma.$transaction(async (tx) => {
    let categoriesCreated = 0;
    if ((await tx.category.count({ where: { userId } })) === 0) {
      const created = await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((category) => ({ ...category, userId, active: true })),
      });
      categoriesCreated = created.count;
    }
    if (budget) {
      const existing = await tx.budgetLimit.findFirst({ where: { userId, categoryId: null, month } });
      if (existing) await tx.budgetLimit.update({ where: { id: existing.id }, data: { amount: budget, repeat: true } });
      else await tx.budgetLimit.create({ data: { userId, categoryId: null, month, amount: budget, repeat: true } });
    }
    const user = await tx.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: now },
      select: { onboardingCompletedAt: true },
    });
    return { categoriesCreated, onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() };
  });
  return c.json(result);
});

export default app;
