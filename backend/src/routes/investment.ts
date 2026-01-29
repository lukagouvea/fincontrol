import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const app = new Hono<{ Variables: { userId: string } }>();

app.use('/*', authMiddleware);

const defaultSchema = z.object({
  defaultMonthlyAmount: z.number().nonnegative(),
});

const overrideSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  amount: z.number().nonnegative(),
});

// GET /investment
app.get('/', async (c) => {
  const userId = c.var.userId;

  try {
    const setting = await prisma.investmentSetting.findUnique({
      where: { userId },
    });

    return c.json({
      defaultMonthlyAmount: setting ? Number(setting.defaultMonthlyAmount) : 0,
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Erro ao buscar investimento' }, 500);
  }
});

// PUT /investment
app.put('/', zValidator('json', defaultSchema), async (c) => {
  const userId = c.var.userId;
  const body = c.req.valid('json');

  try {
    const setting = await prisma.investmentSetting.upsert({
      where: { userId },
      update: { defaultMonthlyAmount: body.defaultMonthlyAmount },
      create: {
        userId,
        defaultMonthlyAmount: body.defaultMonthlyAmount,
      },
    });

    return c.json({ defaultMonthlyAmount: Number(setting.defaultMonthlyAmount) });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Erro ao atualizar investimento' }, 500);
  }
});

// GET /investment/effective?month=1-12&year=YYYY
app.get('/effective', async (c) => {
  const userId = c.var.userId;
  const month = Number(c.req.query('month'));
  const year = Number(c.req.query('year'));

  if (!month || !year) {
    return c.json({ error: 'Parâmetros month e year são obrigatórios' }, 400);
  }

  try {
    const setting = await prisma.investmentSetting.findUnique({
      where: { userId },
    });

    const override = await prisma.investmentOverride.findUnique({
      where: {
        userId_year_month: {
          userId,
          year,
          month,
        },
      },
    });

    const defaultMonthlyAmount = setting ? Number(setting.defaultMonthlyAmount) : 0;
    const overrideMonthlyAmount = override ? Number(override.amount) : null;
    const effectiveMonthlyAmount = overrideMonthlyAmount ?? defaultMonthlyAmount;

    return c.json({
      defaultMonthlyAmount,
      overrideMonthlyAmount,
      effectiveMonthlyAmount,
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Erro ao buscar investimento efetivo' }, 500);
  }
});

// PUT /investment/override
app.put('/override', zValidator('json', overrideSchema), async (c) => {
  const userId = c.var.userId;
  const body = c.req.valid('json');

  try {
    const override = await prisma.investmentOverride.upsert({
      where: {
        userId_year_month: {
          userId,
          year: body.year,
          month: body.month,
        },
      },
      update: { amount: body.amount },
      create: {
        userId,
        year: body.year,
        month: body.month,
        amount: body.amount,
      },
    });

    return c.json({
      year: override.year,
      month: override.month,
      amount: Number(override.amount),
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Erro ao salvar investimento do mês' }, 500);
  }
});

// DELETE /investment/override?month=1-12&year=YYYY
app.delete('/override', async (c) => {
  const userId = c.var.userId;
  const month = Number(c.req.query('month'));
  const year = Number(c.req.query('year'));

  if (!month || !year) {
    return c.json({ error: 'Parâmetros month e year são obrigatórios' }, 400);
  }

  try {
    const existing = await prisma.investmentOverride.findUnique({
      where: {
        userId_year_month: {
          userId,
          year,
          month,
        },
      },
    });

    if (!existing) {
      return c.json({ message: 'Nenhum override encontrado' }, 200);
    }

    await prisma.investmentOverride.delete({
      where: { id: existing.id },
    });

    return c.json({ message: 'Override removido' }, 200);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Erro ao remover override' }, 500);
  }
});

export default app;
