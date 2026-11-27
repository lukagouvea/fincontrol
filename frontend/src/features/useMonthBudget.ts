import { useMemo } from "react";
import { useBudgetLimits } from "../hooks/useBudget";
import { useCategories } from "../hooks/useCategories";
import { fromCents, toCents } from "../lib/money";
import { burndown, fixedExpenses, monthKeyOf, monthLimits, weekOf, weekStatus, weeksOfMonth, type WeekStatus } from "./budget";
import { summarizeLedger, type LedgerEntry } from "./ledger";
import { todayKey } from "./useLedger";

/** categoryId null = "Geral": cobre os gastos das categorias sem limite próprio. */
export type CategoryBudget = { categoryId: string | null; limit: number | null; spent: number };

/**
 * Orçamento de um mês a partir do livro já carregado: total (soma dos
 * limites), restante, variável, limites por categoria, semana e burndown.
 */
export function useMonthBudget(month: number, year: number, entries: LedgerEntry[], ready: boolean) {
  const limitsQuery = useBudgetLimits();
  const categoriesQuery = useCategories();
  const isLoading = limitsQuery.isPending || categoriesQuery.isPending || !ready;
  const isError = limitsQuery.isError || categoriesQuery.isError;

  const data = useMemo(() => {
    if (isLoading || isError) return null;
    const key = monthKeyOf(year, month);
    const today = todayKey();
    const expenseCategories = (categoriesQuery.data ?? []).filter((category) => category.type === "expense");
    const { limits, total } = monthLimits(limitsQuery.data ?? [], expenseCategories.map((c) => c.id), key);
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
      monthBurn: total > 0 ? burndown(variable, entries, monthStart, monthEnd, today) : [],
      weekBurn:
        week && week.limit >= 0
          ? burndown(week.limit, entries.filter((e) => e.date >= week.week.start), week.week.start, week.week.end, today)
          : [],
      daysLeft: inMonth ? Number(monthEnd.slice(8)) - Number(today.slice(8)) + 1 : 0,
    };
  }, [isLoading, isError, limitsQuery.data, categoriesQuery.data, entries, month, year]);

  return { data, isLoading, isError, retry: () => limitsQuery.refetch() };
}
