import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { isOwnCard } from '../lib/cards.js';
import { CATEGORY_NOT_FOUND, isOwnCategory } from '../lib/categories.js';
import {
  type Version,
  dateOfMonthIndex,
  formatMonthKey,
  monthIndex,
  monthIndexOfDate,
  occurrenceDate,
  parseMonthKey,
  planVersions,
  versionForMonth,
} from '../lib/recurrence.js';

const app = new Hono<{ Variables: { userId: string } }>();

app.use('/*', authMiddleware);

// --- SCHEMAS DE VALIDAÇÃO ---

const recurringSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.number().positive("O valor deve ser positivo"),
  type: z.enum(['income', 'expense']),
  day: z.number().min(1).max(31), // Front manda 'day'
  categoryId: z.uuid().optional().or(z.literal('')), // Pode vir vazio
  startDate: z.iso.datetime(), // Front manda ISO
  endDate: z.iso.datetime().optional().or(z.literal('')).nullable(), // Pode vir vazio
  // Forma de pagamento da regra inteira (não versionada). null = À vista.
  cardId: z.uuid().nullable().optional(),
});

const updateSchema = recurringSchema.partial().extend({
  // 'from': valor/categoria/dia valem a partir de `effectiveFrom`.
  // 'all': corrige todo o histórico.
  scope: z.enum(['from', 'all']).default('from'),
  effectiveFrom: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM').optional(),
});

const variationSchema = z.object({
  year: z.number(),
  month: z.number().min(0).max(11), // 0-11
  amount: z.number(),
  type: z.enum(['income', 'expense']),
});

// --- HELPERS ---

type DbVersion = {
  id: string;
  effectiveFrom: Date;
  amount: unknown;
  categoryId: string | null;
  dayOfMonth: number;
  category?: { id: string; name: string; color: string | null } | null;
};

type RuleWithVersions = {
  id: string;
  description: string;
  type: string;
  amount: unknown;
  categoryId: string | null;
  dayOfMonth: number;
  startDate: Date;
  endDate: Date | null;
  cardId: string | null;
  versions: DbVersion[];
  category?: { id: string; name: string; color: string | null } | null;
};

const toVersion = (v: DbVersion): Version & { id?: string; category?: DbVersion['category'] } => ({
  id: v.id,
  effectiveFrom: monthIndexOfDate(v.effectiveFrom),
  amount: Number(v.amount),
  categoryId: v.categoryId,
  dayOfMonth: v.dayOfMonth,
  category: v.category,
});

/** Versões da regra; regras sem versão (criadas antes da migração) usam as colunas da regra. */
const versionsOf = (rule: RuleWithVersions) =>
  rule.versions.length
    ? rule.versions.map(toVersion)
    : [{
        effectiveFrom: monthIndexOfDate(rule.startDate),
        amount: Number(rule.amount),
        categoryId: rule.categoryId,
        dayOfMonth: rule.dayOfMonth,
        category: rule.category,
      }];

const currentMonthIndex = () => monthIndexOfDate(new Date());

/** Mês de referência para os campos de topo: o atual, ou o último mês de uma regra encerrada. */
const referenceMonth = (rule: { endDate: Date | null }) => {
  const now = currentMonthIndex();
  return rule.endDate ? Math.min(now, monthIndexOfDate(rule.endDate)) : now;
};

const versionInclude = {
  orderBy: { effectiveFrom: 'asc' as const },
  include: { category: { select: { id: true, name: true, color: true } } },
};

// ADAPTER: Converte do formato do Banco para o formato do Front.
// amount/day/categoryId de topo são os da versão vigente no mês de referência.
const formatRule = (rule: RuleWithVersions) => {
  const versions = versionsOf(rule);
  const current = versionForMonth(versions, referenceMonth(rule));
  return {
    id: rule.id,
    description: rule.description,
    amount: current.amount,
    type: rule.type,
    day: current.dayOfMonth, // Banco (day_of_month) -> Front (day)
    startDate: rule.startDate.toISOString(),
    endDate: rule.endDate?.toISOString(),
    cardId: rule.cardId,
    categoryId: current.categoryId,
    category: current.category ?? null,
    versions: versions.map((v) => ({
      id: v.id,
      effectiveFrom: formatMonthKey(v.effectiveFrom) + '-01',
      amount: v.amount,
      categoryId: v.categoryId,
      day: v.dayOfMonth,
    })),
  };
};

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Substitui as versões da regra pela lista desejada. */
async function writeVersions(tx: Tx, ruleId: string, desired: Version[]) {
  await tx.recurringRuleVersion.deleteMany({
    where: {
      ruleId,
      effectiveFrom: { notIn: desired.map((v) => dateOfMonthIndex(v.effectiveFrom)) },
    },
  });
  for (const v of desired) {
    const values = {
      amount: v.amount,
      categoryId: v.categoryId,
      dayOfMonth: v.dayOfMonth,
    };
    await tx.recurringRuleVersion.upsert({
      where: {
        ruleId_effectiveFrom: { ruleId, effectiveFrom: dateOfMonthIndex(v.effectiveFrom) },
      },
      update: values,
      create: { ruleId, effectiveFrom: dateOfMonthIndex(v.effectiveFrom), ...values },
    });
  }
}

