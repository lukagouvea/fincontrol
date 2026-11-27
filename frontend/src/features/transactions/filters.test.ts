import { describe, expect, it } from "vitest";
import { applyFilters, EMPTY_FILTERS, filterChips, periodRange } from "./filters";
import type { LedgerEntry } from "../ledger";

const entry = (date: string, amount: number, extra: Partial<LedgerEntry> = {}): LedgerEntry => ({
  key: `${date}-${amount}`, source: "transaction", id: date, type: "expense", description: "x", amount, categoryId: "food", date, upcoming: false, cardId: null, ...extra,
});

describe("filtros", () => {
  it("período relativo ao mês selecionado e datas livres limitadas a 12 meses", () => {
    expect(periodRange(EMPTY_FILTERS, 10, 2026)).toMatchObject({ from: "2026-11-01", to: "2026-11-30" });
    expect(periodRange({ ...EMPTY_FILTERS, period: "mes-passado" }, 0, 2027)).toMatchObject({ from: "2026-12-01", to: "2026-12-31" });
    const three = periodRange({ ...EMPTY_FILTERS, period: "3-meses" }, 10, 2026);
    expect([three.from, three.to, three.months.length]).toEqual(["2026-09-01", "2026-11-30", 3]);
    const custom = periodRange({ ...EMPTY_FILTERS, period: "datas", from: "2024-01-10", to: "2026-11-05" }, 10, 2026);
    expect([custom.from, custom.to, custom.months.length]).toEqual(["2025-12-01", "2026-11-05", 12]);
  });

  it("filtra por pagamento, categoria e valor", () => {
    const entries = [
      entry("2026-11-03", 50, { cardId: "c1" }),
      entry("2026-11-04", 300, { cardId: "c1", categoryId: "fun" }),
      entry("2026-11-05", 80),
    ];
    const range = { from: "2026-11-01", to: "2026-11-30" };
    expect(applyFilters(entries, { ...EMPTY_FILTERS, payments: ["c1"] }, range)).toHaveLength(2);
    expect(applyFilters(entries, { ...EMPTY_FILTERS, payments: ["avista"] }, range).map((e) => e.amount)).toEqual([80]);
    expect(applyFilters(entries, { ...EMPTY_FILTERS, categories: ["food"], min: 60 }, range).map((e) => e.amount)).toEqual([80]);
    expect(applyFilters(entries, { ...EMPTY_FILTERS, max: 100 }, range)).toHaveLength(2);
  });

  it("gera chips removíveis", () => {
    const chips = filterChips(
      { ...EMPTY_FILTERS, period: "3-meses", payments: ["c1"], categories: ["food"], max: 100 },
      { card: () => "Aurora", category: () => "Alimentação" },
      10,
    );
    expect(chips.map((c) => c.label)).toEqual(["3 meses", "Aurora", "Alimentação", "Até R$ 100"]);
    expect(chips[1].remove({ ...EMPTY_FILTERS, payments: ["c1"] }).payments).toEqual([]);
  });
});
