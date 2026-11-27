import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import transactionsRoute from '../src/routes/transactions.js';
import recurringRoute from '../src/routes/recurring.js';
import { prisma } from '../src/lib/prisma.js';

const secret = 'fincontrol-bills-test-only';
const previousSecret = process.env.JWT_SECRET;
const userId = 'bills-user';
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
app.route('/recurring', recurringRoute);
const send = (path: string, method: string, body?: unknown) =>
  app.request(path, { method, headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

const installment = { id: 't1', userId, type: 'expense', cardId: null, installmentGroupId: 'g1' };
const paidAt = '2026-11-27T15:00:00.000Z';

test('parcela À vista pode ser marcada e desmarcada como paga', async () => {
  let data: { paidAt?: Date | null } = {};
  mock(prisma.transaction, 'findFirst', (async () => installment) as AnyFn);
  mock(prisma.transaction, 'update', (async (args: { data: { paidAt: Date | null } }) => ((data = args.data), { id: 't1', paidAt: args.data.paidAt })) as AnyFn);

  const paid = await send('/transactions/t1/paid', 'PUT', { paidAt });
  assert.equal(paid.status, 200);
  assert.deepEqual(await paid.json(), { id: 't1', paidAt });
  assert.equal(data.paidAt?.toISOString(), paidAt);

  const unpaid = await send('/transactions/t1/paid', 'PUT', { paidAt: null });
  assert.deepEqual(await unpaid.json(), { id: 't1', paidAt: null });
  assert.equal(data.paidAt, null);
});

test('compra no cartão, avulsa ou receita não tem pagamento a marcar', async () => {
  for (const other of [
    { ...installment, cardId: 'card-1' },
    { ...installment, installmentGroupId: null },
    { ...installment, type: 'income' },
  ]) {
    mock(prisma.transaction, 'findFirst', (async () => other) as AnyFn);
    assert.equal((await send('/transactions/t1/paid', 'PUT', { paidAt })).status, 400);
  }
  mock(prisma.transaction, 'findFirst', (async () => null) as AnyFn);
  assert.equal((await send('/transactions/t1/paid', 'PUT', { paidAt })).status, 404);
});

test('ocorrência de recorrente: marca, lista e desmarca por mês', async () => {
  const rule = { id: 'r1', userId, type: 'expense' };
  let upserted: { where: { ruleId_month: { month: Date } }; create: { userId: string; paidAt: Date } } | undefined;
  let deleted: { where: { month: Date } } | undefined;
  mock(prisma.recurringRule, 'findFirst', (async () => rule) as AnyFn);
  mock(prisma.recurringPayment, 'upsert', (async (args: NonNullable<typeof upserted>) => ((upserted = args), { paidAt: args.create.paidAt })) as AnyFn);
  mock(prisma.recurringPayment, 'deleteMany', (async (args: NonNullable<typeof deleted>) => ((deleted = args), { count: 1 })) as AnyFn);
  mock(prisma.recurringPayment, 'findMany', (async () => [{ ruleId: 'r1', month: new Date('2026-11-01T00:00:00Z'), paidAt: new Date(paidAt) }]) as AnyFn);

  const paid = await send('/recurring/r1/payments/2026-11', 'PUT', { paidAt });
  assert.deepEqual(await paid.json(), { ruleId: 'r1', month: '2026-11', paidAt });
  assert.equal(upserted?.where.ruleId_month.month.toISOString(), '2026-11-01T00:00:00.000Z');
  assert.equal(upserted?.create.userId, userId);

  assert.deepEqual(await (await send('/recurring/payments', 'GET')).json(), [{ ruleId: 'r1', month: '2026-11', paidAt }]);

  const unpaid = await send('/recurring/r1/payments/2026-11', 'PUT', { paidAt: null });
  assert.deepEqual(await unpaid.json(), { ruleId: 'r1', month: '2026-11', paidAt: null });
  assert.equal(deleted?.where.month.toISOString(), '2026-11-01T00:00:00.000Z');
});

test('pagamento de recorrente recusa receita, mês inválido e regra de outro usuário', async () => {
  mock(prisma.recurringRule, 'findFirst', (async () => ({ id: 'r1', userId, type: 'income' })) as AnyFn);
  assert.equal((await send('/recurring/r1/payments/2026-11', 'PUT', { paidAt })).status, 400);
  assert.equal((await send('/recurring/r1/payments/2026-13', 'PUT', { paidAt })).status, 400);
  mock(prisma.recurringRule, 'findFirst', (async () => null) as AnyFn);
  assert.equal((await send('/recurring/r1/payments/2026-11', 'PUT', { paidAt })).status, 404);
});