/**
 * Mantém as transações de variação coerentes com as versões: data (dia da
 * versão do mês), categoria e descrição.
 */
async function syncVariations(
  tx: Tx,
  ruleId: string,
  description: string,
  versions: Version[],
) {
  const variations = await tx.transaction.findMany({ where: { recurringRuleId: ruleId } });
  for (const t of variations) {
    const index = monthIndexOfDate(t.occurrenceMonth ?? t.date);
    const version = versionForMonth(versions, index);
    const date = occurrenceDate(index, version.dayOfMonth);
    const occurrenceMonth = dateOfMonthIndex(index);
    if (
      t.date.getTime() === date.getTime() &&
      t.categoryId === version.categoryId &&
      t.description === description &&
      t.occurrenceMonth?.getTime() === occurrenceMonth.getTime()
    ) continue;
    await tx.transaction.update({
      where: { id: t.id },
      data: { date, categoryId: version.categoryId, description, occurrenceMonth },
    });
  }
}

// --- ROTAS ---

// 1. LISTAR REGRAS (GET /recurring?type=expense)
app.get('/', async (c) => {
  const userId = c.var.userId;
  const type = c.req.query('type'); // 'income' ou 'expense'

  try {
    const rules = await prisma.recurringRule.findMany({
      where: {
        userId: userId,
        active: true, // Só traz as ativas
        ...(type && { type: type as 'income' | 'expense' })
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        versions: versionInclude,
      },
      orderBy: {
        dayOfMonth: 'asc'
      }
    });

    return c.json(rules.map(formatRule));

  } catch (error) {
    console.error(error);
    return c.json({ error: 'Erro ao buscar regras recorrentes' }, 500);
  }
});

// 2. LISTAR VARIAÇÕES (ADAPTER)
// O front pede "MonthlyVariations". Nós buscamos "Transações com recurring_rule_id" e convertemos.
app.get('/variations', async (c) => {
  const userId = c.var.userId;

  try {
    const variationTransactions = await prisma.transaction.findMany({
      where: {
        userId: userId,
        // Filtra transações que têm recurring_rule_id (ou seja, vieram de regras fixas)
        recurringRuleId: { not: null }
      }
    });

    const formattedVariations = variationTransactions.map(t => {
      // O mês vem de occurrence_month (UTC), não do fuso do servidor.
      const date = t.occurrenceMonth ?? t.date;
      return {
        id: t.id, // ID da transação
        fixedItemId: t.recurringRuleId, // ID da regra pai
        type: t.type,
        amount: Number(t.amount),
        year: date.getUTCFullYear(),
        month: date.getUTCMonth(), // JS Month (0-11)
      };
    });

    return c.json(formattedVariations);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Erro ao buscar variações' }, 500);
  }
});

// 3. CRIAR/ATUALIZAR VARIAÇÃO (POST /recurring/:id/variation)
app.post('/:id/variation', zValidator('json', variationSchema), async (c) => {
  const userId = c.var.userId;
  const ruleId = c.req.param('id');
  const body = c.req.valid('json');

  try {
    const rule = await prisma.recurringRule.findFirst({
      where: { id: ruleId, userId: userId },
      include: { versions: versionInclude },
    });

    if (!rule) return c.json({ error: 'Regra não encontrada' }, 404);

    // A variação é identificada pelo mês da ocorrência; dia e categoria vêm
    // da versão vigente naquele mês.
    const index = monthIndex(body.year, body.month);
    const version = versionForMonth(versionsOf(rule), index);
    const occurrenceMonth = dateOfMonthIndex(index);
    const data = {
      amount: body.amount,
      date: occurrenceDate(index, version.dayOfMonth),
      categoryId: version.categoryId,
      description: rule.description,
    };

    const existingTransaction = await prisma.transaction.findFirst({
      where: { recurringRuleId: ruleId, occurrenceMonth },
    });

    if (existingTransaction) {
      await prisma.transaction.update({
        where: { id: existingTransaction.id },
        data,
      });
      return c.json({ message: 'Variação atualizada' });
    }

    await prisma.transaction.create({
      data: {
        ...data,
        userId: userId,
        type: rule.type,
        recurringRuleId: rule.id,
        occurrenceMonth,
      }
    });
    return c.json({ message: 'Variação criada' });
  } catch (error) {
    console.error("Erro ao criar variação:", error);
    return c.json({ error: 'Erro ao processar variação' }, 500);
  }
});

