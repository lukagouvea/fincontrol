import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import transactionsRoute from '../src/routes/transactions.js';
import { prisma } from '../src/lib/prisma.js';

const secret = 'fincontrol-batch-test-only';
const previousSecret = process.env.JWT_SECRET;
const userId = 'batch-user';
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
app.route('/transactions', transactionsRoute);
const batch = (body: unknown) =>
  app.request('/transactions/batch', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const cat = '33333333-3333-4333-8333-333333333333';
const card = '44444444-4444-4444-8444-444444444444';

function rows(list: Array<{ id: string; type: string; installmentGroupId: string | null }>) {
  mock(prisma.transaction, 'findMany', (async (args: { where: { id: { in: string[] } } }) => list.filter((r) => args.where.id.in.includes(r.id))) as AnyFn);
}

test('tudo ou nada: id de outro usuário não altera nada', async () => {
  rows([{ id: a, type: 'expense', installmentGroupId: null }]);
  let touched = false;
  mock(prisma, '$transaction', (async () => ((touched = true), [])) as AnyFn);
  assert.equal((await batch({ action: 'delete', ids: [a, b] })).status, 404);
  assert.equal(touched, false);
});

test('excluir apaga avulsas e a compra parcelada inteira', async () => {
  rows([
    { id: a, type: 'expense', installmentGroupId: null },
    { id: b, type: 'expense', installmentGroupId: 'g1' },
  ]);
  const calls: string[] = [];
  mock(prisma.transaction, 'deleteMany', (async (args: unknown) => (calls.push(`tx ${JSON.stringify(args)}`), { count: 1 })) as AnyFn);
  mock(prisma.installmentGroup, 'deleteMany', (async (args: unknown) => (calls.push(`group ${JSON.stringify(args)}`), { count: 1 })) as AnyFn);
  mock(prisma, '$transaction', (async (ops: Promise<unknown>[]) => Promise.all(ops)) as AnyFn);
  assert.deepEqual(await (await batch({ action: 'delete', ids: [a, b] })).json(), { deleted: 1, groupsDeleted: 1 });
  assert.ok(calls[0].includes(a) && !calls[0].includes(b));
  assert.ok(calls[1].includes('g1'));
});

test('mudar categoria exige um só tipo e categoria do usuário', async () => {
  rows([
    { id: a, type: 'expense', installmentGroupId: null },
    { id: b, type: 'income', installmentGroupId: null },
  ]);
  assert.equal((await batch({ action: 'update', ids: [a, b], data: { categoryId: cat } })).status, 400);
  rows([{ id: a, type: 'expense', installmentGroupId: null }]);
  mock(prisma.category, 'findFirst', (async () => null) as AnyFn);
  assert.equal((await batch({ action: 'update', ids: [a], data: { categoryId: cat } })).status, 404);
});

test('mudar pagamento leva o cartão para a compra parcelada inteira', async () => {
  rows([{ id: b, type: 'expense', installmentGroupId: 'g1' }]);
  mock(prisma.card, 'findFirst', (async () => ({ id: card })) as AnyFn);
  const calls: string[] = [];
  mock(prisma.transaction, 'updateMany', (async (args: unknown) => (calls.push(`tx ${JSON.stringify(args)}`), { count: 1 })) as AnyFn);
  mock(prisma.installmentGroup, 'updateMany', (async (args: unknown) => (calls.push(`group ${JSON.stringify(args)}`), { count: 1 })) as AnyFn);
  mock(prisma, '$transaction', (async (ops: Promise<unknown>[]) => Promise.all(ops)) as AnyFn);
  assert.equal((await batch({ action: 'update', ids: [b], data: { cardId: card } })).status, 200);
  assert.equal(calls.length, 3);
  assert.ok(calls[1].includes('"installmentGroupId":{"in":["g1"]}') && calls[2].startsWith('group'));
  assert.equal((await batch({ action: 'update', ids: [b], data: {} })).status, 400);
});
