import { describe, expect, it } from "vitest";
import { historyStats, monthResult, type HistoryRow } from "./history";

describe("resultado do mês", () => {
  it("com orçamento usa orçamento − gasto; sem orçamento, entradas − gastos", () => {
    expect(monthResult(3940, 7200, 4150, false)).toEqual({ kind: "sobrou", amount: 210, basis: "orcamento" });
    expect(monthResult(4310, 7200, 4150, false)).toEqual({ kind: "passou", amount: 160, basis: "orcamento" });
    expect(monthResult(3846.2, 7200, 4150, true)).toEqual({ kind: "restam", amount: 303.8, basis: "orcamento" });
    expect(monthResult(3000, 7200, null, false)).toEqual({ kind: "sobrou", amount: 4200, basis: "entradas" });
  });

  it("estatísticas só com meses fechados", () => {
    const row = (key: string, spent: number, current = false): HistoryRow => ({ key, month: 0, year: 2026, spent, income: 7200, budget: 4150, current });
    const stats = historyStats([row("jun", 3780), row("jul", 4020), row("ago", 3610), row("set", 4310), row("out", 3940), row("nov", 3846.2, true)]);
    expect(stats.average).toBe(3932);
    expect([stats.within, stats.withBudget]).toEqual([4, 5]);
    expect(stats.best.row.key).toBe("ago");
    expect(stats.worst.row.key).toBe("set");
  });
});
