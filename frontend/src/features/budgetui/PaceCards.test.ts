import { describe, expect, it } from "vitest";
import { weekOf, weekStatus } from "../budget";
import type { LedgerEntry } from "../ledger";
import { forecastMessage, paceWeekMessage } from "./PaceCards";

const forecast = { p10: 100, p50: 300, p90: 500, pWithin: 0.8 };
const expense = (date: string, amount: number): LedgerEntry => ({
  key: date, source: "transaction", id: date, type: "expense", description: "x", amount, categoryId: null, date, upcoming: false, cardId: null,
});

describe("textos do ritmo por referência", () => {
  it("estimativa do mês fala do limite, da renda ou do mês típico", () => {
    expect(forecastMessage(forecast, "budget")).toBe("Deve sobrar ~R$ 300 (restante entre R$ 100 e R$ 500). Chance de fechar dentro do limite: 80%.");
    expect(forecastMessage(forecast, "income")).toBe("Deve sobrar ~R$ 300 da renda (restante entre R$ 100 e R$ 500). Chance de não gastar mais do que entrou: 80%.");
    expect(forecastMessage({ ...forecast, p50: -200 }, "income")).toMatch(/^Deve faltar ~R\$ 200 da renda/);
    expect(forecastMessage(forecast, "typical")).toMatch(/^Deve fechar ~R\$ 300 abaixo do mês típico .* Chance de gastar menos que no mês típico: 80%\.$/);
    expect(forecastMessage({ ...forecast, p50: -200 }, "typical")).toMatch(/^Deve fechar ~R\$ 200 acima do mês típico/);
  });

  it("semana: com orçamento igual à Início; sem orçamento, fala da referência", () => {
    const week = weekOf("2026-11-18");
    const over = weekStatus(1500, [expense("2026-11-16", 800)], week, "2026-11-18");
    const near = weekStatus(1500, [expense("2026-11-16", 560)], week, "2026-11-18");
    expect(paceWeekMessage(over, "budget")).toMatch(/do limite da semana\.$/);
    expect(paceWeekMessage(over, "typical")).toMatch(/^Você passou .* de uma semana típica\.$/);
    expect(paceWeekMessage(near, "income")).toMatch(/^Atenção: você já usou \d+% da parte da renda da semana\.$/);
  });
});
