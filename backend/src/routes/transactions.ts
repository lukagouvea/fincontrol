import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const app = new Hono<{ Variables: { userId: string } }>();

// Protege todas as rotas
app.use('/*', authMiddleware);

// --- SCHEMAS DE VALIDAÇÃO (Zod) ---

// 1. Para Transação Simples (Renda ou Despesa à vista)
const transactionSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.number().positive("O valor deve ser positivo"),
  date: z.iso.datetime(), // Espera ISO String (UTC)
  type: z.enum(['income', 'expense']),
  categoryId: z.uuid("ID de categoria inválido"),
  isPaid: z.boolean().optional().default(false), // Novo campo que adicionamos no schema
});

// 2. Para Compra Parcelada
const installmentSchema = z.object({
  description: z.string().min(1),
  totalAmount: z.number().positive(),
  totalInstallments: z.number().min(2, "Mínimo de 2 parcelas").max(60),
  date: z.iso.datetime(), // Data da compra (1ª parcela)
  categoryId: z.uuid(),
});

// --- ROTAS ---

// 1. LISTAR (GET /transactions?month=11&year=2025)
app.get('/', async (c) => {
  const userId = c.var.userId;
  const month = Number(c.req.query('month')); // 1 a 12
  const year = Number(c.req.query('year'));

  if (!month || !year) {
    return c.json({ error: 'Parâmetros month e year são obrigatórios' }, 400);
  }

  // Define o intervalo do mês
  // Nota: No Date() do JS, mês vai de 0-11. Ajustamos aqui.
  const startDate = new Date(year, month - 1, 1); 
  const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Último momento do mês

  try {
    const transactions = await prisma.transactions.findMany({
      where: {
        user_id: userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        categories: {
          select: { id: true, name: true, color: true, type: true }
        },
        installment_groups: {
          select: { total_installments: true } // Para saber se é "1/10"
        },
      },
      orderBy: {
        date: 'desc', // Mais recentes primeiro
      },
    });

    // Opcional: Formatamos o retorno para facilitar pro front
    const formatted = transactions.map(t => ({
      ...t,
      amount: Number(t.amount),
      // Mapeia o campo snake_case do banco para camelCase do JS
      // Se o seu prisma gerou como 'recurring_rule_id', use assim:
      recurringRuleId: t.recurring_rule_id, 
      categoryId: t.category_id,
      installmentInfo: t.installment_group_id ? {
        current: t.installment_number,
        total: t.installment_groups?.total_installments,
      } : null
    }));

    return c.json(formatted);

  } catch (error) {
    console.error(error);
    return c.json({ error: 'Erro ao buscar transações' }, 500);
  }
});

// 2. CRIAR SIMPLES (POST /transactions)
app.post('/', zValidator('json', transactionSchema), async (c) => {
  const userId = c.var.userId;
  const body = c.req.valid('json');

  try {
    const transaction = await prisma.transactions.create({
      data: {
        user_id: userId,
        description: body.description,
        amount: body.amount,
        date: new Date(body.date),
        type: body.type,
        category_id: body.categoryId,
        // is_paid: body.isPaid, (Se seu banco tiver esse campo)
      }
    });

    return c.json(transaction, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Erro ao criar transação' }, 500);
  }
});

// 3. CRIAR PARCELADO (POST /transactions/installment)
// Essa é a rota "Complexa" que substitui o generateParcelas do front
app.post('/installment', zValidator('json', installmentSchema), async (c) => {
  const userId = c.var.userId;
  const body = c.req.valid('json');

  try {
    // Usamos transaction interativa do Prisma para garantir integridade
    // Se falhar na criação das parcelas, ele desfaz a criação do grupo.
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Cria o Cabeçalho (O Grupo)
      const group = await tx.installment_groups.create({
        data: {
          user_id: userId,
          description: body.description,
          total_amount: body.totalAmount,
          total_installments: body.totalInstallments,
        }
      });

      // B. Prepara as N parcelas
      // O valor da parcela pode dar dízima (ex: 100 / 3 = 33.333...)
      // Vamos arredondar e jogar a diferença na primeira parcela
      const rawInstallmentValue = Math.floor((body.totalAmount / body.totalInstallments) * 100) / 100;
      const diff = Math.round((body.totalAmount - (rawInstallmentValue * body.totalInstallments)) * 100) / 100;

      const transactionsPayload = [];
      const baseDate = new Date(body.date);

      for (let i = 0; i < body.totalInstallments; i++) {
        const isFirst = i === 0;
        const amount = isFirst ? (rawInstallmentValue + diff) : rawInstallmentValue;
        
        // Calcula a data: Mês inicial + i
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(baseDate.getMonth() + i);

        transactionsPayload.push({
          user_id: userId,
          category_id: body.categoryId,
          description: body.description, // O front pode adicionar "(1/10)" na exibição
          amount: amount,
          date: installmentDate,
          type: 'expense', // Parcelamento geralmente é despesa
          installment_group_id: group.id,
          installment_number: i + 1,
        });
      }

      // C. Insere todas de uma vez
      await tx.transactions.createMany({
        data: transactionsPayload
      });

      return group;
    });

    return c.json({ message: 'Compra parcelada criada com sucesso', groupId: result.id }, 201);

  } catch (error) {
    console.error('Erro no parcelamento:', error);
    return c.json({ error: 'Erro ao processar parcelamento' }, 500);
  }
});

// 4. EDITAR (PUT /transactions/:id)
app.put('/:id', zValidator('json', transactionSchema.partial()), async (c) => {
  const userId = c.var.userId;
  const id = c.req.param('id');
  const body = c.req.valid('json');

  // Verifica se pertence ao usuário
  const existing = await prisma.transactions.findFirst({ where: { id, user_id: userId } });
  if (!existing) return c.json({ error: 'Transação não encontrada' }, 404);

  // Se for parcela, bloqueia edição de valor/data (por enquanto, para simplificar)
  // Ou permite editar apenas aquela parcela específica
  
  const updated = await prisma.transactions.update({
    where: { id },
    data: {
      description: body.description,
      amount: body.amount,
      date: body.date ? new Date(body.date) : undefined,
      category_id: body.categoryId,
      type: body.type,
    }
  });

  return c.json(updated);
});

// 5. DELETAR (DELETE /transactions/:id)
// Lógica inteligente: Se for parcela, deleta TUDO. Se for simples, deleta UMA.
app.delete('/:id', async (c) => {
  const userId = c.var.userId;
  const id = c.req.param('id');

  const transaction = await prisma.transactions.findFirst({
    where: { id, user_id: userId }
  });

  if (!transaction) return c.json({ error: 'Transação não encontrada' }, 404);

  try {
    if (transaction.installment_group_id) {
      // É uma parcela! Deletamos o GRUPO MÃE.
      // O "ON DELETE CASCADE" do banco vai apagar todas as parcelas automaticamente.
      await prisma.installment_groups.delete({
        where: { id: transaction.installment_group_id }
      });
      return c.json({ message: 'Compra parcelada inteira removida' });
    } else {
      // Transação simples
      await prisma.transactions.delete({
        where: { id }
      });
      return c.json({ message: 'Transação removida' });
    }
  } catch (error) {
    return c.json({ error: 'Erro ao deletar' }, 500);
  }
});

export default app;