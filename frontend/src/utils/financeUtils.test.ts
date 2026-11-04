import { describe, expect, it } from "vitest";
import { getActualFixedItemAmount, isItemActiveInMonth } from "./financeUtils";

describe("regras financeiras preservadas da main", () => {
  it("aplica uma variação zero somente ao tipo e mês correspondentes", () => {
    const variations = [
      {
        id: "variation",
        fixedItemId: "rent",
        type: "expense" as const,
        year: 2026,
        month: 10,
        amount: 0,
      },
    ];
    expect(
      getActualFixedItemAmount("rent", "expense", 2026, 10, 1200, variations),
    ).toBe(0);
    expect(
      getActualFixedItemAmount("rent", "income", 2026, 10, 1200, variations),
    ).toBe(1200);
    expect(
      getActualFixedItemAmount("rent", "expense", 2026, 11, 1200, variations),
    ).toBe(1200);
  });
  it("mantém o histórico de fixas encerradas sem lançar meses posteriores", () => {
    const item = {
      day: 10,
      startDate: "2026-01-01T00:00:00",
      endDate: "2026-06-15T00:00:00",
    };
    expect(isItemActiveInMonth(item, new Date(2026, 5, 1))).toBe(true);
    expect(isItemActiveInMonth(item, new Date(2026, 6, 1))).toBe(false);
    expect(isItemActiveInMonth(item, new Date(2025, 11, 1))).toBe(false);
  });
});
