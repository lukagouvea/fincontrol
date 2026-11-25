import { describe, expect, it } from "vitest";
import {
  getActualFixedItemAmount,
  getFixedItemVersion,
  isItemActiveInMonth,
  resolveFixedItemForMonth,
} from "./financeUtils";

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
    const rent = {
      id: "rent",
      amount: 1200,
      day: 10,
      startDate: "2026-01-01T00:00:00",
    };
    expect(
      getActualFixedItemAmount(rent, "expense", 2026, 10, variations),
    ).toBe(0);
    expect(getActualFixedItemAmount(rent, "income", 2026, 10, variations)).toBe(
      1200,
    );
    expect(
      getActualFixedItemAmount(rent, "expense", 2026, 11, variations),
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

describe("histórico de versões das fixas", () => {
  const rent = {
    id: "rent",
    amount: 1650,
    categoryId: "cat-b",
    day: 15,
    startDate: "2026-01-01T03:00:00.000Z",
    versions: [
      {
        effectiveFrom: "2026-01-01",
        amount: 1500,
        categoryId: "cat-a",
        day: 10,
      },
      {
        effectiveFrom: "2026-12-01",
        amount: 1650,
        categoryId: "cat-a",
        day: 10,
      },
      {
        effectiveFrom: "2027-01-01",
        amount: 1650,
        categoryId: "cat-b",
        day: 15,
      },
    ],
  };

  it("um reajuste em dezembro preserva os meses anteriores", () => {
    expect(getActualFixedItemAmount(rent, "expense", 2026, 10, [])).toBe(1500);
    expect(getActualFixedItemAmount(rent, "expense", 2026, 11, [])).toBe(1650);
    expect(getActualFixedItemAmount(rent, "expense", 2027, 5, [])).toBe(1650);
  });

  it("uma variação mensal sobrepõe o valor da versão", () => {
    const variations = [
      {
        id: "v",
        fixedItemId: "rent",
        type: "expense" as const,
        year: 2026,
        month: 9,
        amount: 1600,
      },
    ];
    const october = resolveFixedItemForMonth(
      rent,
      "expense",
      2026,
      9,
      variations,
    );
    expect(october).toMatchObject({
      amount: 1500,
      actualAmount: 1600,
      hasVariation: true,
    });
  });

  it("mudança de dia e categoria só vale a partir do mês da versão", () => {
    expect(getFixedItemVersion(rent, 2026, 11)).toEqual({
      amount: 1650,
      categoryId: "cat-a",
      day: 10,
    });
    expect(getFixedItemVersion(rent, 2027, 0)).toEqual({
      amount: 1650,
      categoryId: "cat-b",
      day: 15,
    });
  });

  it("dia 31 vira o último dia em meses curtos", () => {
    const item = {
      id: "x",
      amount: 10,
      day: 31,
      startDate: "2026-01-01T03:00:00.000Z",
    };
    expect(
      resolveFixedItemForMonth(item, "expense", 2026, 1, [])?.occurrenceDay,
    ).toBe(28);
    expect(
      resolveFixedItemForMonth(item, "expense", 2026, 3, [])?.occurrenceDay,
    ).toBe(30);
    expect(
      resolveFixedItemForMonth(item, "expense", 2026, 0, [])?.occurrenceDay,
    ).toBe(31);
  });

  it("item sem versões usa os campos de topo e meses fora da vigência retornam null", () => {
    const item = {
      id: "y",
      amount: 99,
      categoryId: "c",
      day: 5,
      startDate: "2026-03-01T03:00:00.000Z",
    };
    expect(getFixedItemVersion(item, 2026, 5)).toEqual({
      amount: 99,
      categoryId: "c",
      day: 5,
    });
    expect(resolveFixedItemForMonth(item, "expense", 2026, 1, [])).toBeNull();
  });
});
