import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import budgetsRoute from '../src/routes/budgets.js';
import { prisma } from '../src/lib/prisma.js';

const secret = 'fincontrol-budgets-test-only';
const previousSecret = process.env.JWT_SECRET;
const userId = 'budgets-user';
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
app.route('/budgets', budgetsRoute);
const put = (month: string, body: unknown) =>
  app.request(`/budgets/${month}`, { method: 'PUT', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const food = '11111111-1111-4111-8111-111111111111';
const fun = '22222222-2222-4222-8222-222222222222';

test('salvar com repetir apaga os meses seguintes e grava cada limite no mês', async () => {
  mock(prisma.category, 'count', (async () => 2) as AnyFn);
  const ops: string[] = [];
  mock(prisma.budgetLimit, 'deleteMany', (async (args: unknown) => (ops.push(`delete ${JSON.stringify(args)}`), { count: 1 })) as AnyFn);
  mock(prisma.budgetLimit, 'upsert', (async (args: { create: { categoryId: string; amount: number | null; repeat: boolean; month: Date } }) =>
    (ops.push(`upsert ${args.create.categoryId} ${args.create.amount} ${args.create.repeat} ${args.create.month.toISOString().slice(0, 10)}`), {})) as AnyFn);
  mock(prisma, '$transaction', (async (fn: (tx: typeof prisma) => unknown) => fn(prisma)) as AnyFn);

  const response = await put('2026-11', { repeat: true, limits: [{ categoryId: food, amount: 1200 }, { categoryId: fun, amount: null }] });
  assert.equal(response.status, 200);
  assert.ok(ops[0].startsWith('delete') && ops[0].includes('"gt":"2026-11-01T00:00:00.000Z"') && !ops[0].includes('null'));
  assert.deepEqual(ops.slice(1), [`upsert ${food} 1200 true 2026-11-01`, `upsert ${fun} null true 2026-11-01`]);
});

test('só este mês não apaga os meses seguintes', async () => {
  mock(prisma.category, 'count', (async () => 1) as AnyFn);
  let deleted = false;
  mock(prisma.budgetLimit, 'deleteMany', (async () => ((deleted = true), { count: 0 })) as AnyFn);
  mock(prisma.budgetLimit, 'upsert', (async () => ({})) as AnyFn);
  mock(prisma, '$transaction', (async (fn: (tx: typeof prisma) => unknown) => fn(prisma)) as AnyFn);
  assert.equal((await put('2026-12', { repeat: false, limits: [{ categoryId: food, amount: 900 }] })).status, 200);
  assert.equal(deleted, false);
});

test('recusa categoria de outro usuário, valor negativo e mês inválido', async () => {
  mock(prisma.category, 'count', (async () => 0) as AnyFn);
  assert.equal((await put('2026-11', { repeat: true, limits: [{ categoryId: food, amount: 100 }] })).status, 404);
  assert.equal((await put('2026-11', { repeat: true, limits: [{ categoryId: food, amount: -1 }] })).status, 400);
  assert.equal((await put('2026-13', { repeat: true, limits: [] })).status, 400);
});

test('limite geral (sem categoria) é gravado à parte e também repete', async () => {
  mock(prisma.category, 'count', (async () => 1) as AnyFn);
  const ops: string[] = [];
  mock(prisma.budgetLimit, 'deleteMany', (async (args: unknown) => (ops.push(`delete ${JSON.stringify(args)}`), { count: 0 })) as AnyFn);
  mock(prisma.budgetLimit, 'upsert', (async () => (ops.push('upsert'), {})) as AnyFn);
  mock(prisma.budgetLimit, 'findFirst', (async () => null) as AnyFn);
  mock(prisma.budgetLimit, 'create', (async (args: { data: { categoryId: null; amount: number } }) => (ops.push(`create ${args.data.categoryId} ${args.data.amount}`), {})) as AnyFn);
  mock(prisma, '$transaction', (async (fn: (tx: typeof prisma) => unknown) => fn(prisma)) as AnyFn);
  const response = await put('2026-11', { repeat: true, limits: [{ categoryId: null, amount: 4150 }, { categoryId: food, amount: 1200 }] });
  assert.equal(response.status, 200);
  assert.ok(ops[0].includes('{"categoryId":null}'));
  assert.deepEqual(ops.slice(1), ['create null 4150', 'upsert']);
});
