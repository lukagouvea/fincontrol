/** Filtros de Transações (Filtros.html): período, pagamento, categoria e valor. */
import { daysInMonth, formatShortDate, fromMonthIndex, monthIndex, monthNames } from "../../lib/dates";
import type { LedgerEntry } from "../ledger";

export type Period = "mes" | "mes-passado" | "3-meses" | "datas";

export type TransactionFilters = {
  period: Period;
  /** 'YYYY-MM-DD', só para period = "datas" */
  from?: string;
  to?: string;
  /** "avista" ou id do cartão */
  payments: string[];
  categories: string[];
  min?: number | null;
  max?: number | null;
};

export const EMPTY_FILTERS: TransactionFilters = { period: "mes", payments: [], categories: [] };

/** Até 12 meses de período livre, para não carregar o histórico inteiro. */
export const MAX_RANGE_MONTHS = 12;

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (year: number, month: number) => `${year}-${pad(month + 1)}`;

/** Intervalo de datas e meses a carregar, relativo ao mês selecionado. */
export function periodRange(filters: TransactionFilters, month: number, year: number) {
  const selected = monthIndex(year, month);
  let startIndex = selected;
  let endIndex = selected;
  if (filters.period === "mes-passado") startIndex = endIndex = selected - 1;
  if (filters.period === "3-meses") startIndex = selected - 2;
  let from: string;
  let to: string;
  if (filters.period === "datas" && filters.from && filters.to) {
    from = filters.from <= filters.to ? filters.from : filters.to;
    to = filters.from <= filters.to ? filters.to : filters.from;
    const [fy, fm] = from.split("-").map(Number);
    const [ty, tm] = to.split("-").map(Number);
    endIndex = monthIndex(ty, tm - 1);
    startIndex = Math.max(monthIndex(fy, fm - 1), endIndex - MAX_RANGE_MONTHS + 1);
    const start = fromMonthIndex(startIndex);
    if (`${keyOf(start.year, start.month)}-01` > from) from = `${keyOf(start.year, start.month)}-01`;
  } else {
    const start = fromMonthIndex(startIndex);
    const end = fromMonthIndex(endIndex);
    from = `${keyOf(start.year, start.month)}-01`;
    to = `${keyOf(end.year, end.month)}-${pad(daysInMonth(end.year, end.month))}`;
  }
  const months = [];
  for (let i = endIndex; i >= startIndex; i -= 1) months.push(fromMonthIndex(i));
  return { from, to, months };
}

export function applyFilters(entries: LedgerEntry[], filters: TransactionFilters, range: { from: string; to: string }) {
  return entries.filter((entry) => {
    if (entry.date < range.from || entry.date > range.to) return false;
    if (filters.payments.length) {
      const key = entry.cardId ?? "avista";
      if (!filters.payments.includes(key)) return false;
    }
    if (filters.categories.length && !filters.categories.includes(entry.categoryId ?? "")) return false;
    if (filters.min != null && entry.amount < filters.min) return false;
    if (filters.max != null && entry.amount > filters.max) return false;
    return true;
  });
}

export const hasFilters = (filters: TransactionFilters) =>
  filters.period !== "mes" || filters.payments.length > 0 || filters.categories.length > 0 || filters.min != null || filters.max != null;

export type FilterChip = { key: string; label: string; remove: (filters: TransactionFilters) => TransactionFilters };

/** Chips dos filtros aplicados (TransacoesFiltrada.html), cada um removível. */
export function filterChips(
  filters: TransactionFilters,
  names: { card: (id: string) => string | undefined; category: (id: string) => string | undefined },
  month: number,
): FilterChip[] {
  const chips: FilterChip[] = [];
  const periodLabel =
    filters.period === "mes"
      ? monthNames[month]
      : filters.period === "mes-passado"
        ? "Mês passado"
        : filters.period === "3-meses"
          ? "3 meses"
          : filters.from && filters.to
            ? `${formatShortDate(filters.from)} a ${formatShortDate(filters.to)}`
            : "Datas";
  if (filters.period !== "mes") chips.push({ key: "period", label: periodLabel, remove: (f) => ({ ...f, period: "mes", from: undefined, to: undefined }) });
  for (const id of filters.payments)
    chips.push({ key: `pay:${id}`, label: id === "avista" ? "À vista" : names.card(id) ?? "Cartão", remove: (f) => ({ ...f, payments: f.payments.filter((p) => p !== id) }) });
  for (const id of filters.categories)
    chips.push({ key: `cat:${id}`, label: names.category(id) ?? "Categoria", remove: (f) => ({ ...f, categories: f.categories.filter((c) => c !== id) }) });
  if (filters.min != null || filters.max != null) {
    const min = filters.min != null ? `R$ ${filters.min.toLocaleString("pt-BR")}` : null;
    const max = filters.max != null ? `R$ ${filters.max.toLocaleString("pt-BR")}` : null;
    chips.push({
      key: "valor",
      label: min && max ? `${min} a ${max}` : min ? `A partir de ${min}` : `Até ${max}`,
      remove: (f) => ({ ...f, min: null, max: null }),
    });
  }
  return chips;
}
