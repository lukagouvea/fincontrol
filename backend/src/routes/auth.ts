import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { hash, compare } from 'bcryptjs';
import { sign, verify } from 'hono/jwt';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { prisma } from '../lib/prisma.js'; // Certifique-se que o caminho está certo

const app = new Hono();

// Schema de Validação para Cadastro
const signupSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  email: z.email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

// Schema de Validação para Login
const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

// Helper para remover a senha do objeto de retorno
function excludePassword<User, Key extends keyof User>(
  user: User,
  keys: Key[]
): Omit<User, Key> {
  const result = { ...user }; // Copia o objeto
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

// ==========================================
// ROTA 1: CADASTRO (SIGNUP)
// ==========================================
app.post('/signup', zValidator('json', signupSchema), async (c) => {
  const { name, email, password } = c.req.valid('json');

  // 1. Verifica duplicidade
  const existingUser = await prisma.users.findUnique({ where: { email } });
  if (existingUser) {
    return c.json({ error: 'E-mail já cadastrado' }, 409);
  }

  // 2. Criptografa a senha
  const passwordHash = await hash(password, 10);

  // 3. Cria no banco
  const user = await prisma.users.create({
    data: {
      name,
      email,
      password_hash: passwordHash,
    },
  });

  // 4. Gera o Token JWT
  const secret = process.env.JWT_SECRET || 'segredo_padrao';
  const token = await sign({ id: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, secret); // 7 dias

  // 5. Define o Cookie HttpOnly (Segurança Máxima)
  setCookie(c, 'auth_token', token, {
    httpOnly: true, // JS do front não acessa (protege contra XSS)
    secure: false, //process.env.NODE_ENV === 'production', // Só HTTPS em produção
    sameSite: 'Lax', // Protege contra CSRF básico
    path: '/', // Válido para todo o site
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  });

  // 6. Retorna o usuário limpo (sem senha)
  return c.json({ user: excludePassword(user, ['password_hash']) }, 201);
});

// ==========================================
// ROTA 2: LOGIN (SIGNIN)
// ==========================================
app.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  // 1. Busca usuário
  const user = await prisma.users.findUnique({ where: { email } });
  if (!user) {
    return c.json({ error: 'Credenciais inválidas' }, 401);
  }

  // 2. Compara senha (Hash)
  const isValid = await compare(password, user.password_hash);
  if (!isValid) {
    return c.json({ error: 'Credenciais inválidas' }, 401);
  }

  // 3. Gera Token
  const secret = process.env.JWT_SECRET || 'segredo_padrao';
  const token = await sign({ id: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, secret);

  // 4. Cookie
  setCookie(c, 'auth_token', token, {
    httpOnly: true,
    secure: false, //process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return c.json({ user: excludePassword(user, ['password_hash']) });
});

// ==========================================
// ROTA 3: LOGOUT
// ==========================================
app.post('/logout', (c) => {
  deleteCookie(c, 'auth_token');
  return c.json({ message: 'Logout realizado com sucesso' });
});

// ==========================================
// ROTA 4: ME (Perfil do Usuário Logado)
// Usado para verificar se o usuário está logado ao recarregar a página
// ==========================================
app.get('/me', async (c) => {
  const token = getCookie(c, 'auth_token');
  
  if (!token) {
    return c.json({ user: null }, 401);
  }

  try {
    const secret = process.env.JWT_SECRET || 'segredo_padrao';
    const payload = await verify(token, secret);
    
    const user = await prisma.users.findUnique({
      where: { id: payload.id as string },
    });

    if (!user) {
      return c.json({ user: null }, 401);
    }

    return c.json({ user: excludePassword(user, ['password_hash']) });
  } catch (err) {
    return c.json({ user: null }, 401);
  }
});

export default app;