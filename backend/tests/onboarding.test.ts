import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import onboardingRoute from '../src/routes/onboarding.js';
import { prisma } from '../src/lib/prisma.js';

const secret = 'fincontrol-onboarding-test-only';
const previousSecret = process.env.JWT_SECRET;
const userId = 'onboarding-user';
let cookie = '';
before(async () => {
  process.env.JWT_SECRET = secret;
  cookie = 'auth_token=' + (await sign({ id: userId, exp: Math.floor(Date.now() / 1000) + 3600 }, secret, 'HS256'));
});
after(() => {
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

type AnyFn = (...args: never[]) => unknown;
const originals: Array<[Record<string, AnyFn>, string, AnyFn]> = [];
function mock<T extends object>(target: T, key: keyof T & string, impl: AnyFn) {
  const record = target as unknown as Record<string, AnyFn>;
  originals.push([record, key, record[key]]);
  record[key] = impl;
}
afterEach(() => {
  while (originals.length) {
    const [target, key, fn] = originals.pop()!;
    target[key] = fn;
  }
});

const app = new Hono();
app.route('/onboarding', onboardingRoute);
const complete = (body: unknown) =>
  app.request('/onboarding/complete', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function setup(existingCategories: number) {
  const calls: string[] = [];
  mock(prisma.category, 'count', (async () => existingCategories) as AnyFn);
  mock(prisma.category, 'createMany', (async (args: { data: Array<{ name: string; userId: string }> }) => (calls.push(`categories ${args.data.map((c) => c.name).join(',')}`), { count: args.data.length })) as AnyFn);
  mock(prisma.budgetLimit, 'findFirst', (async () => null) as AnyFn);
  mock(prisma.budgetLimit, 'create', (async (args: { data: { categoryId: null; amount: number; repeat: boolean } }) => (calls.push(`budget ${args.data.categoryId} ${args.data.amount} ${args.data.repeat}`), {})) as AnyFn);
  mock(prisma.user, 'update', (async () => (calls.push('done'), { onboardingCompletedAt: new Date('2026-11-18T12:00:00Z') })) as AnyFn);
  mock(prisma, '$transaction', (async (fn: (tx: typeof prisma) => unknown) => fn(prisma)) as AnyFn);
  return calls;
}

test('conta sem categorias ganha as padrão e o orçamento vira o limite geral', async () => {
  const calls = setup(0);
  const response = await complete({ budget: 4150 });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [
    'categories Moradia,Alimentação,Transporte,Lazer,Saúde,Assinaturas,Outros,Salário,Extras',
    'budget null 4150 true',
    'done',
  ]);
});

test('conta que já tem categorias não ganha outras; pular o orçamento não cria limite', async () => {
  const calls = setup(3);
  assert.equal((await complete({})).status, 200);
  assert.deepEqual(calls, ['done']);
});
