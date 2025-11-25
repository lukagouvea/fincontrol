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
    const rules = await prisma.recurring_rules.findMany({
      where: {
        user_id: userId,
        active: true, // Só traz as ativas
        ...(type && { type: type as 'income' | 'expense' })
      },
      include: {
        // Se o DB Pull chamou de 'categories', usamos esse nome. Se for 'Category', ajuste.
        categories: {
          select: { id: true, name: true, color: true }
        }
      },
      orderBy: {
        day_of_month: 'asc'
      }
    });

    // ADAPTER: Converte do formato do Banco para o formato do Front
    const formattedRules = rules.map(rule => ({
      id: rule.id,
      description: rule.description,
      amount: Number(rule.amount),
      type: rule.type,
      day: rule.day_of_month, // Banco (day_of_month) -> Front (day)
      startDate: rule.start_date.toISOString(),
      endDate: rule.end_date?.toISOString(),
      categoryId: rule.category_id,
      category: rule.categories, // Objeto categoria completo para exibir cor/nome
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
    const variationTransactions = await prisma.transactions.findMany({
      where: {
        user_id: userId,
        // Filtra transações que têm recurring_rule_id (ou seja, vieram de regras fixas)
        recurring_rule_id: { not: null } 
      }
    });

    const formattedVariations = variationTransactions.map(t => {
      const date = new Date(t.date);
      return {
        id: t.id, // ID da transação
        fixedItemId: t.recurring_rule_id, // ID da regra pai
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
    const rule = await prisma.recurring_rules.findFirst({
      where: {
        id: ruleId,
        user_id: userId
      }
    });

    if (!rule) return c.json({ error: 'Regra não encontrada' }, 404);

    // 2. Calcular a data exata da transação (Ano/Mês/Dia da Regra)
    // Cuidado com fusos: Criamos a data como string YYYY-MM-DD para o banco
    const targetDate = new Date(body.year, body.month, rule.day_of_month);
    
    // IMPORTANTE: Prisma com tipo DateTime pode exigir objeto Date
    // Mas se o campo no banco for DATE puro, ele ignora a hora. 
    // Vamos passar o objeto Date configurado.

    // 3. Verificar se já existe transação para esta regra neste mês
    const existingTransaction = await prisma.transactions.findFirst({
      where: {
        recurring_rule_id: ruleId,
        // A comparação de data exata no Prisma pode ser chata. 
        // Vamos buscar pelo intervalo do dia para garantir.
        date: {
            gte: new Date(body.year, body.month, rule.day_of_month, 0, 0, 0),
            lt: new Date(body.year, body.month, rule.day_of_month + 1, 0, 0, 0)
        }
      }
    });

    if (existingTransaction) {
      // ATUALIZAR: Se já existe, atualiza o valor
      await prisma.transactions.update({
        where: { id: existingTransaction.id },
        data: { amount: body.amount }
      });
      return c.json({ message: 'Variação atualizada' });
    } else {
      // CRIAR: Cria uma nova transação vinculada à regra
      await prisma.transactions.create({
        data: {
          user_id: userId,
          description: rule.description,
          amount: body.amount,
          type: body.type,
          date: targetDate,
          category_id: rule.category_id,
          recurring_rule_id: rule.id,
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
    const rule = await prisma.recurring_rules.create({
      data: {
        user_id: userId,
        description: body.description,
        amount: body.amount,
        type: body.type,
        day_of_month: body.day, // Front (day) -> Banco (day_of_month)
        start_date: new Date(body.startDate),
        end_date: body.endDate ? new Date(body.endDate) : null,
        // Se categoryId vier vazio ou string vazia, manda null pro banco
        category_id: body.categoryId || null,
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
  const existing = await prisma.recurring_rules.findFirst({
    where: { id, user_id: userId }
  });

  if (!existing) return c.json({ error: 'Regra não encontrada' }, 404);

  try {
    const updated = await prisma.recurring_rules.update({
      where: { id },
      data: {
        description: body.description,
        amount: body.amount,
        day_of_month: body.day,
        start_date: body.startDate ? new Date(body.startDate) : undefined,
        end_date: body.endDate ? new Date(body.endDate) : (body.endDate === null || body.endDate === '' ? null : undefined), // Aceita undefined para não mudar, ou null para limpar
        category_id: body.categoryId === '' ? null : body.categoryId,
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

  const existing = await prisma.recurring_rules.findFirst({
    where: { id, user_id: userId }
  });

  if (!existing) return c.json({ error: 'Regra não encontrada' }, 404);

  try {
    await prisma.recurring_rules.update({
      where: { id },
      data: {
        end_date: new Date() // Encerra a vigência hoje
      }
    });

    return c.json({ message: 'Regra arquivada com sucesso' });

  } catch (error) {
    return c.json({ error: 'Erro ao excluir regra' }, 500);
  }
});

export default app;