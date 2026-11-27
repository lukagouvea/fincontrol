import { useMemo } from "react";
import { useBudgetLimits } from "../hooks/useBudget";
import { useCategories } from "../hooks/useCategories";
import { monthKeyOf, monthLimits } from "./budget";
import type { HistoryRow } from "./history";
import { useMonthsSummary } from "./useLedger";

/** Linhas do histórico: os `count` meses até o atual (o atual conta até hoje). */
export function useHistory(count: number) {
  const now = new Date();
  const summaries = useMonthsSummary(now.getMonth(), now.getFullYear(), count, true, { untilToday: true });
  const limits = useBudgetLimits();
  const categories = useCategories();
  const isLoading = summaries.isLoading || limits.isPending || categories.isPending;
  const isError = summaries.isError || limits.isError || categories.isError;
  const rows = useMemo<HistoryRow[]>(() => {
    if (isLoading || isError) return [];
    // Só categorias ativas (ver useMonthBudget): arquivadas e mescladas não somam limite.
    const ids = (categories.data ?? []).filter((c) => c.type === "expense" && c.active !== false).map((c) => c.id);
    return summaries.data.map(({ month, year, summary }) => {
      const key = monthKeyOf(year, month);
      const { total } = monthLimits(limits.data ?? [], ids, key);
      return {
        key,
        month,
        year,
        spent: summary.expense,
        income: summary.income,
        budget: total > 0 ? total : null,
        current: month === now.getMonth() && year === now.getFullYear(),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isError, summaries.data, limits.data, categories.data]);
  return { rows, isLoading, isError, retry: () => (summaries.retry(), limits.refetch()) };
}
