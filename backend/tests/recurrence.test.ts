import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { sign } from 'hono/jwt';
import recurringRoute from '../src/routes/recurring.js';
import { prisma } from '../src/lib/prisma.js';
import {
  type Version,
  clampDay,
  monthIndex,
  normalizeVersions,
  occurrenceDate,
  planVersions,
  versionForMonth,
} from '../src/lib/recurrence.js';

const jan26 = monthIndex(2026, 0);
const oct26 = monthIndex(2026, 9);
const nov26 = monthIndex(2026, 10);
const dec26 = monthIndex(2026, 11);
const jan27 = monthIndex(2027, 0);

const v = (effectiveFrom: number, amount: number, dayOfMonth = 10, categoryId: string | null = 'cat-a'): Version =>
  ({ effectiveFrom, amount, dayOfMonth, categoryId });

test('versionForMonth usa a versão mais recente já vigente', () => {
  const versions = [v(jan26, 1500), v(dec26, 1650)];
  assert.equal(versionForMonth(versions, jan26).amount, 1500);
  assert.equal(versionForMonth(versions, nov26).amount, 1500);
  assert.equal(versionForMonth(versions, dec26).amount, 1650);
  assert.equal(versionForMonth(versions, jan27).amount, 1650);
  // Antes da primeira versão, usa a primeira.
  assert.equal(versionForMonth(versions, jan26 - 3).amount, 1500);
});

test('reajuste "a partir de" preserva os meses anteriores', () => {
  const result = planVersions([v(jan26, 1500)], { amount: 1650 }, 'from', dec26, jan26);
  assert.deepEqual(result, [v(jan26, 1500), v(dec26, 1650)]);
});

test('"a partir de" no mês de início equivale a alterar a primeira versão', () => {
  const result = planVersions([v(jan26, 1500)], { amount: 1650 }, 'from', jan26, jan26);
  assert.deepEqual(result, [v(jan26, 1650)]);
  // Mês anterior ao início é tratado como o início.
  assert.deepEqual(planVersions([v(jan26, 1500)], { amount: 1650 }, 'from', jan26 - 5, jan26), [v(jan26, 1650)]);
});

test('"a partir de" aplica só os campos alterados nas versões posteriores', () => {
  const versions = [v(jan26, 1500), v(jan27, 1700)];
  // Muda a categoria a partir de out/26: o reajuste de jan/27 continua.
  const result = planVersions(versions, { categoryId: 'cat-b' }, 'from', oct26, jan26);
  assert.deepEqual(result, [
    v(jan26, 1500),
    v(oct26, 1500, 10, 'cat-b'),
    v(jan27, 1700, 10, 'cat-b'),
  ]);
  // Muda o valor a partir de out/26: o valor passa a valer em todos os meses seguintes.
  assert.deepEqual(planVersions(versions, { amount: 1600 }, 'from', oct26, jan26), [
    v(jan26, 1500),
    v(oct26, 1600),
  ]);
});

test('mudança de dia a partir de um mês mantém o dia antigo antes dele', () => {
  const result = planVersions([v(jan26, 1500)], { dayOfMonth: 15 }, 'from', jan27, jan26);
  assert.equal(versionForMonth(result, dec26).dayOfMonth, 10);
  assert.equal(versionForMonth(result, jan27).dayOfMonth, 15);
});

test('sem mudança nos campos versionados, nenhuma versão é criada', () => {
  assert.deepEqual(planVersions([v(jan26, 1500)], { amount: 1500 }, 'from', dec26, jan26), [v(jan26, 1500)]);
  assert.deepEqual(planVersions([v(jan26, 1500)], {}, 'from', dec26, jan26), [v(jan26, 1500)]);
});

test('"corrigir todo o histórico" aplica a mudança em todas as versões', () => {
  const versions = [v(jan26, 1500), v(dec26, 1650)];
  assert.deepEqual(planVersions(versions, { amount: 1550 }, 'all', dec26, jan26), [v(jan26, 1550)]);
  // Corrigir a categoria mantém os reajustes de valor.
  assert.deepEqual(planVersions(versions, { categoryId: 'cat-b' }, 'all', dec26, jan26), [
    v(jan26, 1500, 10, 'cat-b'),
    v(dec26, 1650, 10, 'cat-b'),
  ]);
});

