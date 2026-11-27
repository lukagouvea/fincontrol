import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import importsRoute from '../src/routes/imports.js';
import { prisma } from '../src/lib/prisma.js';

const secret = 'fincontrol-imports-test-only';
const previousSecret = process.env.JWT_SECRET;
const userId = 'imports-user';
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
app.route('/imports', importsRoute);
const send = (path: string, method: string, body?: unknown) =>
  app.request(path, { method, headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

const food = '11111111-1111-4111-8111-111111111111';
const salary = '22222222-2222-4222-8222-222222222222';
const card = '33333333-3333-4333-8333-333333333333';
const item = (extra: Record<string, unknown> = {}) => ({ date: '2026-11-08T03:00:00.000Z', description: 'Mercado', amount: 142.3, type: 'expense', categoryId: food, ...extra });

test('importa tudo de uma vez, com o cartão só nas despesas', async () => {
  mock(prisma.card, 'findFirst', (async () => ({ id: card })) as AnyFn);
  mock(prisma.category, 'findMany', (async () => [{ id: food, type: 'expense' }, { id: salary, type: 'income' }]) as AnyFn);
  let rows: Array<Record<string, unknown>> = [];
  const tx = {
    importBatch: { create: async (args: { data: { count: number } }) => ({ id: 'b1', count: args.data.count }) },
    transaction: { createMany: async (args: { data: Array<Record<string, unknown>> }) => ((rows = args.data), { count: args.data.length }) },
  };
  mock(prisma, '$transaction', (async (fn: (t: typeof tx) => unknown) => fn(tx)) as AnyFn);
  const response = await send('/imports', 'POST', {
    fileName: 'fatura.csv',
    cardId: card,
    items: [item(), item({ description: 'Estorno', amount: 20, type: 'income', categoryId: salary })],
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { id: 'b1', count: 2, total: 122.3 });
  assert.deepEqual(rows.map((r) => [r.cardId, r.importBatchId]), [[card, 'b1'], [null, 'b1']]);
});

test('recusa categoria de outro usuário ou do tipo errado', async () => {
  mock(prisma.card, 'findFirst', (async () => ({ id: card })) as AnyFn);
  mock(prisma.category, 'findMany', (async () => [{ id: salary, type: 'income' }]) as AnyFn);
  let created = false;
  mock(prisma, '$transaction', (async () => ((created = true), {})) as AnyFn);
  assert.equal((await send('/imports', 'POST', { fileName: 'x.csv', cardId: null, items: [item({ categoryId: salary })] })).status, 404);
  assert.equal((await send('/imports', 'POST', { fileName: 'x.csv', cardId: null, items: [item()] })).status, 404);
  assert.equal(created, false);
});

test('desfazer apaga as transações da importação', async () => {
  mock(prisma.importBatch, 'findFirst', (async () => ({ id: 'b1' })) as AnyFn);
  let where: unknown;
  mock(prisma.transaction, 'deleteMany', (async (args: { where: unknown }) => ((where = args.where), { count: 36 })) as AnyFn);
  mock(prisma.importBatch, 'delete', (async () => ({})) as AnyFn);
  mock(prisma, '$transaction', (async (ops: Promise<unknown>[]) => Promise.all(ops)) as AnyFn);
  assert.deepEqual(await (await send('/imports/b1', 'DELETE')).json(), { deleted: 36 });
  assert.deepEqual(where, { importBatchId: 'b1', userId });
});
