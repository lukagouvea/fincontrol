import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import cardsRoute from '../src/routes/cards.js';
import transactionsRoute from '../src/routes/transactions.js';
import { prisma } from '../src/lib/prisma.js';
import { addMonthsClamped } from '../src/lib/cards.js';

const secret = 'fincontrol-cards-test-only';
const previousSecret = process.env.JWT_SECRET;
const userId = 'cards-user';
let cookie = '';

before(async () => {
  process.env.JWT_SECRET = secret;
  const token = await sign({ id: userId, exp: Math.floor(Date.now() / 1000) + 3600 }, secret, 'HS256');
  cookie = 'auth_token=' + token;
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
app.route('/cards', cardsRoute);
app.route('/transactions', transactionsRoute);
const send = (path: string, method: string, body?: unknown) =>
  app.request(path, {
    method,
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const card = {
  id: '11111111-1111-4111-8111-111111111111',
  userId,
  name: 'Aurora',
  last4: '4821',
  limit: 6000,
  closingDay: 8,
  dueDay: 15,
  color: 'verde',
  archivedAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  payments: [],
};

test('parcelas somam meses sem transbordar no fim do mês', () => {
  const jan31 = new Date('2026-01-31T03:00:00Z');
  assert.equal(addMonthsClamped(jan31, 1).toISOString(), '2026-02-28T03:00:00.000Z');
  assert.equal(addMonthsClamped(jan31, 2).toISOString(), '2026-03-31T03:00:00.000Z');
  assert.equal(addMonthsClamped(new Date('2027-12-31T03:00:00Z'), 2).toISOString(), '2028-02-29T03:00:00.000Z');
});

test('cartão só guarda os 4 últimos dígitos e valida dias', async () => {
  let created: Record<string, unknown> | undefined;
  mock(prisma.card, 'create', (async (args: { data: Record<string, unknown> }) => {
    created = args.data;
    return { ...card, ...args.data, payments: [] };
  }) as AnyFn);
  const bad = await send('/cards', 'POST', { name: 'Aurora', last4: '1234567812345678', limit: 6000, closingDay: 8, dueDay: 15 });
  assert.equal(bad.status, 400);
  const badDay = await send('/cards', 'POST', { name: 'Aurora', last4: '4821', limit: 6000, closingDay: 32, dueDay: 15 });
  assert.equal(badDay.status, 400);
  const ok = await send('/cards', 'POST', { name: 'Aurora', last4: '4821', limit: 6000, closingDay: 8, dueDay: 15, color: 'azul' });
  assert.equal(ok.status, 201);
  assert.deepEqual(created, { name: 'Aurora', last4: '4821', limit: 6000, closingDay: 8, dueDay: 15, color: 'azul', userId });
});

test('transação com cartão de outro usuário é recusada', async () => {
  mock(prisma.card, 'findFirst', (async () => null) as AnyFn);
  let created = false;
  mock(prisma.transaction, 'create', (async () => {
    created = true;
    return {};
  }) as AnyFn);
  const response = await send('/transactions', 'POST', {
    description: 'Mercado',
    amount: 100,
    date: '2026-11-15T03:00:00.000Z',
    type: 'expense',
    categoryId: '22222222-2222-4222-8222-222222222222',
    cardId: '33333333-3333-4333-8333-333333333333',
  });
  assert.equal(response.status, 404);
  assert.equal(created, false);
});

test('compra parcelada leva o cartão para o grupo e todas as parcelas', async () => {
  mock(prisma.card, 'findFirst', (async () => ({ id: card.id })) as AnyFn);
  mock(prisma.category, 'findFirst', (async () => ({ id: 'cat' })) as AnyFn);
  let group: Record<string, unknown> | undefined;
  let parcels: Array<Record<string, unknown>> = [];
  const tx = {
    installmentGroup: { create: async (args: { data: Record<string, unknown> }) => ((group = args.data), { id: 'g1' }) },
    transaction: { createMany: async (args: { data: Array<Record<string, unknown>> }) => ((parcels = args.data), { count: args.data.length }) },
  };
  mock(prisma, '$transaction', (async (fn: (t: typeof tx) => unknown) => fn(tx)) as AnyFn);
  const response = await send('/transactions/installment', 'POST', {
    description: 'Notebook',
    totalAmount: 1000,
    totalInstallments: 3,
    date: '2026-01-31T03:00:00.000Z',
    categoryId: '22222222-2222-4222-8222-222222222222',
    cardId: card.id,
  });
  assert.equal(response.status, 201);
  assert.equal(group?.cardId, card.id);
  assert.deepEqual(parcels.map((p) => p.cardId), [card.id, card.id, card.id]);
  assert.deepEqual(
    parcels.map((p) => (p.date as Date).toISOString().slice(0, 10)),
    ['2026-01-31', '2026-02-28', '2026-03-31'],
  );
});

test('pagar fatura registra o pagamento sem criar transação', async () => {
  mock(prisma.card, 'findFirst', (async () => card) as AnyFn);
  let payment: Record<string, unknown> | undefined;
  mock(prisma.invoicePayment, 'create', (async (args: { data: Record<string, unknown> }) => {
    payment = args.data;
    return { id: 'p1', ...args.data };
  }) as AnyFn);
  let transactionCreated = false;
  mock(prisma.transaction, 'create', (async () => {
    transactionCreated = true;
    return {};
  }) as AnyFn);
  const response = await send(`/cards/${card.id}/payments`, 'POST', {
    invoiceMonth: '2026-12',
    amount: 1480.6,
    paidAt: '2026-11-18T12:00:00.000Z',
  });
  assert.equal(response.status, 201);
  assert.equal((payment?.invoiceMonth as Date).toISOString(), '2026-12-01T00:00:00.000Z');
  assert.equal(payment?.cardId, card.id);
  assert.equal(transactionCreated, false);
  assert.deepEqual(await response.json(), { id: 'p1', invoiceMonth: '2026-12', amount: 1480.6, paidAt: '2026-11-18T12:00:00.000Z' });
});

test('apagar cartão com histórico arquiva; sem uso apaga', async () => {
  mock(prisma.card, 'findFirst', (async () => card) as AnyFn);
  mock(prisma.recurringRule, 'count', (async () => 0) as AnyFn);
  mock(prisma.recurringRuleVersion, 'count', (async () => 0) as AnyFn);
  let deleted = false;
  let archivedAt: unknown;
  mock(prisma.card, 'delete', (async () => ((deleted = true), card)) as AnyFn);
  mock(prisma.card, 'update', (async (args: { data: { archivedAt: unknown } }) => ((archivedAt = args.data.archivedAt), card)) as AnyFn);

  mock(prisma.transaction, 'count', (async () => 3) as AnyFn);
  assert.deepEqual(await (await send(`/cards/${card.id}`, 'DELETE')).json(), { archived: true });
  assert.ok(archivedAt instanceof Date);
  assert.equal(deleted, false);

  // Recorrente que já foi paga com este cartão (versão antiga) também é histórico.
  mock(prisma.transaction, 'count', (async () => 0) as AnyFn);
  mock(prisma.recurringRuleVersion, 'count', (async () => 1) as AnyFn);
  assert.deepEqual(await (await send(`/cards/${card.id}`, 'DELETE')).json(), { archived: true });
  assert.equal(deleted, false);

  mock(prisma.recurringRuleVersion, 'count', (async () => 0) as AnyFn);
  assert.deepEqual(await (await send(`/cards/${card.id}`, 'DELETE')).json(), { deleted: true });
  assert.equal(deleted, true);
});

test('desarquivar (edição parcial) não troca a cor do cartão', async () => {
  let data: Record<string, unknown> = {};
  mock(prisma.card, 'findFirst', (async () => ({ ...card, color: 'laranja' })) as AnyFn);
  mock(prisma.card, 'update', (async (args: { data: Record<string, unknown> }) => ((data = args.data), { ...card, color: 'laranja' })) as AnyFn);
  assert.equal((await send(`/cards/${card.id}`, 'PUT', { archived: false })).status, 200);
  assert.equal('color' in data, false);
  assert.equal(data.archivedAt, null);
});

test('cartão novo sem cor ganha o verde padrão', async () => {
  let data: Record<string, unknown> = {};
  mock(prisma.card, 'create', (async (args: { data: Record<string, unknown> }) => ((data = args.data), { ...card })) as AnyFn);
  const { color: _color, ...body } = { name: 'Vento', last4: '7730', limit: 3000, closingDay: 2, dueDay: 10, color: 'azul' };
  assert.equal((await send('/cards', 'POST', body)).status, 201);
  assert.equal(data.color, 'verde');
});
