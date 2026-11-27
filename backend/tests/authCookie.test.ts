import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { hash } from 'bcryptjs';
import authRoute from '../src/routes/auth.js';
import { isSecureCookie, warnIfInsecureProduction } from '../src/lib/authCookie.js';
import { prisma } from '../src/lib/prisma.js';

const previous = { secret: process.env.JWT_SECRET, frontend: process.env.FRONTEND_URL };
const user = { id: 'cookie-user', name: 'Cookie', email: 'cookie@example.test', passwordHash: '', createdAt: new Date('2026-01-01T12:00:00Z') };
const originalFindUnique = prisma.user.findUnique;

before(async () => {
  process.env.JWT_SECRET = 'fincontrol-cookie-test-only';
  user.passwordHash = await hash('test-password', 4);
  prisma.user.findUnique = (() => Promise.resolve(user)) as unknown as typeof prisma.user.findUnique;
});
afterEach(() => {
  if (previous.frontend === undefined) delete process.env.FRONTEND_URL;
  else process.env.FRONTEND_URL = previous.frontend;
});
after(() => {
  prisma.user.findUnique = originalFindUnique;
  if (previous.secret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previous.secret;
});

async function login() {
  const app = new Hono();
  app.route('/auth', authRoute);
  const response = await app.request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: 'test-password' }),
  });
  assert.equal(response.status, 200);
  return { app, cookie: response.headers.get('set-cookie') ?? '' };
}

test('app servido por HTTPS: o cookie de sessão vai com Secure, HttpOnly e SameSite=Lax', async () => {
  process.env.FRONTEND_URL = 'https://app.exemplo.com';
  const { cookie } = await login();
  assert.match(cookie, /^auth_token=/);
  assert.match(cookie, /; Secure/);
  assert.match(cookie, /; HttpOnly/);
  assert.match(cookie, /; SameSite=Lax/);
  assert.match(cookie, /; Max-Age=604800/);
});

test('app em http://localhost (dev e CI): sem Secure, senão o navegador não guarda a sessão', async () => {
  process.env.FRONTEND_URL = 'http://localhost:5173';
  const { cookie } = await login();
  assert.match(cookie, /^auth_token=/);
  assert.doesNotMatch(cookie, /Secure/);
});

test('sair apaga o cookie com os mesmos atributos com que ele foi criado', async () => {
  process.env.FRONTEND_URL = 'https://app.exemplo.com';
  const { app } = await login();
  const response = await app.request('/auth/logout', { method: 'POST' });
  const cleared = response.headers.get('set-cookie') ?? '';
  assert.match(cleared, /^auth_token=;/);
  assert.match(cleared, /; Max-Age=0/);
  assert.match(cleared, /; Path=\//);
  assert.match(cleared, /; Secure/);
});

test('decide o Secure pelo esquema do FRONTEND_URL', () => {
  assert.equal(isSecureCookie('https://app.exemplo.com'), true);
  assert.equal(isSecureCookie(' HTTPS://app.exemplo.com '), true);
  assert.equal(isSecureCookie('http://localhost:5173'), false);
  assert.equal(isSecureCookie(undefined), false);
});

test('avisa ao subir em produção sem HTTPS', () => {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (message: string) => warnings.push(message);
  try {
    warnIfInsecureProduction({ NODE_ENV: 'production', FRONTEND_URL: 'http://app.exemplo.com' });
    warnIfInsecureProduction({ NODE_ENV: 'production', FRONTEND_URL: 'https://app.exemplo.com' });
    warnIfInsecureProduction({ NODE_ENV: 'development', FRONTEND_URL: 'http://localhost:5173' });
  } finally {
    console.warn = original;
  }
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /não é https/);
});
