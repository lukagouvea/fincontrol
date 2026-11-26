import { useMemo } from "react";
import { useCards, useCardsTransactions } from "../hooks/useCards";
import { useFixedExpenses, useFixedIncomes } from "../hooks/useFixedTransactions";
import { useMonthlyVariations } from "../hooks/useMonthlyVariations";
import type { Card, FixedTransaction, MonthlyVariation, Transaction } from "../types/FinanceTypes";
import { resolveFixedItemForMonth } from "../utils/financeUtils";
import { fromMonthIndex, isoToDateKey, monthIndex } from "../lib/dates";
import { fromCents, toCents } from "../lib/money";
import { todayKey } from "./useLedger";
import { buildInvoices, invoiceKeyFor, usedLimit, type CardCharge, type Invoice } from "./invoice";

/** Quantos meses para trás as recorrentes no cartão são projetadas. */
const RECURRING_LOOKBACK = 24;

export type CardSummary = {
  card: Card;
  invoices: Invoice[];
  /** Fatura que está aberta hoje. */
  current: Invoice;
  used: number;
  available: number;
};

type ApiTransaction = Transaction & {
  recurringRuleId?: string | null;
  installmentInfo?: { current: number; total: number } | null;
};

export function cardCharges(
  card: Card,
  transactions: Transaction[],
  rules: Array<{ item: FixedTransaction; type: "income" | "expense" }>,
  variations: MonthlyVariation[],
  today: string,
): CardCharge[] {
  const charges: CardCharge[] = [];
  for (const raw of transactions as ApiTransaction[]) {
    if (raw.recurringRuleId) continue; // variação: o valor entra pela projeção da regra
    charges.push({
      key: `tx:${raw.id}`,
      date: isoToDateKey(raw.date),
      amount: raw.type === "income" ? -Number(raw.amount) : Number(raw.amount),
      description: raw.description,
      categoryId: raw.categoryId || null,
      source: "transaction",
      installment: raw.installmentInfo?.total ? { current: raw.installmentInfo.current, total: raw.installmentInfo.total } : undefined,
    });
  }
  const now = new Date();
  const end = monthIndex(now.getFullYear(), now.getMonth());
  for (const { item, type } of rules) {
    if (item.cardId !== card.id) continue;
    for (let index = end - RECURRING_LOOKBACK; index <= end; index += 1) {
      const { year, month } = fromMonthIndex(index);
      const resolved = resolveFixedItemForMonth(item, type, year, month, variations);
      if (!resolved) continue;
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(resolved.occurrenceDay).padStart(2, "0")}`;
      if (date > today) continue; // ainda não foi cobrada
      charges.push({
        key: `rec:${item.id}:${date.slice(0, 7)}`,
        date,
        amount: type === "income" ? -resolved.actualAmount : resolved.actualAmount,
        description: item.description,
        categoryId: resolved.categoryId,
        source: "recurring",
      });
    }
  }
  return charges;
}

/** Faturas e limite de todos os cartões (inclusive arquivados, para o histórico). */
export function useCardInvoices() {
  const cards = useCards();
  const ids = (cards.data ?? []).map((card) => card.id);
  const transactions = useCardsTransactions(ids);
  const fixedExpenses = useFixedExpenses();
  const fixedIncomes = useFixedIncomes();
  const variations = useMonthlyVariations();
  const base = [cards, fixedExpenses, fixedIncomes, variations];
  const isLoading = base.some((q) => q.isPending) || transactions.some((q) => q.isPending);
  const isError = base.some((q) => q.isError) || transactions.some((q) => q.isError);
  const dataKey = transactions.map((q) => q.dataUpdatedAt).join(",");

  const data = useMemo<CardSummary[]>(() => {
    if (isLoading || isError) return [];
    const today = todayKey();
    const rules = [
      ...(fixedExpenses.data ?? []).map((item) => ({ item, type: "expense" as const })),
      ...(fixedIncomes.data ?? []).map((item) => ({ item, type: "income" as const })),
    ];
    return (cards.data ?? []).map((card, index) => {
      const charges = cardCharges(card, transactions[index]?.data ?? [], rules, variations.data ?? [], today);
      const invoices = buildInvoices(card, charges, card.payments, today, card.createdAt ? isoToDateKey(card.createdAt) : undefined);
      const currentKey = invoiceKeyFor(today, card.closingDay);
      const used = usedLimit(invoices);
      return {
        card,
        invoices,
        current: invoices.find((invoice) => invoice.key === currentKey)!,
        used,
        available: fromCents(toCents(card.limit) - toCents(used)),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isError, cards.data, fixedExpenses.data, fixedIncomes.data, variations.data, dataKey]);

  return {
    data,
    isLoading,
    isError,
    retry: () => {
      base.forEach((q) => q.isError && q.refetch());
      transactions.forEach((q) => q.isError && q.refetch());
    },
  };
}
