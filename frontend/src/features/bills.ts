/**
 * Contas a pagar: ocorrências de recorrentes de despesa À vista e parcelas
 * À vista (Pix, boleto). Compra no cartão é paga pela fatura; despesa avulsa
 * À vista já nasce paga. O gasto continua contando pela data de vencimento;
 * o status só diz se a conta já foi quitada.
 */
import { shiftDateKey } from "../lib/dates";

export type BillStatus = "paga" | "a-pagar" | "vencida";

export type Bill = {
  status: BillStatus;
  /** ISO do pagamento marcado; null se não marcado (ou pago presumido). */
  paidAt: string | null;
  /** Venceu antes do controle começar: conta como paga sem marcação. */
  presumed: boolean;
};

/** Pagamento de uma ocorrência de recorrente ('YYYY-MM'). */
export type RecurringPayment = { ruleId: string; month: string; paidAt: string };

export type BillContext = {
  /** 'YYYY-MM-DD': o que venceu antes conta como pago. */
  trackedFrom: string;
  recurringPayments: RecurringPayment[];
};

/** Tem pagamento a marcar? (despesa À vista recorrente ou parcelada) */
export const isBill = (entry: { type: string; cardId: string | null; source: string; installment?: unknown }) =>
  entry.type === "expense" && !entry.cardId && (entry.source === "recurring" || !!entry.installment);

export function billStatus(date: string, paidAt: string | null | undefined, trackedFrom: string, today: string): Bill {
  if (paidAt) return { status: "paga", paidAt, presumed: false };
  if (date < trackedFrom) return { status: "paga", paidAt: null, presumed: true };
  // Vence hoje ainda está "a pagar"; vencida é a partir do dia seguinte.
  return { status: date < today ? "vencida" : "a-pagar", paidAt: null, presumed: false };
}

export const billLabel: Record<BillStatus, string> = { paga: "Paga", "a-pagar": "A pagar", vencida: "Vencida" };

/** Contas que pedem atenção: vencidas (todas) e a pagar até `days` dias à frente. */
export function pendingBills<T extends { date: string; bill?: Bill }>(entries: T[], today: string, days = 7): T[] {
  const until = shiftDateKey(today, days);
  return entries
    .filter((entry) => entry.bill && (entry.bill.status === "vencida" || (entry.bill.status === "a-pagar" && entry.date <= until)))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
