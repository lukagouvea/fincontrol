import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { installApiFixture, requests } from "../test/fixtures";

const at = (key: string) => new Date(`${key}T12:00:00`).toISOString();

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 18, 12)); // quarta, 18/nov/2026
});
afterEach(() => vi.useRealTimers());

const withSpending = {
  "/budgets": [{ categoryId: "food", month: "2026-10", amount: 2500, repeat: true }],
  "/transactions": [
    { id: "a", type: "expense", description: "Mercado", amount: 600, categoryId: "food", date: at("2026-11-03") },
    { id: "b", type: "expense", description: "Feira", amount: 400, categoryId: "food", date: at("2026-11-10") },
    { id: "c", type: "expense", description: "Padaria", amount: 30, categoryId: "food", date: at("2026-11-16") },
    { id: "d", type: "expense", description: "Café", amount: 31.3, categoryId: "food", date: at("2026-11-17") },
  ],
};

describe("Orçamento", () => {
  it("define os limites do mês e repete nos próximos", async () => {
    installApiFixture({ "put /budgets/2026-11": { saved: 1 } });
    window.history.replaceState({}, "", "/orcamento");
    render(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Definir orçamento" }));
    const sheet = await screen.findByRole("dialog", { name: "Limites de novembro" });
    await user.type(within(sheet).getByLabelText("Limite de Alimentação"), "1200");
    expect(within(sheet).getByText("R$ 1.200,00")).toBeVisible();
    expect(within(sheet).getByRole("switch", { name: "Repetir nos próximos meses" })).toBeChecked();
    await user.click(within(sheet).getByRole("button", { name: "Salvar limites" }));
    await waitFor(() =>
      expect(requests.find((r) => r.method === "put" && r.url === "/budgets/2026-11")?.data).toEqual({
        repeat: true,
        limits: [{ categoryId: "food", amount: 1200 }],
      }),
    );
  });

  it("mostra o restante do mês com o limite repetido de outubro", async () => {
    installApiFixture(withSpending);
    window.history.replaceState({}, "", "/orcamento");
    render(<App />);
    expect(await screen.findByText("R$ 1.438,70")).toBeVisible();
    expect(screen.getByText("R$ 1.061,30 de R$ 2.500,00")).toBeVisible();
  });

  it("limite de categoria arquivada (ex.: mesclada) não soma no orçamento do mês", async () => {
    installApiFixture({
      ...withSpending,
      "/categories": [
        { id: "food", name: "Alimentação", type: "expense", active: true, color: "#16836b" },
        { id: "fun", name: "Lazer", type: "expense", active: false, color: "#16836b" },
        { id: "salary", name: "Trabalho", type: "income", active: true, color: "#5d6b80" },
      ],
      "/budgets": [
        { categoryId: "food", month: "2026-10", amount: 2500, repeat: true },
        { categoryId: "fun", month: "2026-10", amount: 300, repeat: true },
      ],
    });
    window.history.replaceState({}, "", "/orcamento");
    render(<App />);
    // Só Alimentação (2.500): o limite de Lazer (300), arquivada, fica de fora.
    expect(await screen.findByText("R$ 1.438,70")).toBeVisible();
    expect(screen.getByText(/Limite: R\$\s2\.500,00/)).toBeVisible();
  });

  it("Início mostra o limite da semana calculado na segunda", async () => {
    installApiFixture(withSpending);
    window.history.replaceState({}, "", "/");
    render(<App />);
    const week = await screen.findByRole("region", { name: "Esta semana" });
    // Variável 2.500 − 1.000 gastos antes de 16/nov = 1.500 ÷ 15 dias × 7 = 700.
    expect(within(week).getByText("Limite R$ 700,00")).toBeVisible();
    expect(within(week).getByText("R$ 638,70")).toBeVisible();
    expect(within(week).getByText("No ritmo: cerca de R$ 128 por dia até domingo.")).toBeVisible();
  });
});
