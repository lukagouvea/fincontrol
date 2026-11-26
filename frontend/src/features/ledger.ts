/**
 * Livro do mês: junta transações avulsas, parcelas e recorrentes projetadas
 * (com a versão vigente e a variação do mês) numa lista única. É a base de
 * Início, Transações e Relatórios.
 *
 * Recorrentes não são gravadas no banco; a ocorrência do mês é derivada da
 * regra (ver utils/financeUtils.resolveFixedItemForMonth). Uma "variação" é uma
 * transação com recurringRuleId que muda o valor daquele mês — ela não aparece
 * como transação avulsa, só altera o valor da ocorrência.
 */
import type {
  FixedTransaction,
  MonthlyVariation,
  Transaction,
} from "../types/FinanceTypes";
import { resolveFixedItemForMonth } from "../utils/financeUtils";
import { isoToDateKey } from "../lib/dates";
import { fromCents, toCents } from "../lib/money";

export type EntryType = "income" | "expense";

export type LedgerEntry = {
  /** Chave estável: "tx:<id>" ou "rec:<regra>:<AAAA-MM>". */
  key: string;
  source: "transaction" | "recurring";
  /** Id da transação ou da regra recorrente. */
  id: string;
  type: EntryType;
  description: string;
  amount: number;
  categoryId: string | null;
  /** 'YYYY-MM-DD' local. */
  date: string;
  /** Data ainda não chegou (recorrente prevista ou lançamento futuro). */
  upcoming: boolean;
  installment?: { current: number; total: number; groupId: string | null };
  /** Cartão usado; null = À vista. */
  cardId: string | null;
  recurring?: { ruleId: string; day: number; hasVariation: boolean; variationId?: string };
};

type ApiTransaction = Transaction & {
  recurringRuleId?: string | null;
  installmentGroupId?: string | null;
  installmentInfo?: { current: number; total: number } | null;
};

export type LedgerInput = {
  year: number;
  /** 0–11 */
  month: number;
  transactions: Transaction[];
  fixedIncomes: FixedTransaction[];
  fixedExpenses: FixedTransaction[];
  variations: MonthlyVariation[];
  /** 'YYYY-MM-DD' de hoje (injetável para testes). */
  today: string;
};

const pad = (value: number) => String(value).padStart(2, "0");

export function buildMonthLedger(input: LedgerInput): LedgerEntry[] {
  const { year, month, today } = input;
  const monthKey = `${year}-${pad(month + 1)}`;
  const entries: LedgerEntry[] = [];

  for (const raw of input.transactions as ApiTransaction[]) {
    if (raw.recurringRuleId) continue; // variação de recorrente
    const date = isoToDateKey(raw.date);
    if (!date.startsWith(monthKey)) continue;
    const info = raw.installmentInfo;
    entries.push({
      key: `tx:${raw.id}`,
      source: "transaction",
      id: raw.id,
      type: raw.type,
      description: raw.description,
      amount: Number(raw.amount),
      categoryId: raw.categoryId || null,
      date,
      upcoming: date > today,
      cardId: raw.cardId ?? null,
      installment: info?.total
        ? { current: info.current, total: info.total, groupId: raw.installmentGroupId ?? null }
        : undefined,
    });
  }

  const variationTransactions = (input.transactions as ApiTransaction[]).filter(
    (t) => t.recurringRuleId,
  );

  const addRecurring = (items: FixedTransaction[], type: EntryType) => {
    for (const item of items) {
      const resolved = resolveFixedItemForMonth(item, type, year, month, input.variations);
      if (!resolved) continue;
      const date = `${monthKey}-${pad(resolved.occurrenceDay)}`;
      const variation = variationTransactions.find(
        (t) => t.recurringRuleId === item.id && isoToDateKey(t.date).startsWith(monthKey),
      );
      entries.push({
        key: `rec:${item.id}:${monthKey}`,
        source: "recurring",
        id: item.id,
        type,
        description: item.description,
        amount: Number(resolved.actualAmount),
        categoryId: resolved.categoryId,
        date,
        upcoming: date > today,
        cardId: item.cardId ?? null,
        recurring: {
          ruleId: item.id,
          day: resolved.day,
          hasVariation: resolved.hasVariation,
          variationId: variation?.id,
        },
      });
    }
  };
  addRecurring(input.fixedIncomes, "income");
  addRecurring(input.fixedExpenses, "expense");

  return entries.sort((a, b) =>
    a.date === b.date ? a.description.localeCompare(b.description, "pt-BR") : a.date < b.date ? 1 : -1,
  );
}

export type CategoryTotal = { categoryId: string | null; total: number; count: number };

export type LedgerSummary = {
  income: number;
  expense: number;
  balance: number;
  /** Despesas recorrentes (fixas) e o resto. */
  fixedExpense: number;
  variableExpense: number;
  expenseByCategory: CategoryTotal[];
  incomeByCategory: CategoryTotal[];
};

const byCategory = (entries: LedgerEntry[]): CategoryTotal[] => {
  const map = new Map<string | null, { cents: number; count: number }>();
  for (const entry of entries) {
    const current = map.get(entry.categoryId) ?? { cents: 0, count: 0 };
    current.cents += toCents(entry.amount);
    current.count += 1;
    map.set(entry.categoryId, current);
  }
  return [...map.entries()]
    .map(([categoryId, value]) => ({ categoryId, total: fromCents(value.cents), count: value.count }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
};

const sum = (entries: LedgerEntry[]) =>
  fromCents(entries.reduce((total, entry) => total + toCents(entry.amount), 0));

/**
 * Totais do mês. Por padrão conta tudo (o mês inteiro, inclusive o previsto);
 * `untilToday` deixa de fora o que ainda não aconteceu.
 */
export function summarizeLedger(entries: LedgerEntry[], { untilToday = false } = {}): LedgerSummary {
  const counted = untilToday ? entries.filter((entry) => !entry.upcoming) : entries;
  const expenses = counted.filter((entry) => entry.type === "expense");
  const incomes = counted.filter((entry) => entry.type === "income");
  const income = sum(incomes);
  const expense = sum(expenses);
  return {
    income,
    expense,
    balance: fromCents(toCents(income) - toCents(expense)),
    fixedExpense: sum(expenses.filter((entry) => entry.source === "recurring")),
    variableExpense: sum(expenses.filter((entry) => entry.source !== "recurring")),
    expenseByCategory: byCategory(expenses),
    incomeByCategory: byCategory(incomes),
  };
}
