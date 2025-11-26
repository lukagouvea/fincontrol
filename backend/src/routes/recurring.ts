import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const app = new Hono<{ Variables: { userId: string } }>();

app.use('/*', authMiddleware);

// --- SCHEMAS DE VALIDAÇÃO ---

const recurringSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.number().positive("O valor deve ser positivo"),
  type: z.enum(['income', 'expense']),
  day: z.number().min(1).max(31), // Front manda 'day'
  categoryId: z.uuid().optional().or(z.literal('')), // Pode vir vazio
  startDate: z.iso.datetime(), // Front manda ISO
  endDate: z.iso.datetime().optional().or(z.literal('')).nullable(), // Pode vir vazio
});

const variationSchema = z.object({
  year: z.number(),
  month: z.number(), // 0-11
  amount: z.number(),
  type: z.enum(['income', 'expense']),
});

// --- ROTAS ---

// 1. LISTAR REGRAS (GET /recurring?type=expense)
app.get('/', async (c) => {
  const userId = c.var.userId;
  const type = c.req.query('type'); // 'income' ou 'expense'

  try {
    const rules = await prisma.recurringRule.findMany({
      where: {
        userId: userId,
        active: true, // Só traz as ativas
        ...(type && { type: type as 'income' | 'expense' })
      },
      include: {
        // Se o DB Pull chamou de 'category', usamos esse nome. Se for 'Category', ajuste.
        category: {
          select: { id: true, name: true, color: true }
        }
      },
      orderBy: {
        dayOfMonth: 'asc'
      }
    });

    // ADAPTER: Converte do formato do Banco para o formato do Front
    const formattedRules = rules.map(rule => ({
      id: rule.id,
      description: rule.description,
      amount: Number(rule.amount),
      type: rule.type,
      day: rule.dayOfMonth, // Banco (day_of_month) -> Front (day)
      startDate: rule.startDate.toISOString(),
      endDate: rule.endDate?.toISOString(),
      categoryId: rule.categoryId,
      category: rule.category, // Objeto categoria completo para exibir cor/nome
    }));

    return c.json(formattedRules);

  } catch (error) {
    console.error(error);
    return c.json({ error: 'Erro ao buscar regras recorrentes' }, 500);
  }
});

// 2. LISTAR VARIAÇÕES (ADAPTER)
// O front pede "MonthlyVariations". Nós buscamos "Transações com recurring_rule_id" e convertemos.
app.get('/variations', async (c) => {
  const userId = c.var.userId;

  try {
    const variationTransactions = await prisma.transaction.findMany({
      where: {
        userId: userId,
        // Filtra transações que têm recurring_rule_id (ou seja, vieram de regras fixas)
        recurringRuleId: { not: null } 
      }
    });

    const formattedVariations = variationTransactions.map(t => {
      const date = new Date(t.date);
      return {
        id: t.id, // ID da transação
        fixedItemId: t.recurringRuleId, // ID da regra pai
        type: t.type,
        amount: Number(t.amount),
        year: date.getFullYear(),
        month: date.getMonth(), // JS Month (0-11)
      };
    });

    return c.json(formattedVariations);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Erro ao buscar variações' }, 500);
  }
});

