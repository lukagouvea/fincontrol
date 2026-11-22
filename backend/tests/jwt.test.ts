import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getJwtSecret } from '../src/lib/jwt.js';

const previousSecret = process.env.JWT_SECRET;

afterEach(() => {
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

test('getJwtSecret falha sem JWT_SECRET, em vez de usar um segredo padrão', () => {
  delete process.env.JWT_SECRET;
  assert.throws(() => getJwtSecret(), /JWT_SECRET não definido/);

  process.env.JWT_SECRET = '';
  assert.throws(() => getJwtSecret(), /JWT_SECRET não definido/);
});

test('getJwtSecret retorna o segredo configurado', () => {
  process.env.JWT_SECRET = 'configured-secret';
  assert.equal(getJwtSecret(), 'configured-secret');
});
