import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import { prisma } from '../lib/prisma.js';

const app = new Hono();

// Schema de Validação
const updateTutorialStatusSchema = z.object({
  tutorialCompleted: z.boolean(),
});

// ==========================================
// PATCH /users/tutorial-status
// Atualiza o status de conclusão do tutorial
// ==========================================
app.patch(
  '/tutorial-status',
  zValidator('json', updateTutorialStatusSchema),
  async (c) => {
    // 1. Verifica autenticação via cookie
    const token = getCookie(c, 'auth_token');
    
    if (!token) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    try {
      const secret = process.env.JWT_SECRET || 'segredo_padrao';
      const payload = await verify(token, secret);
      const userId = payload.id as string;

      // 2. Pega o valor do body
      const { tutorialCompleted } = c.req.valid('json');

      // 3. Atualiza no banco
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { tutorialCompleted },
        select: {
          id: true,
          name: true,
          email: true,
          tutorialCompleted: true,
          createdAt: true,
        },
      });

      return c.json({ user: updatedUser });
    } catch (err) {
      console.error('Erro ao atualizar status do tutorial:', err);
      return c.json({ error: 'Erro ao atualizar status do tutorial' }, 500);
    }
  }
);

// ==========================================
// GET /users/tutorial-status
// Retorna apenas o status do tutorial do usuário logado
// ==========================================
app.get('/tutorial-status', async (c) => {
  // 1. Verifica autenticação via cookie
  const token = getCookie(c, 'auth_token');
  
  if (!token) {
    return c.json({ error: 'Não autenticado' }, 401);
  }

  try {
    const secret = process.env.JWT_SECRET || 'segredo_padrao';
    const payload = await verify(token, secret);
    const userId = payload.id as string;

    // 2. Busca apenas o campo tutorialCompleted
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        tutorialCompleted: true,
      },
    });

    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404);
    }

    return c.json({ tutorialCompleted: user.tutorialCompleted });
  } catch (err) {
    console.error('Erro ao buscar status do tutorial:', err);
    return c.json({ error: 'Erro ao buscar status do tutorial' }, 500);
  }
});

export default app;
