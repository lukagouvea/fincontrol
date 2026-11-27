/**
 * Central de alertas (Alertas.html / ConfigAlertas.html). Os alertas são
 * derivados dos mesmos dados das telas (orçamento, semana, faturas e
 * recorrentes); no banco ficam só as preferências e o "lido até".
 */
import type { Card } from "../types/FinanceTypes";
import { formatShortDate, parseDateKey, shiftDateKey } from "../lib/dates";
import { formatMoney, fromCents, toCents } from "../lib/money";
import type { WeekStatus } from "./budget";
import type { CategoryBudget } from "./useMonthBudget";
import type { Invoice } from "./invoice";
import type { LedgerEntry } from "./ledger";

export type AlertKey = "semana" | "categorias" | "faturaFechando" | "vencimento" | "contas" | "recorrencia" | "resumoSemanal";
export type AlertPrefs = Record<AlertKey, boolean>;

export const ALERT_OPTIONS: Array<{ key: AlertKey; title: string; hint: string }> = [
  { key: "semana", title: "Limite da semana", hint: "Avisa ao chegar a 80% e quando passar" },
  { key: "categorias", title: "Limite das categorias", hint: "Avisa quando uma categoria passar do limite do mês" },
  { key: "faturaFechando", title: "Fatura fechando", hint: "2 dias antes do fechamento" },
  { key: "vencimento", title: "Vencimento da fatura", hint: "3 dias antes de vencer" },
  { key: "contas", title: "Contas a pagar", hint: "No dia do vencimento e se passar sem pagar (À vista)" },
  { key: "recorrencia", title: "Recorrência lançada", hint: "Quando um lançamento automático entrar" },
  { key: "resumoSemanal", title: "Resumo semanal", hint: "Na segunda-feira, como foi a semana" },
];

export const DEFAULT_PREFS: AlertPrefs = {
  semana: true,
  categorias: true,
  faturaFechando: true,
  vencimento: true,
  contas: true,
  recorrencia: false,
  resumoSemanal: true,
};

export const resolvePrefs = (saved?: Partial<AlertPrefs> | null): AlertPrefs => ({ ...DEFAULT_PREFS, ...(saved ?? {}) });

export type AppAlert = {
  id: string;
  key: AlertKey;
  /** 'YYYY-MM-DD' em que o alerta passou a valer. */
  date: string;
  title: string;
  body: string;
  tone: "info" | "warning" | "danger";
};

const daysBetween = (from: string, to: string) => Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / 86_400_000);
const inDays = (n: number) => (n === 0 ? "hoje" : n === 1 ? "amanhã" : `em ${n} dias`);
const range = (week: WeekStatus) => `${parseDateKey(week.week.start).getDate()} a ${formatShortDate(week.week.end)}`;

/** Dia em que o gasto acumulado passou de `threshold` (centavos). */
function crossingDay(entries: Array<{ date: string; amount: number }>, threshold: number) {
  let total = 0;
  for (const entry of [...entries].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    total += toCents(entry.amount);
    if (total > threshold) return entry.date;
  }
  return null;
}

export type AlertInput = {
  today: string;
  prefs: AlertPrefs;
  entries: LedgerEntry[];
  weeks: WeekStatus[];
  categories: CategoryBudget[];
  categoryName: (id: string | null) => string;
  cards: Array<{ card: Card; invoices: Invoice[] }>;
  /** Contas a pagar pendentes (vencidas e próximas), de qualquer mês. */
  bills?: LedgerEntry[];
};

