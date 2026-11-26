import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import categoriesRoute from '../src/routes/categories.js';
import transactionsRoute from '../src/routes/transactions.js';
import { prisma } from '../src/lib/prisma.js';

const secret = 'fincontrol-categories-test-only';
const previousSecret = process.env.JWT_SECRET;
const userId = 'categories-user';
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
app.route('/categories', categoriesRoute);
app.route('/transactions', transactionsRoute);
const send = (path: string, method: string, body?: unknown) =>
  app.request(path, {
    method,
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const leisure = { id: '11111111-1111-4111-8111-111111111111', userId, name: 'Lazer', type: 'expense', active: true };
const others = { id: '22222222-2222-4222-8222-222222222222', userId, name: 'Outros', type: 'expense', active: true };
const salary = { id: '33333333-3333-4333-8333-333333333333', userId, name: 'Salário', type: 'income', active: true };
const byId: Record<string, typeof leisure> = { [leisure.id]: leisure, [others.id]: others, [salary.id]: salary };

test('mesclar move lançamentos, recorrências e versões e arquiva a origem', async () => {
  mock(prisma.category, 'findFirst', (async (args: { where: { id: string; userId: string } }) =>
    args.where.userId === userId ? byId[args.where.id] ?? null : null) as AnyFn);
  const calls: string[] = [];
  const track = (name: string, result: unknown) => (async (args: unknown) => (calls.push(`${name} ${JSON.stringify(args)}`), result)) as AnyFn;
  mock(prisma.transaction, 'updateMany', track('transactions', { count: 9 }));
  mock(prisma.recurringRule, 'updateMany', track('rules', { count: 1 }));
  mock(prisma.recurringRuleVersion, 'updateMany', track('versions', { count: 2 }));
  mock(prisma.category, 'update', track('archive', leisure));
  mock(prisma, '$transaction', (async (ops: Promise<unknown>[]) => Promise.all(ops)) as AnyFn);

  const response = await send(`/categories/${leisure.id}/merge`, 'POST', { targetId: others.id });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { moved: 9, targetId: others.id });
  assert.deepEqual(
    calls.map((c) => c.split(' ')[0]),
    ['transactions', 'rules', 'versions', 'archive'],
  );
  assert.ok(calls[0].includes(`"categoryId":"${leisure.id}"`) && calls[0].includes(`"userId":"${userId}"`));
  assert.ok(calls[2].includes(`"rule":{"userId":"${userId}"}`));
  assert.ok(calls[3].includes('"active":false'));
});

test('mesclar recusa tipos diferentes e a própria categoria', async () => {
  mock(prisma.category, 'findFirst', (async (args: { where: { id: string } }) => byId[args.where.id] ?? null) as AnyFn);
  assert.equal((await send(`/categories/${leisure.id}/merge`, 'POST', { targetId: salary.id })).status, 400);
  assert.equal((await send(`/categories/${leisure.id}/merge`, 'POST', { targetId: leisure.id })).status, 400);
});

test('lançamento com categoria de outro usuário ou de outro tipo é recusado', async () => {
  mock(prisma.category, 'findFirst', (async (args: { where: { id: string; type?: string } }) => {
    const found = byId[args.where.id];
    return found && (!args.where.type || found.type === args.where.type) ? found : null;
  }) as AnyFn);
  let created = false;
  mock(prisma.transaction, 'create', (async () => ((created = true), {})) as AnyFn);
  const base = { description: 'X', amount: 10, date: '2026-11-15T03:00:00.000Z', type: 'expense' };
  assert.equal((await send('/transactions', 'POST', { ...base, categoryId: '44444444-4444-4444-8444-444444444444' })).status, 404);
  assert.equal((await send('/transactions', 'POST', { ...base, categoryId: salary.id })).status, 404);
  assert.equal(created, false);
  assert.equal((await send('/transactions', 'POST', { ...base, categoryId: leisure.id })).status, 201);
});

test('listagem inclui arquivadas só quando pedido', async () => {
  const wheres: unknown[] = [];
  mock(prisma.category, 'findMany', (async (args: { where: unknown }) => (wheres.push(args.where), [])) as AnyFn);
  await send('/categories', 'GET');
  await send('/categories?all=1', 'GET');
  assert.deepEqual(wheres, [{ userId, active: true }, { userId }]);
});
