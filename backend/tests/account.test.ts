import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { hash } from 'bcryptjs';
import accountRoute from '../src/routes/account.js';
import { prisma } from '../src/lib/prisma.js';

const secret = 'fincontrol-account-test-only';
const previousSecret = process.env.JWT_SECRET;
const userId = 'account-user';
let cookie = '';
let passwordHash = '';
before(async () => {
  process.env.JWT_SECRET = secret;
  cookie = 'auth_token=' + (await sign({ id: userId, exp: Math.floor(Date.now() / 1000) + 3600 }, secret, 'HS256'));
  passwordHash = await hash('senha-certa', 4);
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
app.route('/me', accountRoute);
const send = (path: string, method: string, body?: unknown) =>
  app.request(path, { method, headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

test('exporta CSV em pt-BR e neutraliza fórmulas', async () => {
  mock(prisma.transaction, 'findMany', (async () => [
    { date: new Date('2026-11-08T03:00:00Z'), description: 'Mercado; Centro', type: 'expense', amount: 142.3, category: { name: 'Alimentação' }, card: { name: 'Aurora' }, installmentNumber: null, installmentGroup: null },
    { date: new Date('2026-11-05T03:00:00Z'), description: '=HYPERLINK("x")', type: 'income', amount: 7200, category: null, card: null, installmentNumber: 2, installmentGroup: { totalInstallments: 10 } },
  ]) as AnyFn);
  const response = await send('/me/export.csv', 'GET');
  assert.equal(response.headers.get('content-type'), 'text/csv; charset=utf-8');
  assert.match(response.headers.get('content-disposition') ?? '', /attachment; filename="fincontrol-transacoes-/);
  const lines = (await response.text()).replace(/^﻿/, '').trim().split('\r\n');
  assert.deepEqual(lines, [
    'Data;Descrição;Tipo;Valor;Categoria;Pago com;Parcela',
    '2026-11-08;"Mercado; Centro";Despesa;142,30;Alimentação;Aurora;',
    `2026-11-05;"'=HYPERLINK(""x"")";Receita;7200,00;;À vista;2/10`,
  ]);
});

test('apagar todos os dados exige digitar APAGAR e mantém conta, categorias e cartões', async () => {
  const deleted: string[] = [];
  for (const model of ['transaction', 'installmentGroup', 'recurringRule', 'invoicePayment', 'budgetLimit', 'goal', 'importBatch'] as const) {
    mock(prisma[model] as unknown as Record<string, AnyFn>, 'deleteMany', (async () => (deleted.push(model), { count: 1 })) as AnyFn);
  }
  mock(prisma, '$transaction', (async (ops: Promise<unknown>[]) => Promise.all(ops)) as AnyFn);
  assert.equal((await send('/me/wipe', 'POST', { confirm: 'apagar' })).status, 400);
  assert.deepEqual(deleted, []);
  assert.equal((await send('/me/wipe', 'POST', { confirm: 'APAGAR' })).status, 200);
  assert.ok(!deleted.includes('category') && !deleted.includes('card'));
  assert.equal(deleted.length, 7);
});

test('excluir a conta pede a senha certa e encerra a sessão', async () => {
  mock(prisma.user, 'findUnique', (async () => ({ passwordHash })) as AnyFn);
  let removed = false;
  mock(prisma.user, 'delete', (async () => ((removed = true), {})) as AnyFn);
  assert.equal((await send('/me', 'DELETE', { password: 'errada' })).status, 403);
  assert.equal(removed, false);
  const response = await send('/me', 'DELETE', { password: 'senha-certa' });
  assert.equal(response.status, 200);
  assert.equal(removed, true);
  assert.match(response.headers.get('set-cookie') ?? '', /auth_token=;/);
});

test('preferências de alerta mesclam com as salvas e recusam chaves desconhecidas', async () => {
  mock(prisma.user, 'findUnique', (async () => ({ alertPrefs: { recorrencia: false } })) as AnyFn);
  let saved: unknown;
  mock(prisma.user, 'update', (async (args: { data: { alertPrefs: unknown } }) => ((saved = args.data.alertPrefs), {})) as AnyFn);
  assert.equal((await send('/me/alerts/preferences', 'PUT', { semana: false })).status, 200);
  assert.deepEqual(saved, { recorrencia: false, semana: false });
  assert.equal((await send('/me/alerts/preferences', 'PUT', { outra: true })).status, 400);
});
