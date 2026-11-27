import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useCategories } from "../hooks/useCategories";
import { makeCategoryLookup } from "./categories";
import { buildAlerts, resolvePrefs, unreadCount, type AppAlert } from "./alerts";
import { useCardInvoices } from "./useCardInvoices";
import { useMonthBudget } from "./useMonthBudget";
import { useMonthLedger, todayKey } from "./useLedger";

/** Alertas do mês atual, já filtrados pelas preferências, e quantos não foram lidos. */
export function useAlerts() {
  const { currentUser } = useAuth();
  const now = new Date();
  const ledger = useMonthLedger(now.getMonth(), now.getFullYear());
  const budget = useMonthBudget(now.getMonth(), now.getFullYear(), ledger.entries, !ledger.isLoading && !ledger.isError);
  const invoices = useCardInvoices();
  const categoriesQuery = useCategories();
  const isLoading = ledger.isLoading || budget.isLoading || invoices.isLoading;
  const alerts = useMemo<AppAlert[]>(() => {
    if (isLoading || !budget.data) return [];
    const category = makeCategoryLookup(categoriesQuery.data);
    return buildAlerts({
      today: todayKey(),
      prefs: resolvePrefs(currentUser?.alertPrefs),
      entries: ledger.entries,
      weeks: budget.data.weeks,
      categories: budget.data.categories,
      categoryName: (id) => (id ? category(id)?.name ?? "Sem categoria" : "Geral"),
      cards: invoices.data,
    });
  }, [isLoading, budget.data, ledger.entries, invoices.data, categoriesQuery.data, currentUser?.alertPrefs]);
  return { alerts, unread: unreadCount(alerts, currentUser?.alertsReadAt), isLoading };
}
