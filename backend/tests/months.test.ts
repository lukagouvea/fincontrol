import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import monthsRoute from '../src/routes/months.js';
import { prisma } from '../src/lib/prisma.js';

const secret = 'fincontrol-months-test-only';
const previousSecret = process.env.JWT_SECRET;
let cookie = '';
before(async () => {
  process.env.JWT_SECRET = secret;
  cookie = 'auth_token=' + (await sign({ id: 'm-user', exp: Math.floor(Date.now() / 1000) + 3600 }, secret, 'HS256'));
});
after(() => {
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});
const originalFind = prisma.user.findUnique;
const originalUpdate = prisma.user.update;
afterEach(() => {
  prisma.user.findUnique = originalFind;
  prisma.user.update = originalUpdate;
});

const app = new Hono();
app.route('/months', monthsRoute);
const seen = (month: string) => app.request(`/months/${month}/seen`, { method: 'POST', headers: { Cookie: cookie } });

test('marca a virada como vista e nunca volta para um mês anterior', async () => {
  let stored: string | null = '2026-10';
  prisma.user.findUnique = (async () => ({ lastClosingSeen: stored })) as unknown as typeof prisma.user.findUnique;
  prisma.user.update = (async (args: { data: { lastClosingSeen: string } }) => {
    stored = args.data.lastClosingSeen;
    return { lastClosingSeen: stored };
  }) as unknown as typeof prisma.user.update;
  assert.deepEqual(await (await seen('2026-09')).json(), { lastClosingSeen: '2026-10' });
  assert.deepEqual(await (await seen('2026-11')).json(), { lastClosingSeen: '2026-11' });
  assert.equal((await seen('2026-13')).status, 400);
});
