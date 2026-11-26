/**
 * Fatura derivada (PRODUCT_RULES): não é guardada no banco. Cada compra entra
 * na fatura que fecha no mesmo mês se o dia da compra for até o fechamento;
 * senão, na do mês seguinte. "Pagar fatura" só registra o pagamento e libera o
 * limite — não é gasto novo.
 */
import type { Card, CardPayment } from "../types/FinanceTypes";
import { fromCents, toCents } from "../lib/money";
import { daysInMonth } from "../lib/dates";

/** 'YYYY-MM' da fatura (o mês em que ela fecha). */
export type InvoiceKey = string;

export type InvoiceStatus = "aberta" | "fechada" | "vencida" | "paga" | "futura";

export type CardCharge = {
  key: string;
  /** 'YYYY-MM-DD' */
  date: string;
  /** Positivo = compra; negativo = estorno/crédito. */
  amount: number;
  description: string;
  categoryId: string | null;
  source: "transaction" | "recurring";
  installment?: { current: number; total: number };
};

export type Invoice = {
  key: InvoiceKey;
  closingDate: string;
  dueDate: string;
  items: CardCharge[];
  total: number;
  paid: number;
  remaining: number;
  status: InvoiceStatus;
};

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (year: number, month: number) => {
  const index = year * 12 + month;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
};
const parseKey = (key: InvoiceKey) => {
  const [year, month] = key.split("-").map(Number);
  return { year, month: month - 1 };
};
const dayIn = (year: number, month: number, day: number) => {
  const index = year * 12 + month;
  const y = Math.floor(index / 12);
  const m = index % 12;
  return `${y}-${pad(m + 1)}-${pad(Math.min(day, daysInMonth(y, m)))}`;
};

export const shiftInvoiceKey = (key: InvoiceKey, months: number) => {
  const { year, month } = parseKey(key);
  return keyOf(year, month + months);
};

/** Data de fechamento da fatura (dia ajustado em meses curtos). */
export const closingDateOf = (key: InvoiceKey, closingDay: number) => {
  const { year, month } = parseKey(key);
  return dayIn(year, month, closingDay);
};

/** Vencimento: no mesmo mês se vence depois do fechamento; senão no mês seguinte. */
export const dueDateOf = (key: InvoiceKey, card: Pick<Card, "closingDay" | "dueDay">) => {
  const { year, month } = parseKey(key);
  return dayIn(year, card.dueDay > card.closingDay ? month : month + 1, card.dueDay);
};

/** Fatura em que cai uma compra feita em `date` ('YYYY-MM-DD'). */
export const invoiceKeyFor = (date: string, closingDay: number): InvoiceKey => {
  const [year, month, day] = date.split("-").map(Number);
  const closing = Math.min(closingDay, daysInMonth(year, month - 1));
  return day <= closing ? keyOf(year, month - 1) : keyOf(year, month);
};

export function buildInvoices(
  card: Pick<Card, "closingDay" | "dueDay">,
  charges: CardCharge[],
  payments: CardPayment[],
  today: string,
  /**
   * 'YYYY-MM-DD' do cadastro do cartão. Faturas que venceram antes disso
   * contam como pagas: ninguém registra pagamentos retroativos ao lançar
   * compras antigas (ex.: parcelas já em andamento).
   */
  assumePaidBefore?: string,
): Invoice[] {
  const current = invoiceKeyFor(today, card.closingDay);
  const groups = new Map<InvoiceKey, CardCharge[]>([[current, []]]);
  for (const charge of charges) {
    const key = invoiceKeyFor(charge.date, card.closingDay);
    groups.set(key, [...(groups.get(key) ?? []), charge]);
  }
  for (const payment of payments) if (!groups.has(payment.invoiceMonth)) groups.set(payment.invoiceMonth, []);

  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, items]) => {
      const totalCents = items.reduce((sum, item) => sum + toCents(item.amount), 0);
      const closingDate = closingDateOf(key, card.closingDay);
      const dueDate = dueDateOf(key, card);
      const registeredCents = payments
        .filter((payment) => payment.invoiceMonth === key)
        .reduce((sum, payment) => sum + toCents(payment.amount), 0);
      const settledBefore = !!assumePaidBefore && dueDate < assumePaidBefore;
      const paidCents = settledBefore ? Math.max(registeredCents, totalCents) : registeredCents;
      const remainingCents = Math.max(0, totalCents - paidCents);
      let status: InvoiceStatus;
      if (key > current) status = "futura";
      else if (key === current) status = totalCents > 0 && remainingCents === 0 ? "paga" : "aberta";
      else if (remainingCents === 0) status = "paga";
      else if (today <= dueDate) status = "fechada";
      else status = "vencida";
      return {
        key,
        closingDate,
        dueDate,
        items: [...items].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)),
        total: fromCents(totalCents),
        paid: fromCents(paidCents),
        remaining: fromCents(remainingCents),
        status,
      };
    });
}

/**
 * Limite usado: tudo que ainda não foi pago, inclusive faturas futuras de
 * parcelas (o limite cai pelo valor total na compra).
 */
export const usedLimit = (invoices: Invoice[]) =>
  fromCents(invoices.reduce((sum, invoice) => sum + toCents(invoice.remaining), 0));
