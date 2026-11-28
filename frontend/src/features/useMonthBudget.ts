import { useMemo } from "react";
import { useBudgetLimits } from "../hooks/useBudget";
import { useCategories } from "../hooks/useCategories";
import { fromMonthIndex, monthIndex } from "../lib/dates";
import { fromCents, toCents } from "../lib/money";
import { burndown, fixedExpenses, monthKeyOf, monthLimits, monthVariableTotal, paceReference, weekOf, weekStatus, weeksOfMonth, type WeekStatus } from "./budget";
import { summarizeLedger, type LedgerEntry } from "./ledger";
import { todayKey, useLedgerMonths } from "./useLedger";
import { monthSamples } from "./forecast";

/** Meses anteriores usados como histórico (estimativa e "mês típico"). */
const HISTORY_MONTHS = 3;

/** categoryId null = "Geral": cobre os gastos das categorias sem limite próprio. */
export type CategoryBudget = { categoryId: string | null; limit: number | null; spent: number };

/**
 * Orçamento de um mês a partir do livro já carregado: total (soma dos
 * limites), restante, variável, limites por categoria, semana e ritmo
 * (burndown com referência em cascata, ver `paceReference`).
 */
export function useMonthBudget(month: number, year: number, entries: LedgerEntry[], ready: boolean) {
  const limitsQuery = useBudgetLimits();
  const categoriesQuery = useCategories();
  const isLoading = limitsQuery.isPending || categoriesQuery.isPending || !ready;
  const isError = limitsQuery.isError || categoriesQuery.isError;
  // Histórico dos meses anteriores ao exibido: amostras da estimativa e "mês
  // típico" dos gráficos de ritmo. Não trava a tela: enquanto carrega, a
  // estimativa usa só o mês e a referência pode ainda não existir.
  const historyMonths = useMemo(
    () => Array.from({ length: HISTORY_MONTHS }, (_, i) => fromMonthIndex(monthIndex(year, month) - 1 - i)),
    [month, year],
  );
  const historyLedger = useLedgerMonths(historyMonths);
  const { history, typicalMonths } = useMemo(() => {
    if (historyLedger.isLoading || historyLedger.isError) return { history: [], typicalMonths: [] };
    return {
      history: historyMonths.flatMap(({ month: m, year: y }) => monthSamples(historyLedger.entries, y, m)),
      typicalMonths: historyMonths.map(({ month: m, year: y }) => monthVariableTotal(historyLedger.entries, monthKeyOf(y, m))),
    };
  }, [historyLedger.isLoading, historyLedger.isError, historyLedger.entries, historyMonths]);

  const data = useMemo(() => {
    if (isLoading || isError) return null;
    const key = monthKeyOf(year, month);
    const today = todayKey();
    const expenseCategories = (categoriesQuery.data ?? []).filter((category) => category.type === "expense");
    // Categoria arquivada (ou origem de uma mesclagem) não entra no orçamento;
    // o limite dela continua salvo e volta se a categoria for restaurada.
    const budgeted = expenseCategories.filter((category) => category.active !== false).map((category) => category.id);
    const { limits, total } = monthLimits(limitsQuery.data ?? [], budgeted, key);
    const summary = summarizeLedger(entries, { untilToday: true });
    const spentByCategory = new Map(summary.expenseByCategory.map((item) => [item.categoryId, item.total]));
    const byCategory: CategoryBudget[] = expenseCategories
      .filter((category) => category.active !== false || limits.has(category.id) || spentByCategory.has(category.id))
      .map((category) => ({ categoryId: category.id, limit: limits.get(category.id) ?? null, spent: spentByCategory.get(category.id) ?? 0 }));
    const general = limits.get(null);
    const unlimitedSpent = fromCents(
      [...spentByCategory.entries()].filter(([id]) => !id || !limits.has(id)).reduce((sum, [, value]) => sum + toCents(value), 0),
    );
    const categories: CategoryBudget[] = general ? [{ categoryId: null, limit: general, spent: unlimitedSpent }, ...byCategory] : byCategory;
    const spent = summary.expense;
    const fixed = fixedExpenses(entries);
    const variable = fromCents(Math.max(0, toCents(total) - toCents(fixed)));
    const monthStart = `${key}-01`;
    const monthEnd = weeksOfMonth(year, month).at(-1)!.end;
    const inMonth = today >= monthStart && today <= monthEnd;
    const reference = inMonth ? today : today < monthStart ? monthStart : monthEnd;
    const week: WeekStatus | null = total > 0 ? weekStatus(variable, entries, weekOf(reference), today) : null;
    const weeks = total > 0 ? weeksOfMonth(year, month).map((w) => weekStatus(variable, entries, w, today)) : [];
    return {
      key,
      hasBudget: total > 0,
      total,
      spent,
      remaining: fromCents(toCents(total) - toCents(spent)),
      fixed,
      variable,
      categories,
      week,
      weeks,
      pace: (() => {
        // Gráficos de ritmo (Relatórios): mesma conta da semana e do burndown,
        // contra o orçamento ou, sem ele, a renda ou o mês típico.
        const ref = paceReference(total, entries, typicalMonths);
        if (!ref) return null;
        const paceWeek = weekStatus(ref.amount, entries, weekOf(reference), today);
        return {
          kind: ref.kind,
          reference: ref.amount,
          monthBurn: burndown(ref.amount, entries, monthStart, monthEnd, today, { history }),
          week: paceWeek,
          weekBurn: paceWeek.limit >= 0 ? burndown(paceWeek.limit, entries, paceWeek.week.start, paceWeek.week.end, today, { history, samplesFrom: monthStart }) : null,
          weeks: weeksOfMonth(year, month).map((w) => weekStatus(ref.amount, entries, w, today)),
        };
      })(),
      daysLeft: inMonth ? Number(monthEnd.slice(8)) - Number(today.slice(8)) + 1 : 0,
    };
  }, [isLoading, isError, limitsQuery.data, categoriesQuery.data, entries, month, year, history, typicalMonths]);

  return { data, isLoading, isError, retry: () => limitsQuery.refetch() };
}
