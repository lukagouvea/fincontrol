import { describe, expect, it } from "vitest";
import { burndown, fixedExpenses, limitForMonth, monthLimits, weekOf, weekStatus, weeksOfMonth } from "./budget";
import type { LedgerEntry } from "./ledger";
import type { BudgetLimit } from "../types/FinanceTypes";
import { isItemActiveInMonth } from "../utils/financeUtils";

const entry = (date: string, amount: number, extra: Partial<LedgerEntry> = {}): LedgerEntry => ({
  key: `${date}-${amount}`,
  source: "transaction",
  id: `${date}-${amount}`,
  type: "expense",
  description: "x",
  amount,
  categoryId: "food",
  date,
  upcoming: false,
  cardId: null,
  ...extra,
});

describe("limites", () => {
  const records: BudgetLimit[] = [
    { categoryId: "food", month: "2026-09", amount: 1000, repeat: true },
    { categoryId: "food", month: "2026-11", amount: 1500, repeat: false }, // só novembro
    { categoryId: "fun", month: "2026-10", amount: 400, repeat: true },
    { categoryId: "fun", month: "2027-01", amount: null, repeat: true }, // tira o limite
  ];
  it("usa o do mês ou o último repetido antes", () => {
    expect(limitForMonth(records, "food", "2026-08")).toBeNull();
    expect(limitForMonth(records, "food", "2026-10")).toBe(1000);
    expect(limitForMonth(records, "food", "2026-11")).toBe(1500);
    expect(limitForMonth(records, "food", "2026-12")).toBe(1000);
    expect(limitForMonth(records, "fun", "2027-02")).toBeNull();
  });
  it("orçamento do mês é a soma dos limites", () => {
    const { total, limits } = monthLimits(records, ["food", "fun", "other"], "2026-11");
    expect(total).toBe(1900);
    expect([...limits.keys()]).toEqual(["food", "fun"]);
  });
});

describe("semana", () => {
  it("vai de segunda a domingo e é cortada na virada do mês", () => {
    expect(weekOf("2026-11-18")).toEqual({ start: "2026-11-16", end: "2026-11-22" });
    expect(weekOf("2026-12-02")).toEqual({ start: "2026-12-01", end: "2026-12-06" });
    expect(weekOf("2026-11-30")).toEqual({ start: "2026-11-30", end: "2026-11-30" });
    expect(weeksOfMonth(2026, 10).map((w) => w.start)).toEqual(["2026-11-01", "2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]);
  });

  it("limite = variável restante na segunda ÷ dias restantes × dias da semana; fixo até domingo", () => {
    const entries = [
      entry("2026-11-03", 600),
      entry("2026-11-10", 400), // antes da semana: 1000
      entry("2026-11-16", 30),
      entry("2026-11-17", 31.3), // na semana
      entry("2026-11-20", 50, { upcoming: true }), // futuro: não conta ainda
      entry("2026-11-05", 1450, { source: "recurring" }), // fixa: fora do variável
    ];
    // variável 2500; restam 1500 em 15 dias (16 a 30) → 100/dia × 7 = 700
    const status = weekStatus(2500, entries, weekOf("2026-11-18"), "2026-11-18");
    expect(status.limit).toBe(700);
    expect(status.spent).toBe(61.3);
    expect(status.left).toBe(638.7);
    expect(status.perDay).toBe(127.74); // 638,70 ÷ 5 dias (qua a dom)
    expect(status.state).toBe("ok");
    expect(status.days.map((d) => d?.spent)).toEqual([30, 31.3, 0, 0, 0, 0, 0]);
    expect(fixedExpenses(entries)).toBe(1450);
  });

  it("avisa aos 80% e quando passa", () => {
    const week = weekOf("2026-11-18");
    expect(weekStatus(1500, [entry("2026-11-16", 560)], week, "2026-11-18").state).toBe("atencao");
    expect(weekStatus(1500, [entry("2026-11-16", 800)], week, "2026-11-18").state).toBe("passou");
  });
});

describe("burndown", () => {
  it("real até hoje, ideal até zero e projeção no ritmo atual", () => {
    const points = burndown(100, [entry("2026-11-01", 10), entry("2026-11-02", 20)], "2026-11-01", "2026-11-04", "2026-11-02");
    expect(points.map((p) => p.real)).toEqual([90, 70, null, null]);
    expect(points.map((p) => p.ideal)).toEqual([75, 50, 25, 0]);
    expect(points.map((p) => p.projection)).toEqual([null, 70, 55, 40]);
  });
});

describe("pausa de recorrente", () => {
  it("não lança nos meses pausados", () => {
    const item = { day: 10, startDate: "2026-01-01T12:00:00Z", pausedFrom: "2026-12", pausedUntil: "2026-12" };
    expect(isItemActiveInMonth(item, new Date(2026, 10, 1))).toBe(true);
    expect(isItemActiveInMonth(item, new Date(2026, 11, 1))).toBe(false);
    expect(isItemActiveInMonth(item, new Date(2027, 0, 1))).toBe(true);
  });
});
