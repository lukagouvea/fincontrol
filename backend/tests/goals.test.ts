import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import goalsRoute from '../src/routes/goals.js';
import { prisma } from '../src/lib/prisma.js';

const secret = 'fincontrol-goals-test-only';
const previousSecret = process.env.JWT_SECRET;
const userId = 'goals-user';
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
app.route('/goals', goalsRoute);
const send = (path: string, method: string, body?: unknown) =>
  app.request(path, { method, headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

const goal = {
  id: 'g1',
  userId,
  name: 'Reserva',
  target: 15000,
  deadline: new Date('2027-12-01T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  contributions: [
    { id: 'c1', amount: 8000.1, date: new Date('2026-10-01T12:00:00Z'), sourceMonth: null },
    { id: 'c2', amount: 399.9, date: new Date('2026-11-01T12:00:00Z'), sourceMonth: new Date('2026-10-01T00:00:00Z') },
  ],
};

test('soma o guardado em centavos e devolve o prazo como mês', async () => {
  mock(prisma.goal, 'findMany', (async () => [goal]) as AnyFn);
  const [body] = (await (await send('/goals', 'GET')).json()) as Array<Record<string, unknown>>;
  assert.equal(body.saved, 8400);
  assert.equal(body.deadline, '2027-12');
  assert.deepEqual((body.contributions as Array<{ sourceMonth: string | null }>).map((c) => c.sourceMonth), [null, '2026-10']);
});

test('criar com "já guardado" cria a primeira contribuição', async () => {
  let data: Record<string, unknown> | undefined;
  mock(prisma.goal, 'create', (async (args: { data: Record<string, unknown> }) => ((data = args.data), { ...goal, contributions: [] })) as AnyFn);
  const response = await send('/goals', 'POST', { name: 'Notebook', target: 3500, deadline: '2027-01', initial: 2100 });
  assert.equal(response.status, 201);
  assert.equal((data?.deadline as Date).toISOString(), '2027-01-01T00:00:00.000Z');
  assert.deepEqual((data?.contributions as { create: { amount: number } }).create.amount, 2100);
});

test('retirar não deixa o guardado negativo', async () => {
  mock(prisma.goal, 'findFirst', (async () => goal) as AnyFn);
  let created = 0;
  mock(prisma.goalContribution, 'create', (async (args: { data: { amount: number; date: Date } }) => ((created += 1), { id: 'c3', ...args.data })) as AnyFn);
  const date = '2026-11-18T12:00:00.000Z';
  assert.equal((await send('/goals/g1/contributions', 'POST', { amount: -9000, date })).status, 400);
  assert.equal((await send('/goals/g1/contributions', 'POST', { amount: -8400, date })).status, 201);
  assert.equal((await send('/goals/g1/contributions', 'POST', { amount: 0, date })).status, 400);
  assert.equal(created, 1);
});

test('meta de outro usuário não é encontrada', async () => {
  mock(prisma.goal, 'findFirst', (async () => null) as AnyFn);
  assert.equal((await send('/goals/g1', 'DELETE')).status, 404);
  assert.equal((await send('/goals/g1/contributions', 'POST', { amount: 10, date: '2026-11-18T12:00:00.000Z' })).status, 404);
});
