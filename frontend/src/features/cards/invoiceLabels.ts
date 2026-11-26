import type { InvoiceStatus } from "../invoice";
import { formatShortDate, monthNames } from "../../lib/dates";
import type { BadgeTone } from "../../ui/Chip";

export const statusLabel: Record<InvoiceStatus, string> = {
  aberta: "Aberta",
  fechada: "Fechada",
  vencida: "Vencida",
  paga: "Paga",
  futura: "Próxima",
};

export const statusTone: Record<InvoiceStatus, BadgeTone> = {
  aberta: "primary",
  fechada: "info",
  vencida: "expense",
  paga: "income",
  futura: "neutral",
};

/** "dezembro" a partir de 'YYYY-MM'. */
export const invoiceMonthName = (key: string) => monthNames[Number(key.slice(5, 7)) - 1].toLowerCase();

export const closesLabel = (closingDate: string, today: string) =>
  `${closingDate >= today ? "Fecha" : "Fechou"} em ${formatShortDate(closingDate)}`;
export const dueLabel = (dueDate: string, today: string) => `${dueDate >= today ? "Vence" : "Venceu"} em ${formatShortDate(dueDate)}`;