test('normalizeVersions acompanha mudanças no início da regra', () => {
  const versions = [v(jan26, 1500), v(oct26, 1600), v(dec26, 1650)];
  // Início adiado para nov/26: a versão de out passa a começar em nov.
  assert.deepEqual(normalizeVersions(versions, nov26), [v(nov26, 1600), v(dec26, 1650)]);
  // Início antecipado: a primeira versão recua junto.
  assert.deepEqual(normalizeVersions(versions, jan26 - 2)[0], v(jan26 - 2, 1500));
});

test('clampDay e occurrenceDate não transbordam para o mês seguinte', () => {
  assert.equal(clampDay(2026, 1, 31), 28);
  assert.equal(clampDay(2028, 1, 31), 29);
  assert.equal(clampDay(2026, 3, 31), 30);
  assert.equal(occurrenceDate(monthIndex(2026, 1), 31).toISOString(), '2026-02-28T00:00:00.000Z');
});

// --- Rota PUT /recurring/:id ---

const secret = 'fincontrol-recurrence-test-only';
const previousSecret = process.env.JWT_SECRET;
const userId = 'recurrence-user';
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

const originalFindFirst = prisma.recurringRule.findFirst;
const originalTransaction = prisma.$transaction;
afterEach(() => {
  prisma.recurringRule.findFirst = originalFindFirst;
  prisma.$transaction = originalTransaction;
});

test('PUT com scope "from" grava uma nova versão e mantém o passado e as variações', async () => {
  const rule = {
    id: 'rule-1',
    userId,
    description: 'Aluguel',
    type: 'expense',
    amount: 1500,
    categoryId: 'cat-a',
    dayOfMonth: 10,
    startDate: new Date('2026-01-01T03:00:00Z'),
    endDate: null,
    category: null,
    versions: [{ id: 'v1', effectiveFrom: new Date('2026-01-01T00:00:00Z'), amount: 1500, categoryId: 'cat-a', dayOfMonth: 10, category: null }],
  };
  const calls: { deleteMany?: unknown; upserts: unknown[]; txUpdates: unknown[]; ruleUpdate?: unknown } = { upserts: [], txUpdates: [] };
  const variation = {
    id: 't1',
    recurringRuleId: 'rule-1',
    description: 'Aluguel',
    categoryId: 'cat-a',
    date: new Date('2026-10-10T00:00:00Z'),
    occurrenceMonth: new Date('2026-10-01T00:00:00Z'),
  };
  const tx = {
    recurringRule: {
      update: async (args: unknown) => { calls.ruleUpdate = args; },
      findUniqueOrThrow: async () => ({
        ...rule,
        versions: [
          ...rule.versions,
          { id: 'v2', effectiveFrom: new Date('2026-12-01T00:00:00Z'), amount: 1650, categoryId: 'cat-a', dayOfMonth: 10, category: null },
        ],
      }),
    },
    recurringRuleVersion: {
      deleteMany: async (args: unknown) => { calls.deleteMany = args; },
      upsert: async (args: unknown) => { calls.upserts.push(args); },
    },
    transaction: {
      findMany: async () => [variation],
      update: async (args: unknown) => { calls.txUpdates.push(args); },
    },
  };
  prisma.recurringRule.findFirst = (async () => rule) as unknown as typeof prisma.recurringRule.findFirst;
  prisma.$transaction = (async (fn: (t: typeof tx) => unknown) => fn(tx)) as unknown as typeof prisma.$transaction;

  const res = await recurringRoute.request('/rule-1', {
    method: 'PUT',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 1650, scope: 'from', effectiveFrom: '2026-12' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json() as { versions: { effectiveFrom: string; amount: number }[] };
  assert.deepEqual(body.versions.map((x) => [x.effectiveFrom, x.amount]), [['2026-01-01', 1500], ['2026-12-01', 1650]]);

  const upserted = calls.upserts.map((u) => {
    const { create } = u as { create: { effectiveFrom: Date; amount: number } };
    return [create.effectiveFrom.toISOString().slice(0, 10), create.amount];
  });
  assert.deepEqual(upserted, [['2026-01-01', 1500], ['2026-12-01', 1650]]);
  // A variação de outubro já está coerente: nada a atualizar.
  assert.equal(calls.txUpdates.length, 0);
});

test('PUT recusa effectiveFrom fora do formato YYYY-MM', async () => {
  const res = await recurringRoute.request('/rule-1', {
    method: 'PUT',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 1650, effectiveFrom: '12/2026' }),
  });
  assert.equal(res.status, 400);
});
