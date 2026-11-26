import { describe, expect, it } from "vitest";
import { formatMoney, formatSignedMoney, MINUS, sumMoney } from "./money";

describe("money", () => {
  it("formata em pt-BR com espaço comum", () => {
    expect(formatMoney(1234.56)).toBe("R$ 1.234,56");
    expect(formatMoney(0)).toBe("R$ 0,00");
    expect(formatMoney(-0.001)).toBe("R$ 0,00");
    expect(formatMoney(2508.4, { cents: false })).toBe("R$ 2.508");
  });

  it("usa sinal explícito por tipo", () => {
    expect(formatSignedMoney(23.3, "expense")).toBe(`${MINUS} R$ 23,30`);
    expect(formatSignedMoney(-23.3, "expense")).toBe(`${MINUS} R$ 23,30`);
    expect(formatSignedMoney(7200, "income")).toBe("+ R$ 7.200,00");
    expect(formatSignedMoney(-5, "neutral")).toBe(`${MINUS} R$ 5,00`);
  });

  it("soma sem erro de ponto flutuante", () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney([19.9, 0.1, 30.2])).toBe(50.2);
  });
});
