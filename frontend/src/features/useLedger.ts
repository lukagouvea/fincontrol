import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useTransactions } from "../hooks/useTransactions";
import { useFixedExpenses, useFixedIncomes } from "../hooks/useFixedTransactions";
import { useMonthlyVariations } from "../hooks/useMonthlyVariations";
import { transactionService } from "../services/transactionService";
import { fromMonthIndex, monthIndex, toDateKey } from "../lib/dates";
import { buildMonthLedger, summarizeLedger, type LedgerEntry, type LedgerSummary } from "./ledger";

export const todayKey = () => toDateKey(new Date());

/** Livro de um mês (0–11) com estado de carregamento/erro combinado. */
export function useMonthLedger(month: number, year: number) {
  const transactions = useTransactions(month, year);
  const fixedIncomes = useFixedIncomes();
  const fixedExpenses = useFixedExpenses();
  const variations = useMonthlyVariations();
  const queries = [transactions, fixedIncomes, fixedExpenses, variations];
  const isLoading = queries.some((query) => query.isPending);
  const isError = queries.some((query) => query.isError);
  const entries = useMemo<LedgerEntry[]>(
    () =>
      isLoading || isError
        ? []
        : buildMonthLedger({
            year,
            month,
            transactions: transactions.data ?? [],
            fixedIncomes: fixedIncomes.data ?? [],
            fixedExpenses: fixedExpenses.data ?? [],
            variations: variations.data ?? [],
            today: todayKey(),
          }),
    [isLoading, isError, year, month, transactions.data, fixedIncomes.data, fixedExpenses.data, variations.data],
  );
  return {
    entries,
    isLoading,
    isError,
    /** Mostra dados do mês anterior enquanto o novo carrega (keepPreviousData). */
    isFetching: transactions.isFetching,
    retry: () => queries.forEach((query) => query.isError && query.refetch()),
  };
}

export type MonthSummary = { month: number; year: number; summary: LedgerSummary };

/** Resumo dos `count` meses que terminam em (month, year), do mais antigo ao mais recente. */
export function useMonthsSummary(month: number, year: number, count: number, enabled = true, { untilToday = false } = {}) {
  const fixedIncomes = useFixedIncomes();
  const fixedExpenses = useFixedExpenses();
  const variations = useMonthlyVariations();
  const end = monthIndex(year, month);
  const months = Array.from({ length: count }, (_, i) => fromMonthIndex(end - count + 1 + i));
  const results = useQueries({
    queries: months.map(({ month: m, year: y }) => ({
      queryKey: ["transactions", m, y],
      queryFn: () => transactionService.getAll(m, y),
      staleTime: 1000 * 60 * 5,
      enabled,
    })),
  });
  const base = [fixedIncomes, fixedExpenses, variations];
  const isLoading = enabled && [...base, ...results].some((query) => query.isPending);
  const isError = [...base, ...results].some((query) => query.isError);
  const today = todayKey();
  const data: MonthSummary[] =
    isLoading || isError
      ? []
      : months.map(({ month: m, year: y }, i) => ({
          month: m,
          year: y,
          summary: summarizeLedger(
            buildMonthLedger({
              year: y,
              month: m,
              transactions: results[i].data ?? [],
              fixedIncomes: fixedIncomes.data ?? [],
              fixedExpenses: fixedExpenses.data ?? [],
              variations: variations.data ?? [],
              today,
            }),
            { untilToday },
          ),
        }));
  return {
    data,
    isLoading,
    isError,
    retry: () => [...base, ...results].forEach((query) => query.isError && query.refetch()),
  };
}

/** Livro de vários meses (para filtros de período), do mais recente ao mais antigo. */
export function useLedgerMonths(months: Array<{ month: number; year: number }>) {
  const fixedIncomes = useFixedIncomes();
  const fixedExpenses = useFixedExpenses();
  const variations = useMonthlyVariations();
  const results = useQueries({
    queries: months.map(({ month: m, year: y }) => ({
      queryKey: ["transactions", m, y],
      queryFn: () => transactionService.getAll(m, y),
      staleTime: 1000 * 60 * 5,
    })),
  });
  const base = [fixedIncomes, fixedExpenses, variations];
  const isLoading = [...base, ...results].some((query) => query.isPending);
  const isError = [...base, ...results].some((query) => query.isError);
  const dataKey = results.map((query) => query.dataUpdatedAt).join(",");
  const entries = useMemo<LedgerEntry[]>(() => {
    if (isLoading || isError) return [];
    const today = todayKey();
    return months
      .flatMap(({ month: m, year: y }, i) =>
        buildMonthLedger({
          year: y,
          month: m,
          transactions: results[i].data ?? [],
          fixedIncomes: fixedIncomes.data ?? [],
          fixedExpenses: fixedExpenses.data ?? [],
          variations: variations.data ?? [],
          today,
        }),
      )
      .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isError, dataKey, fixedIncomes.data, fixedExpenses.data, variations.data, JSON.stringify(months)]);
  return {
    entries,
    isLoading,
    isError,
    retry: () => [...base, ...results].forEach((query) => query.isError && query.refetch()),
  };
}
