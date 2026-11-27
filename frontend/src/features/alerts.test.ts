import { describe, expect, it } from "vitest";
import { buildAlerts, DEFAULT_PREFS, unreadCount } from "./alerts";
import { weekOf, weekStatus, weeksOfMonth } from "./budget";
import { buildInvoices } from "./invoice";
import type { LedgerEntry } from "./ledger";
import type { Card } from "../types/FinanceTypes";

const entry = (date: string, amount: number, extra: Partial<LedgerEntry> = {}): LedgerEntry => ({
  key: `${date}-${amount}`, source: "transaction", id: `${date}-${amount}`, type: "expense", description: "x", amount, categoryId: "fun", date, upcoming: false, cardId: null, ...extra,
});
const vento: Card = { id: "v", name: "Vento", last4: "7730", limit: 3000, closingDay: 20, dueDay: 27, color: "azul", archived: false, payments: [] };

describe("alertas", () => {
  const today = "2026-11-18";
  const entries = [
    entry("2026-11-10", 1000),
    entry("2026-11-11", 122.9),
    entry("2026-11-16", 400),
    entry("2026-11-18", 30, { source: "recurring", description: "Streaming de música", categoryId: "subs", cardId: "a" }),
  ];
  const weeks = weeksOfMonth(2026, 10).map((w) => weekStatus(2500, entries, w, today));
  const base = {
    today,
    prefs: { ...DEFAULT_PREFS, recorrencia: true },
    entries,
    weeks,
    categories: [{ categoryId: "fun", limit: 400, spent: 1522.9 }],
    categoryName: (id: string | null) => (id === "fun" ? "Lazer" : "Assinaturas"),
    cards: [{ card: vento, invoices: buildInvoices(vento, [{ key: "c", date: "2026-11-05", amount: 612.5, description: "x", categoryId: null, source: "transaction" as const }], [], today) }],
  };

  it("gera os alertas de semana, categoria, fatura, recorrência e resumo", () => {
    const alerts = buildAlerts(base);
    const titles = alerts.map((a) => a.title);
    expect(titles).toContain("Semana passou do limite");
    expect(titles).toContain("Lazer passou do limite do mês");
    expect(titles).toContain("Fatura Vento fecha em 2 dias");
    expect(titles).toContain("Streaming de música lançado");
    expect(titles).toContain("Resumo da semana");
    expect(alerts.find((a) => a.key === "categorias")?.date).toBe("2026-11-10");
    expect(alerts.find((a) => a.key === "faturaFechando")?.body).toBe("Fecha em 20 nov. Fatura atual: R$ 612,50.");
    // Ordem: mais recentes primeiro.
    expect(alerts[0].date >= alerts[alerts.length - 1].date).toBe(true);
  });

  it("respeita as preferências e conta os não lidos", () => {
    const off = buildAlerts({ ...base, prefs: { ...DEFAULT_PREFS, semana: false, categorias: false, faturaFechando: false, vencimento: false, recorrencia: false, resumoSemanal: false } });
    expect(off).toEqual([]);
    const alerts = buildAlerts(base);
    expect(unreadCount(alerts, null)).toBe(alerts.length);
    expect(unreadCount(alerts, new Date(2026, 10, 18, 9).toISOString())).toBe(0);
    expect(unreadCount(alerts, new Date(2026, 10, 15, 9).toISOString())).toBeGreaterThan(0);
  });

  it("80% da semana só na semana atual", () => {
    const status = weekStatus(1500, [entry("2026-11-16", 560)], weekOf(today), today);
    const alerts = buildAlerts({ ...base, entries: [entry("2026-11-16", 560)], weeks: [status], categories: [], cards: [] });
    expect(alerts.map((a) => a.title)).toEqual(["Semana chegou a 80% do limite"]);
  });
});