export function buildAlerts({ today, prefs, entries, weeks, categories, categoryName, cards, bills = [] }: AlertInput): AppAlert[] {
  const alerts: AppAlert[] = [];
  const variable = entries.filter((e) => e.type === "expense" && e.source !== "recurring" && e.date <= today);

  if (prefs.semana) {
    for (const week of weeks) {
      if (week.week.start > today || week.limit <= 0) continue;
      const inWeek = variable.filter((e) => e.date >= week.week.start && e.date <= week.week.end);
      const limitCents = toCents(week.limit);
      const passed = crossingDay(inWeek, limitCents);
      const current = today <= week.week.end;
      if (passed) {
        alerts.push({
          id: `semana-passou:${week.week.start}`,
          key: "semana",
          date: passed,
          title: "Semana passou do limite",
          body: `${range(week)}: ${formatMoney(week.spent)} de ${formatMoney(week.limit)}.`,
          tone: "danger",
        });
      } else if (current) {
        const warned = crossingDay(inWeek, Math.round(limitCents * 0.8) - 1);
        if (warned)
          alerts.push({
            id: `semana-80:${week.week.start}`,
            key: "semana",
            date: warned,
            title: "Semana chegou a 80% do limite",
            body: `Restam ${formatMoney(Math.max(0, week.left))} até domingo.`,
            tone: "warning",
          });
      }
    }
  }

  if (prefs.categorias) {
    for (const row of categories) {
      if (row.limit === null || row.spent <= row.limit || row.categoryId === null) continue;
      const own = variable.concat(entries.filter((e) => e.type === "expense" && e.source === "recurring" && e.date <= today)).filter((e) => e.categoryId === row.categoryId);
      const day = crossingDay(own, toCents(row.limit)) ?? today;
      alerts.push({
        id: `categoria:${row.categoryId}:${today.slice(0, 7)}`,
        key: "categorias",
        date: day,
        title: `${categoryName(row.categoryId)} passou do limite do mês`,
        body: `${formatMoney(fromCents(toCents(row.spent) - toCents(row.limit)))} acima dos ${formatMoney(row.limit)} definidos.`,
        tone: "danger",
      });
    }
  }

  for (const { card, invoices } of cards) {
    if (card.archived) continue;
    for (const invoice of invoices) {
      if (prefs.faturaFechando && invoice.status === "aberta" && invoice.total > 0) {
        const left = daysBetween(today, invoice.closingDate);
        if (left >= 0 && left <= 2)
          alerts.push({
            id: `fechando:${card.id}:${invoice.key}`,
            key: "faturaFechando",
            date: shiftDateKey(invoice.closingDate, -2) < today ? today : shiftDateKey(invoice.closingDate, -2),
            title: `Fatura ${card.name} fecha ${inDays(left)}`,
            body: `Fecha em ${formatShortDate(invoice.closingDate)}. Fatura atual: ${formatMoney(invoice.total)}.`,
            tone: "info",
          });
      }
      if (prefs.vencimento && invoice.remaining > 0 && (invoice.status === "fechada" || invoice.status === "vencida")) {
        const left = daysBetween(today, invoice.dueDate);
        if (left < 0)
          alerts.push({
            id: `vencida:${card.id}:${invoice.key}`,
            key: "vencimento",
            date: shiftDateKey(invoice.dueDate, 1),
            title: `Fatura ${card.name} venceu`,
            body: `Venceu em ${formatShortDate(invoice.dueDate)}. Faltam ${formatMoney(invoice.remaining)}.`,
            tone: "danger",
          });
        else if (left <= 3)
          alerts.push({
            id: `vence:${card.id}:${invoice.key}`,
            key: "vencimento",
            date: shiftDateKey(invoice.dueDate, -3) < today ? today : shiftDateKey(invoice.dueDate, -3),
            title: `Fatura ${card.name} vence ${inDays(left)}`,
            body: `Vence em ${formatShortDate(invoice.dueDate)}: ${formatMoney(invoice.remaining)}.`,
            tone: "warning",
          });
      }
    }
  }

  if (prefs.contas) {
    for (const entry of bills) {
      if (!entry.bill || entry.bill.status === "paga") continue;
      const parcel = entry.installment ? ` (parcela ${entry.installment.current} de ${entry.installment.total})` : "";
      if (entry.bill.status === "vencida")
        alerts.push({
          id: `conta-vencida:${entry.key}`,
          key: "contas",
          date: shiftDateKey(entry.date, 1),
          title: `${entry.description} está vencida`,
          body: `Venceu em ${formatShortDate(entry.date)}${parcel}: ${formatMoney(entry.amount)}. Marque como paga quando pagar.`,
          tone: "danger",
        });
      else if (entry.date === today)
        alerts.push({
          id: `conta-hoje:${entry.key}`,
          key: "contas",
          date: today,
          title: `${entry.description} vence hoje`,
          body: `${formatMoney(entry.amount)}${parcel}, à vista.`,
          tone: "warning",
        });
    }
  }

  if (prefs.recorrencia) {
    const cardName = new Map(cards.map(({ card }) => [card.id, card.name]));
    for (const entry of entries) {
      if (entry.source !== "recurring" || entry.date > today || daysBetween(entry.date, today) > 7) continue;
      const payment = entry.type === "income" ? "" : entry.cardId ? ` no cartão ${cardName.get(entry.cardId) ?? ""}` : " à vista";
      alerts.push({
        id: `recorrente:${entry.key}`,
        key: "recorrencia",
        date: entry.date,
        title: `${entry.description} ${entry.type === "income" ? "recebido" : "lançado"}`,
        body: `${entry.type === "income" ? "+" : "−"} ${formatMoney(entry.amount)}${payment}, categoria ${categoryName(entry.categoryId)}.`,
        tone: "info",
      });
    }
  }

  if (prefs.resumoSemanal) {
    // Na semana atual, resume a anterior (se for do mesmo mês e tiver limite).
    const current = weeks.find((w) => w.week.start <= today && today <= w.week.end);
    const previous = current && weeks.find((w) => w.week.end === shiftDateKey(current.week.start, -1));
    if (current && previous && previous.limit > 0)
      alerts.push({
        id: `resumo:${previous.week.start}`,
        key: "resumoSemanal",
        date: current.week.start,
        title: "Resumo da semana",
        body: `${range(previous)}: ${formatMoney(previous.spent)} de ${formatMoney(previous.limit)}${previous.spent > previous.limit ? ", acima do limite" : ", dentro do limite"}.`,
        tone: previous.spent > previous.limit ? "warning" : "info",
      });
  }

  return alerts.sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date < b.date ? 1 : -1));
}

/** Não lidos: alertas com data depois do último "lido". */
export const unreadCount = (alerts: AppAlert[], readAt?: string | null) => {
  if (!readAt) return alerts.length;
  const read = new Date(readAt);
  const readKey = `${read.getFullYear()}-${String(read.getMonth() + 1).padStart(2, "0")}-${String(read.getDate()).padStart(2, "0")}`;
  return alerts.filter((alert) => alert.date > readKey).length;
};
