import { Hono } from 'hono';
import { prisma } from '../lib/prisma.ts'; // Sua instância do Prisma Client
import { authMiddleware } from '../middleware/auth.ts';

const app = new Hono<{ Variables: { userId: string } }>();

app.use('/*', authMiddleware);

// GET /dashboard/summary?month=11&year=2025
app.get('/summary', async (c) => {
  const userId = c.var.userId;
  const month = Number(c.req.query('month')); // Espera 1 a 12
  const year = Number(c.req.query('year'));

  if (!month || !year) {
    return c.json({ error: 'Mês e ano são obrigatórios' }, 400);
  }

  // Datas para o filtro (Start e End date do mês)
  // Importante: O mês no Date() do JS começa em 0, mas sua query vem 1-12
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // Filtro comum para reutilizar
  const dateFilter = {
    user_id: userId,
    date: {
      gte: startDate,
      lte: endDate,
    },
  };

  try {
    // 1. Agregação de Totais (Receita vs Despesa)
    // O Prisma faz isso com uma query só
    const totalsAgg = await prisma.transactions.groupBy({
      by: ['type'],
      where: dateFilter,
      _sum: {
        amount: true,
      },
    });

    // Processa o resultado (o Prisma retorna um array, ex: [{type: 'income', _sum: {amount: 500}}])
    const income = Number(totalsAgg.find(t => t.type === 'income')?._sum.amount || 0);
    const expense = Number(totalsAgg.find(t => t.type === 'expense')?._sum.amount || 0);

    // 2. Dados para o Gráfico de Categorias (Pie Chart)
    // Agrupamos transações de DESPESA por categoria
    const categoryAgg = await prisma.transactions.groupBy({
      by: ['category_id'],
      where: {
        ...dateFilter,
        type: 'expense',
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
    });

    // O groupBy do Prisma não suporta 'include' (JOIN) direto.
    // Precisamos buscar os nomes das categorias separadamente.
    const categoryIds = categoryAgg
      .map((item) => item.category_id)
      .filter((id): id is string => id !== null);

    const categories = await prisma.categories.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, color: true },
    });

    // Mesclamos a soma com o nome/cor da categoria
    const expensesByCategory = categoryAgg.map((item) => {
      const catInfo = categories.find((c) => c.id === item.category_id);
      return {
        name: catInfo?.name || 'Sem Categoria',
        color: catInfo?.color || '#888888',
        value: Number(item._sum.amount || 0),
      };
    });

    // 3. Transações Recentes (Top 5)
    const recent = await prisma.transactions.findMany({
      where: dateFilter,
      take: 5,
      orderBy: {
        date: 'desc',
      },
      include: {
        categories: {
          select: { name: true, color: true },
        },
      },
    });

    // Mapeia para o formato que o frontend espera
    const recentFormatted = recent.map((t) => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      date: t.date.toISOString(),
      type: t.type,
      category: t.categories?.name || 'Geral',
      categoryColor: t.categories?.color,
    }));

    return c.json({
      summary: {
        income,
        expense,
        balance: income - expense,
      },
      charts: {
        categories: expensesByCategory,
      },
      recent_transactions: recentFormatted,
    });

  } catch (error) {
    console.error('Erro no dashboard:', error);
    return c.json({ error: 'Erro ao carregar dados do dashboard' }, 500);
  }
});

export default app;