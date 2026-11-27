import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { AUTH_COOKIE } from '../lib/authCookie.js';
import { verify } from 'hono/jwt';
import { getJwtSecret } from '../lib/jwt.js';

// Define o tipo da variável que vamos injetar no contexto
type Env = {
  Variables: {
    userId: string;
  };
};

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const token = getCookie(c, AUTH_COOKIE);

  if (!token) {
    return c.json({ error: 'Não autorizado: Token não encontrado' }, 401);
  }

  try {
    const secret = getJwtSecret();
    const payload = await verify(token, secret, 'HS256');

    // Injeta o ID do usuário no contexto da requisição
    // Assim, as próximas rotas podem usar c.var.userId
    c.set('userId', payload.id as string);

    await next();
  } catch (error) {
    return c.json({ error: 'Não autorizado: Token inválido ou expirado' }, 401);
  }
});