import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

// Definindo o tipo das variáveis do contexto (para o TypeScript não reclamar do userId)
type Variables = {
  userId: string;
};

const app = new Hono<{ Variables: Variables }>();

// Aplica o middleware de proteção em TODAS as rotas deste arquivo
app.use('/*', authMiddleware);

// Schema de Validação para Criação/Edição
const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  type: z.enum(['income', 'expense']),
  color: z.string().optional(),
  icon: z.string().regex(/^[a-z0-9-]{1,40}$/, 'Ícone inválido').nullable().optional(),
});

// O padrão da cor fica só na criação (ver cards.ts: `.partial()` manteria o `.default()`).
const createSchema = categorySchema.extend({ color: z.string().optional().default('#888888') });

const updateSchema = categorySchema.partial().extend({
  // true restaura uma categoria arquivada.
  active: z.boolean().optional(),
});

const mergeSchema = z.object({ targetId: z.uuid() });

// 1. Listar Categorias (GET /categories)
app.get('/', async (c) => {
  const userId = c.var.userId; // Pegamos do middleware!
  const type = c.req.query('type'); // Opcional: ?type=income
  // ?all=1 inclui as arquivadas (active=false): o histórico continua com o nome.
  const all = c.req.query('all') === '1';

  const categories = await prisma.category.findMany({
    where: {
      userId: userId,
      ...(!all && { active: true }),
      ...(type && { type: type as 'income' | 'expense' })
    },
    orderBy: { name: 'asc' }
  });

  return c.json(categories);
});

// 2. Criar Categoria (POST /categories)
app.post('/', zValidator('json', createSchema), async (c) => {
  const userId = c.var.userId;
  const body = c.req.valid('json');

  // 1. Primeiro, verificamos se essa categoria já existe no banco (ativa ou inativa)
  const existingCategory = await prisma.category.findFirst({
    where: {
      userId: userId,
      name: body.name,
      type: body.type,
    }
  });

  // 2. Se ela existir...
  if (existingCategory) {
    // 2a. Se já estiver ativa, devolvemos erro de conflito (como antes)
    if (existingCategory.active) {
      return c.json({ error: 'Você já tem uma categoria ativa com este nome e tipo.' }, 409);
    }

    // 2b. Se estiver inativa (excluída), nós a "Ressuscitamos"
    // Atualizamos também a cor e descrição para o que o usuário mandou agora
    const reactivatedCategory = await prisma.category.update({
      where: { id: existingCategory.id },
      data: {
        active: true,
        color: body.color,
        description: body.description,
        ...(body.icon !== undefined && { icon: body.icon }),
      }
    });

    return c.json(reactivatedCategory, 200);
  }

  // 3. Se não existir, criamos do zero (Caminho feliz normal)
  try {
    const newCategory = await prisma.category.create({
      data: {
        userId: userId,
        name: body.name,
        description: body.description,
        type: body.type,
        color: body.color,
        icon: body.icon ?? null,
        active: true
      }
    });
    return c.json(newCategory, 201);

  } catch (error) {
    console.error(error);
    return c.json({ error: 'Erro ao criar categoria' }, 500);
  }
});

// 3. Atualizar Categoria (PUT /categories/:id)
app.put('/:id', zValidator('json', updateSchema), async (c) => {
  const userId = c.var.userId;
  const id = c.req.param('id');
  const body = c.req.valid('json');

  // Garante que a categoria pertence ao usuário antes de editar
  const existing = await prisma.category.findFirst({
    where: { id, userId: userId }
  });

  if (!existing) {
    return c.json({ error: 'Categoria não encontrada' }, 404);
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      color: body.color,
      icon: body.icon,
      active: body.active,
      // Não permitimos mudar o 'type' depois de criada para não quebrar histórico
    }
  });

  return c.json(updated);
});

// 4. Deletar Categoria (DELETE /categories/:id) - Soft Delete
app.delete('/:id', async (c) => {
  const userId = c.var.userId;
  const id = c.req.param('id');

  // Verifica propriedade
  const existing = await prisma.category.findFirst({
    where: { id, userId: userId }
  });

  if (!existing) {
    return c.json({ error: 'Categoria não encontrada' }, 404);
  }

  // Soft Delete: Apenas marca como inativa para não sumir do histórico
  await prisma.category.update({
    where: { id },
    data: { active: false }
  });

  return c.json({ message: 'Categoria removida com sucesso' });
});

// 5. Mesclar (POST /categories/:id/merge): move lançamentos, recorrências e
// versões de recorrência para a categoria de destino e arquiva a de origem.
// O histórico continua somando nos relatórios, dentro do destino.
app.post('/:id/merge', zValidator('json', mergeSchema), async (c) => {
  const userId = c.var.userId;
  const id = c.req.param('id');
  const { targetId } = c.req.valid('json');
  if (id === targetId) return c.json({ error: 'Escolha outra categoria de destino' }, 400);

  const [source, target] = await Promise.all([
    prisma.category.findFirst({ where: { id, userId } }),
    prisma.category.findFirst({ where: { id: targetId, userId } }),
  ]);
  if (!source || !target) return c.json({ error: 'Categoria não encontrada' }, 404);
  if (source.type !== target.type) return c.json({ error: 'As categorias precisam ser do mesmo tipo' }, 400);
  if (target.active === false) return c.json({ error: 'A categoria de destino está arquivada' }, 400);

  const [moved] = await prisma.$transaction([
    prisma.transaction.updateMany({ where: { userId, categoryId: id }, data: { categoryId: targetId } }),
    prisma.recurringRule.updateMany({ where: { userId, categoryId: id }, data: { categoryId: targetId } }),
    prisma.recurringRuleVersion.updateMany({ where: { categoryId: id, rule: { userId } }, data: { categoryId: targetId } }),
    prisma.category.update({ where: { id }, data: { active: false } }),
  ]);

  return c.json({ moved: moved.count, targetId });
});

export default app;