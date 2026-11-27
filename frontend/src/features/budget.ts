/**
 * Orçamento (PRODUCT_RULES + DefinirOrcamento.html):
 * - o orçamento do mês é a soma dos limites por categoria;
 * - orçamento variável = orçamento − recorrentes fixas de despesa do mês;
 * - limite da semana (decisão do dono, ver design/GAP.md): calculado na
 *   segunda-feira — (variável restante no início da semana ÷ dias restantes no
 *   mês) × dias da semana dentro do mês — e fixo até domingo. Semanas que
 *   cruzam a virada do mês são cortadas no limite do mês.
 */
import type { BudgetLimit } from "../types/FinanceTypes";
import { daysInMonth, parseDateKey, toDateKey } from "../lib/dates";
import { fromCents, toCents } from "../lib/money";
import type { LedgerEntry } from "./ledger";

const pad = (n: number) => String(n).padStart(2, "0");
export const monthKeyOf = (year: number, month: number) => `${year}-${pad(month + 1)}`;

/** Limite de uma categoria num mês: o do próprio mês ou o último repetido antes dele. */
export function limitForMonth(records: BudgetLimit[], categoryId: string | null, month: string): number | null {
  let found: BudgetLimit | undefined;
  for (const record of records) {
    if (record.categoryId !== categoryId) continue;
    if (record.month === month) return record.amount;
    if (record.month < month && record.repeat && (!found || record.month > found.month)) found = record;
  }
  return found ? found.amount : null;
}

/** Limites do mês (só categorias com limite, e o "Geral" com chave null) e o total. */
export function monthLimits(records: BudgetLimit[], categoryIds: string[], month: string) {
  const limits = new Map<string | null, number>();
  for (const id of [null, ...categoryIds]) {
    const limit = limitForMonth(records, id, month);
    if (limit !== null && limit > 0) limits.set(id, limit);
  }
  const total = fromCents([...limits.values()].reduce((sum, value) => sum + toCents(value), 0));
  return { limits, total };
}

const isVariableExpense = (entry: LedgerEntry) => entry.type === "expense" && entry.source !== "recurring";

const sumCents = (entries: LedgerEntry[]) => entries.reduce((sum, entry) => sum + toCents(entry.amount), 0);

/** Recorrentes fixas de despesa do mês inteiro (inclusive as que ainda vão cair). */
export const fixedExpenses = (entries: LedgerEntry[]) =>
  fromCents(sumCents(entries.filter((entry) => entry.type === "expense" && entry.source === "recurring")));

const daysBetween = (from: string, to: string) =>
  Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / 86_400_000) + 1;

export type Week = { start: string; end: string };

/** Semana (segunda a domingo) de `date`, cortada aos limites do mês. */
export function weekOf(date: string): Week {
  const day = parseDateKey(date);
  const monday = new Date(day);
  monday.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const first = new Date(day.getFullYear(), day.getMonth(), 1);
  const last = new Date(day.getFullYear(), day.getMonth() + 1, 0);
  return {
    start: toDateKey(monday < first ? first : monday),
    end: toDateKey(sunday > last ? last : sunday),
  };
}

/** Todas as semanas do mês, cortadas ao mês. */
export function weeksOfMonth(year: number, month: number): Week[] {
  const weeks: Week[] = [];
  let cursor = `${year}-${pad(month + 1)}-01`;
  const last = `${year}-${pad(month + 1)}-${pad(daysInMonth(year, month))}`;
  while (cursor <= last) {
    const week = weekOf(cursor);
    weeks.push(week);
    const next = parseDateKey(week.end);
    next.setDate(next.getDate() + 1);
    cursor = toDateKey(next);
  }
  return weeks;
}

export type WeekStatus = {
  week: Week;
  limit: number;
  spent: number;
  left: number;
  /** Quanto dá para gastar por dia até domingo (inclusive hoje). */
  perDay: number;
  ratio: number;
  state: "ok" | "atencao" | "passou";
  /** Gasto variável por dia da semana (segunda → domingo; null fora do mês). */
  days: Array<{ date: string; spent: number } | null>;
};

/** Limite e situação da semana `week` de um mês com orçamento variável `variable`. */
export function weekStatus(variable: number, entries: LedgerEntry[], week: Week, today: string): WeekStatus {
  const variableEntries = entries.filter(isVariableExpense);
  const monthEnd = (() => {
    const d = parseDateKey(week.start);
    return toDateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  })();
  const spentBefore = sumCents(variableEntries.filter((entry) => entry.date < week.start));
  const remaining = Math.max(0, toCents(variable) - spentBefore);
  const limitCents = Math.round((remaining / daysBetween(week.start, monthEnd)) * daysBetween(week.start, week.end));
  const inWeek = variableEntries.filter((entry) => entry.date >= week.start && entry.date <= week.end && entry.date <= today);
  const spentCents = sumCents(inWeek);
  const leftCents = limitCents - spentCents;
  const from = today < week.start ? week.start : today;
  const daysLeft = from > week.end ? 0 : daysBetween(from, week.end);
  const ratio = limitCents > 0 ? spentCents / limitCents : spentCents > 0 ? Infinity : 0;

  const monday = parseDateKey(week.start);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = toDateKey(d);
    if (key < week.start || key > week.end) return null;
    return { date: key, spent: fromCents(sumCents(inWeek.filter((entry) => entry.date === key))) };
  });

  return {
    week,
    limit: fromCents(limitCents),
    spent: fromCents(spentCents),
    left: fromCents(leftCents),
    perDay: daysLeft > 0 ? fromCents(Math.max(0, Math.floor(leftCents / daysLeft))) : 0,
    ratio,
    state: ratio > 1 ? "passou" : ratio >= 0.8 ? "atencao" : "ok",
    days,
  };
}

export type BurnPoint = { x: string; label: string; real: number | null; ideal: number; projection: number | null };

/**
 * Burndown do orçamento variável num período: restante ao fim de cada dia
 * (real, até hoje), linha ideal reta até zero e projeção no ritmo atual.
 */
export function burndown(budget: number, entries: LedgerEntry[], start: string, end: string, today: string, startSpent = 0): BurnPoint[] {
  const variableEntries = entries.filter(isVariableExpense);
  const total = daysBetween(start, end);
  const elapsed = today < start ? 0 : today > end ? total : daysBetween(start, today);
  let cumulative = toCents(startSpent);
  const points: BurnPoint[] = [];
  const spentToday = (key: string) => sumCents(variableEntries.filter((entry) => entry.date === key));
  const budgetCents = toCents(budget);
  let realToday = budgetCents - cumulative;
  for (let i = 0; i < total; i += 1) {
    const d = parseDateKey(start);
    d.setDate(d.getDate() + i);
    const key = toDateKey(d);
    const ideal = fromCents(Math.round(budgetCents * (1 - (i + 1) / total)));
    let real: number | null = null;
    if (i < elapsed) {
      cumulative += spentToday(key);
      real = fromCents(budgetCents - cumulative);
      realToday = budgetCents - cumulative;
    }
    points.push({ x: key, label: String(d.getDate()), real, ideal, projection: null });
  }
  if (elapsed > 0 && elapsed < total) {
    const pace = (budgetCents - realToday - toCents(startSpent)) / elapsed;
    for (let i = elapsed - 1; i < total; i += 1) points[i].projection = fromCents(Math.round(realToday - pace * (i - (elapsed - 1))));
  }
  return points;
}
