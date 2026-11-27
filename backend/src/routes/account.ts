import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { compare } from 'bcryptjs';
import { clearAuthCookie } from '../lib/authCookie.js';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const app = new Hono<{ Variables: { userId: string } }>();
app.use('/*', authMiddleware);

export const ALERT_KEYS = ['semana', 'categorias', 'faturaFechando', 'vencimento', 'recorrencia', 'resumoSemanal'] as const;

const prefsSchema = z.object(Object.fromEntries(ALERT_KEYS.map((key) => [key, z.boolean().optional()])) as Record<(typeof ALERT_KEYS)[number], z.ZodOptional<z.ZodBoolean>>).strict();

// Preferências da central de alertas (mescla com as salvas).
app.put('/alerts/preferences', zValidator('json', prefsSchema), async (c) => {
  const userId = c.var.userId;
  const current = await prisma.user.findUnique({ where: { id: userId }, select: { alertPrefs: true } });
  if (!current) return c.json({ error: 'Usuário não encontrado' }, 404);
  const alertPrefs = { ...((current.alertPrefs as Record<string, boolean> | null) ?? {}), ...c.req.valid('json') };
  await prisma.user.update({ where: { id: userId }, data: { alertPrefs } });
  return c.json({ alertPrefs });
});

// Marca os alertas como vistos agora.
app.post('/alerts/read', async (c) => {
  const user = await prisma.user.update({ where: { id: c.var.userId }, data: { alertsReadAt: new Date() }, select: { alertsReadAt: true } });
  return c.json({ alertsReadAt: user.alertsReadAt?.toISOString() });
});

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  // Evita fórmula em planilhas (=, +, -, @) e escapa aspas.
  const safe = /^[=+\-@]/.test(text) && !/^-?\d/.test(text) ? `'${text}` : text;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

// Exportar meus dados: todas as transações em CSV (separador ";" e vírgula
// decimal, que o Excel em pt-BR abre direto).
app.get('/export.csv', async (c) => {
  const rows = await prisma.transaction.findMany({
    where: { userId: c.var.userId },
    include: { category: { select: { name: true } }, card: { select: { name: true } }, installmentGroup: { select: { totalInstallments: true } } },
    orderBy: { date: 'asc' },
  });
  const header = ['Data', 'Descrição', 'Tipo', 'Valor', 'Categoria', 'Pago com', 'Parcela'];
  const lines = rows.map((t) =>
    [
      t.date.toISOString().slice(0, 10),
      t.description,
      t.type === 'income' ? 'Receita' : 'Despesa',
      Number(t.amount).toFixed(2).replace('.', ','),
      t.category?.name ?? '',
      t.card?.name ?? 'À vista',
      t.installmentNumber && t.installmentGroup ? `${t.installmentNumber}/${t.installmentGroup.totalInstallments}` : '',
    ]
      .map(csvCell)
      .join(';'),
  );
  const csv = '﻿' + [header.join(';'), ...lines].join('\r\n') + '\r\n';
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="fincontrol-transacoes-${new Date().toISOString().slice(0, 10)}.csv"`);
  return c.body(csv);
});

// Apagar todos os dados: mantém conta, categorias e cartões (vazios).
app.post('/wipe', zValidator('json', z.object({ confirm: z.literal('APAGAR') })), async (c) => {
  const userId = c.var.userId;
  await prisma.$transaction([
    prisma.transaction.deleteMany({ where: { userId } }),
    prisma.installmentGroup.deleteMany({ where: { userId } }),
    prisma.recurringRule.deleteMany({ where: { userId } }),
    prisma.invoicePayment.deleteMany({ where: { userId } }),
    prisma.budgetLimit.deleteMany({ where: { userId } }),
    prisma.goal.deleteMany({ where: { userId } }),
    prisma.importBatch.deleteMany({ where: { userId } }),
  ]);
  return c.json({ wiped: true });
});

// Excluir minha conta: pede a senha; apaga tudo em cascata e encerra a sessão.
app.delete('/', zValidator('json', z.object({ password: z.string().min(1) })), async (c) => {
  const userId = c.var.userId;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) return c.json({ error: 'Usuário não encontrado' }, 404);
  if (!(await compare(c.req.valid('json').password, user.passwordHash))) return c.json({ error: 'Senha incorreta' }, 403);
  await prisma.user.delete({ where: { id: userId } });
  clearAuthCookie(c);
  return c.json({ deleted: true });
});

export default app;
