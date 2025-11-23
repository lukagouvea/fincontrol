import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma.ts';
import { authMiddleware } from '../middleware/auth.ts';

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
  color: z.string().optional().default('#888888'),
});

// 1. Listar Categorias (GET /categories)
app.get('/', async (c) => {
  const userId = c.var.userId; // Pegamos do middleware!
  const type = c.req.query('type'); // Opcional: ?type=income

  const categories = await prisma.categories.findMany({
    where: {
      user_id: userId,
      active: true, // Só traz as ativas
      ...(type && { type: type as 'income' | 'expense' })
    },
    orderBy: { name: 'asc' }
  });

  return c.json(categories);
});

// 2. Criar Categoria (POST /categories)
app.post('/', zValidator('json', categorySchema), async (c) => {
  const userId = c.var.userId;
  const body = c.req.valid('json');

  // 1. Primeiro, verificamos se essa categoria já existe no banco (ativa ou inativa)
  const existingCategory = await prisma.categories.findFirst({
    where: {
      user_id: userId,
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
    const reactivatedCategory = await prisma.categories.update({
      where: { id: existingCategory.id },
      data: {
        active: true,
        color: body.color,
        description: body.description
      }
    });

    return c.json(reactivatedCategory, 200);
  }

  // 3. Se não existir, criamos do zero (Caminho feliz normal)
  try {
    const newCategory = await prisma.categories.create({
      data: {
        user_id: userId,
        name: body.name,
        description: body.description,
        type: body.type,
        color: body.color,
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
app.put('/:id', zValidator('json', categorySchema.partial()), async (c) => {
  const userId = c.var.userId;
  const id = c.req.param('id');
  const body = c.req.valid('json');

  // Garante que a categoria pertence ao usuário antes de editar
  const existing = await prisma.categories.findFirst({
    where: { id, user_id: userId }
  });

  if (!existing) {
    return c.json({ error: 'Categoria não encontrada' }, 404);
  }

  const updated = await prisma.categories.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      color: body.color,
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
  const existing = await prisma.categories.findFirst({
    where: { id, user_id: userId }
  });

  if (!existing) {
    return c.json({ error: 'Categoria não encontrada' }, 404);
  }

  // Soft Delete: Apenas marca como inativa para não sumir do histórico
  await prisma.categories.update({
    where: { id },
    data: { active: false }
  });

  return c.json({ message: 'Categoria removida com sucesso' });
});

export default app;