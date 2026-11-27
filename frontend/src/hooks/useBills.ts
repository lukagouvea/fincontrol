import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { billService } from "../services/billService";
import type { BillContext } from "../features/bills";

export const RECURRING_PAYMENTS_KEY = ["recurring-payments"];

export const useRecurringPayments = () =>
  useQuery({ queryKey: RECURRING_PAYMENTS_KEY, queryFn: billService.getRecurringPayments, staleTime: 1000 * 60 * 5 });

/** Contexto de contas a pagar para o ledger; undefined até carregar (as linhas saem sem status). */
export function useBillContext(): BillContext | undefined {
  const { currentUser } = useAuth();
  const payments = useRecurringPayments();
  const trackedFrom = currentUser?.paymentsTrackedFrom?.slice(0, 10);
  if (!trackedFrom || !payments.data) return undefined;
  return { trackedFrom, recurringPayments: payments.data };
}