// 4. CRIAR REGRA (POST /recurring)
app.post('/', zValidator('json', recurringSchema), async (c) => {
  const userId = c.var.userId;
  const body = c.req.valid('json');
  const startDate = new Date(body.startDate);
  const categoryId = body.categoryId || null;
  if (!(await isOwnCard(userId, body.cardId))) return c.json({ error: 'Cartão não encontrado' }, 404);
  if (!(await isOwnCategory(userId, categoryId, body.type))) return c.json(CATEGORY_NOT_FOUND, 404);

  try {
    const rule = await prisma.recurringRule.create({
      data: {
        userId: userId,
        description: body.description,
        amount: body.amount,
        type: body.type,
        dayOfMonth: body.day, // Front (day) -> Banco (day_of_month)
        startDate,
        endDate: body.endDate ? new Date(body.endDate) : null,
        categoryId,
        cardId: body.cardId ?? null,
        versions: {
          create: {
            effectiveFrom: dateOfMonthIndex(monthIndexOfDate(startDate)),
            amount: body.amount,
            categoryId,
            dayOfMonth: body.day,
          },
        },
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        versions: versionInclude,
      },
    });

    return c.json(formatRule(rule), 201);

  } catch (error) {
    console.error(error);
    return c.json({ error: 'Erro ao criar regra recorrente' }, 500);
  }
});

// 5. ATUALIZAR REGRA (PUT /recurring/:id)
// Descrição, início e fim são globais. Valor, categoria e dia são versionados:
// com scope 'from' valem a partir de `effectiveFrom` (padrão: mês atual);
// com scope 'all' corrigem todo o histórico.
app.put('/:id', zValidator('json', updateSchema), async (c) => {
  const userId = c.var.userId;
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const existing = await prisma.recurringRule.findFirst({
    where: { id, userId: userId },
    include: { category: { select: { id: true, name: true, color: true } }, versions: versionInclude },
  });

  if (!existing) return c.json({ error: 'Regra não encontrada' }, 404);
  if (!(await isOwnCard(userId, body.cardId))) return c.json({ error: 'Cartão não encontrado' }, 404);
  if (!(await isOwnCategory(userId, body.categoryId, existing.type))) return c.json(CATEGORY_NOT_FOUND, 404);

  const startDate = body.startDate ? new Date(body.startDate) : existing.startDate;
  const endDate = body.endDate
    ? new Date(body.endDate)
    : body.endDate === null || body.endDate === ''
      ? null
      : existing.endDate;
  const description = body.description ?? existing.description;

  const versions = planVersions(
    versionsOf(existing),
    {
      amount: body.amount,
      categoryId: body.categoryId === '' ? null : body.categoryId,
      dayOfMonth: body.day,
    },
    body.scope,
    body.effectiveFrom ? parseMonthKey(body.effectiveFrom) : currentMonthIndex(),
    monthIndexOfDate(startDate),
  );
  // Colunas da regra espelham a versão vigente hoje (compatibilidade com rollback).
  const current = versionForMonth(versions, currentMonthIndex());

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.recurringRule.update({
        where: { id },
        data: {
          description,
          startDate,
          endDate,
          cardId: body.cardId,
          amount: current.amount,
          categoryId: current.categoryId,
          dayOfMonth: current.dayOfMonth,
        },
      });
      await writeVersions(tx, id, versions);
      await syncVariations(tx, id, description, versions);
      return tx.recurringRule.findUniqueOrThrow({
        where: { id },
        include: { category: { select: { id: true, name: true, color: true } }, versions: versionInclude },
      });
    });

    return c.json(formatRule(updated));

  } catch (error) {
    console.error(error);
    return c.json({ error: 'Erro ao atualizar regra' }, 500);
  }
});

// 6. DELETAR / ARQUIVAR (DELETE /recurring/:id)
// Implementamos Soft Delete: define active=false e endDate=hoje
app.delete('/:id', async (c) => {
  const userId = c.var.userId;
  const id = c.req.param('id');

  const existing = await prisma.recurringRule.findFirst({
    where: { id, userId: userId }
  });

  if (!existing) return c.json({ error: 'Regra não encontrada' }, 404);

  try {
    await prisma.recurringRule.update({
      where: { id },
      data: {
        endDate: new Date() // Encerra a vigência hoje
      }
    });

    return c.json({ message: 'Regra arquivada com sucesso' });

  } catch (error) {
    return c.json({ error: 'Erro ao excluir regra' }, 500);
  }
});

export default app;