// 3. CRIAR/ATUALIZAR VARIAÇÃO (POST /recurring/:id/variation)
app.post('/:id/variation', zValidator('json', variationSchema), async (c) => {
  const userId = c.var.userId;
  const ruleId = c.req.param('id');
  const body = c.req.valid('json');

  try {
    // 1. Buscar a regra original para pegar descrição e categoria
    const rule = await prisma.recurringRule.findFirst({
      where: {
        id: ruleId,
        userId: userId
      }
    });

    if (!rule) return c.json({ error: 'Regra não encontrada' }, 404);

    // 2. Calcular a data exata da transação (Ano/Mês/Dia da Regra)
    // Cuidado com fusos: Criamos a data como string YYYY-MM-DD para o banco
    const targetDate = new Date(body.year, body.month, rule.dayOfMonth);
    
    // IMPORTANTE: Prisma com tipo DateTime pode exigir objeto Date
    // Mas se o campo no banco for DATE puro, ele ignora a hora. 
    // Vamos passar o objeto Date configurado.

    // 3. Verificar se já existe transação para esta regra neste mês
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        recurringRuleId: ruleId,
        // A comparação de data exata no Prisma pode ser chata. 
        // Vamos buscar pelo intervalo do dia para garantir.
        date: {
            gte: new Date(body.year, body.month, rule.dayOfMonth, 0, 0, 0),
            lt: new Date(body.year, body.month, rule.dayOfMonth + 1, 0, 0, 0)
        }
      }
    });

    if (existingTransaction) {
      // ATUALIZAR: Se já existe, atualiza o valor
      await prisma.transaction.update({
        where: { id: existingTransaction.id },
        data: { amount: body.amount }
      });
      return c.json({ message: 'Variação atualizada' });
    } else {
      // CRIAR: Cria uma nova transação vinculada à regra
      await prisma.transaction.create({
        data: {
          userId: userId,
          description: rule.description,
          amount: body.amount,
          type: body.type,
          date: targetDate,
          categoryId: rule.categoryId,
          recurringRuleId: rule.id,
        }
      });
      return c.json({ message: 'Variação criada' });
    }
  } catch (error) {
    console.error("Erro ao criar variação:", error);
    return c.json({ error: 'Erro ao processar variação' }, 500);
  }
});

// 4. CRIAR REGRA (POST /recurring)
app.post('/', zValidator('json', recurringSchema), async (c) => {
  const userId = c.var.userId;
  const body = c.req.valid('json');

  try {
    const rule = await prisma.recurringRule.create({
      data: {
        userId: userId,
        description: body.description,
        amount: body.amount,
        type: body.type,
        dayOfMonth: body.day, // Front (day) -> Banco (day_of_month)
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        // Se categoryId vier vazio ou string vazia, manda null pro banco
        categoryId: body.categoryId || null,
      }
    });

    return c.json(rule, 201);

  } catch (error) {
    console.error(error);
    return c.json({ error: 'Erro ao criar regra recorrente' }, 500);
  }
});

// 5. ATUALIZAR REGRA (PUT /recurring/:id)
app.put('/:id', zValidator('json', recurringSchema.partial()), async (c) => {
  const userId = c.var.userId;
  const id = c.req.param('id');
  const body = c.req.valid('json');

  // Verifica propriedade
  const existing = await prisma.recurringRule.findFirst({
    where: { id, userId: userId }
  });

  if (!existing) return c.json({ error: 'Regra não encontrada' }, 404);

  try {
    const updated = await prisma.recurringRule.update({
      where: { id },
      data: {
        description: body.description,
        amount: body.amount,
        dayOfMonth: body.day,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : (body.endDate === null || body.endDate === '' ? null : undefined), // Aceita undefined para não mudar, ou null para limpar
        categoryId: body.categoryId === '' ? null : body.categoryId,
      }
    });

    return c.json(updated);

  } catch (error) {
    return c.json({ error: 'Erro ao atualizar regra' }, 500);
  }
});

// 6. DELETAR / ARQUIVAR (DELETE /recurring/:id)
// Implementamos Soft Delete: define active=false e endDate=hoje
app.delete('/:id', async (c) => {
  const userId = c.var.userId;
  const id = c.req.param('id');

  const existing = await prisma.recurringRule.findFirst({
    where: { id, userId: userId }
  });

  if (!existing) return c.json({ error: 'Regra não encontrada' }, 404);

  try {
    await prisma.recurringRule.update({
      where: { id },
      data: {
        endDate: new Date() // Encerra a vigência hoje
      }
    });

    return c.json({ message: 'Regra arquivada com sucesso' });

  } catch (error) {
    return c.json({ error: 'Erro ao excluir regra' }, 500);
  }
});

export default app;