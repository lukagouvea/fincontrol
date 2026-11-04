import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { hash } from 'bcryptjs';
import { sign } from 'hono/jwt';
import authRoute from '../src/routes/auth.js';
import usersRoute from '../src/routes/users.js';
import { authMiddleware } from '../src/middleware/auth.js';
import { prisma } from '../src/lib/prisma.js';

const secret = 'fincontrol-auth-regression-test-only';
const previousSecret = process.env.JWT_SECRET;
const user = {
  id: 'auth-regression-user',
  name: 'Usuário de teste',
  email: 'auth-regression@example.test',
  passwordHash: '',
  tutorialCompleted: true,
  createdAt: new Date('2026-01-01T12:00:00Z'),
};

before(async () => {
  process.env.JWT_SECRET = secret;
  user.passwordHash = await hash('test-password', 4);
});
const originalFindUnique = prisma.user.findUnique;
const originalUpdate = prisma.user.update;
afterEach(() => {
  prisma.user.findUnique = originalFindUnique;
  prisma.user.update = originalUpdate;
});
after(() => {
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

function makeApp() {
  const app = new Hono<{ Variables: { userId: string } }>();
  app.route('/auth', authRoute);
  app.route('/users', usersRoute);
  app.use('/private/*', authMiddleware);
  app.get('/private/check', c => c.json({ userId: c.var.userId }));
  return app;
}

test('o cookie emitido no login autentica perfil, rotas protegidas e tutorial', async () => {
  prisma.user.findUnique = (() => Promise.resolve(user)) as unknown as typeof prisma.user.findUnique;
  prisma.user.update = (() => Promise.resolve(user)) as unknown as typeof prisma.user.update;
  const app = makeApp();
  const login = await app.request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: 'test-password' }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie, 'O login precisa emitir um cookie de sessão.');
  const me = await app.request('/auth/me', { headers: { Cookie: cookie } });
  assert.equal(me.status, 200, 'O perfil deve aceitar o cookie recém-emitido.');
  const profile = await me.json() as { user: Record<string, unknown> };
  assert.equal(profile.user.id, user.id);
  assert.equal(profile.user.passwordHash, undefined);
  const protectedResponse = await app.request('/private/check', { headers: { Cookie: cookie } });
  assert.equal(protectedResponse.status, 200);
  assert.deepEqual(await protectedResponse.json(), { userId: user.id });
  const tutorial = await app.request('/users/tutorial-status', { headers: { Cookie: cookie } });
  assert.equal(tutorial.status, 200);
  const update = await app.request('/users/tutorial-status', {
    method: 'PATCH',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tutorialCompleted: true }),
  });
  assert.equal(update.status, 200);
});

test('rotas protegidas rejeitam ausência de cookie, expiração, assinatura e algoritmo incorretos', async () => {
  const app = makeApp();
  assert.equal((await app.request('/private/check')).status, 401);
  const claims = { id: user.id, exp: Math.floor(Date.now() / 1000) + 3600 };
  const tokens = [
    await sign({ ...claims, exp: 1 }, secret, 'HS256'),
    await sign(claims, 'another-test-secret', 'HS256'),
    await sign(claims, secret, 'HS384'),
    'invalid-token',
  ];
  for (const token of tokens) {
    const result = await app.request('/private/check', { headers: { Cookie: 'auth_token=' + token } });
    assert.equal(result.status, 401);
  }
});
