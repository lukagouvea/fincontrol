import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { installApiFixture, requests } from "../test/fixtures";

beforeEach(() => localStorage.clear());

const novemberData = {
  "/transactions": [
    { id: "bonus", type: "income", amount: 500, categoryId: "salary", description: "Bônus", date: "2026-11-05T12:00:00Z" },
    { id: "food-one", type: "expense", amount: 100, categoryId: "food", description: "Mercado", date: "2026-11-06T12:00:00Z" },
    {
      id: "part",
      type: "expense",
      amount: 150,
      categoryId: "food",
      description: "Parcela",
      date: "2026-11-07T12:00:00Z",
      installmentGroupId: "g",
      installmentInfo: { current: 1, total: 3 },
    },
    { id: "variation-child", type: "expense", amount: 800, categoryId: "food", description: "Variação", recurringRuleId: "rent", date: "2026-11-10T12:00:00Z" },
  ],
  "/recurring?type=income": [
    { id: "pay", type: "income", amount: 2000, categoryId: "salary", description: "Salário", day: 5, startDate: "2026-01-01T12:00:00Z" },
  ],
  "/recurring?type=expense": [
    { id: "rent", type: "expense", amount: 1000, categoryId: "food", description: "Aluguel", day: 10, startDate: "2026-01-01T12:00:00Z" },
    { id: "ended", type: "expense", amount: 9000, categoryId: "food", description: "Encerrada", day: 10, startDate: "2026-01-01T12:00:00Z", endDate: "2026-10-15T12:00:00Z" },
  ],
  "/recurring/variations": [{ id: "variation-child", fixedItemId: "rent", type: "expense", amount: 800, year: 2026, month: 10 }],
};

describe("Relatórios", () => {
  it("soma parcelas e variações sem duplicar a variação e ignora a recorrente encerrada", async () => {
    installApiFixture(novemberData);
    window.history.replaceState({}, "", "/relatorios?mes=11&ano=2026");
    render(<App />);
    const expense = await screen.findByRole("region", { name: "Despesas do mês" });
    await waitFor(() => expect(within(expense).getByText("R$ 1.050,00")).toBeVisible());
    expect(within(screen.getByRole("region", { name: "Receitas do mês" })).getByText("R$ 2.500,00")).toBeVisible();
    expect(within(screen.getByRole("region", { name: "Saldo do mês" })).getByText("R$ 1.450,00")).toBeVisible();
    expect(screen.getByRole("region", { name: "Taxa de poupança" })).toHaveTextContent("58%");
    expect(screen.getByRole("img", { name: /Despesas por categoria: Alimentação 100% \(R\$ 1\.050,00\)/ })).toBeInTheDocument();
  });

  it("mostra receitas por categoria pelo endereço e carrega 12 meses só quando pedido", async () => {
    installApiFixture(novemberData);
    window.history.replaceState({}, "", "/relatorios?mes=11&ano=2026&aba=receitas");
    render(<App />);
    const user = userEvent.setup();
    expect(await screen.findByRole("radio", { name: "Receitas" })).toHaveAttribute("aria-checked", "true");
    expect(await screen.findByRole("img", { name: /Receitas por categoria: Trabalho 100%/ })).toBeInTheDocument();
    await screen.findByRole("figure", { name: "Receitas e despesas por mês" });
    const monthRequests = () => requests.filter((r) => r.method === "get" && r.url === "/transactions").length;
    expect(monthRequests()).toBe(6);
    await user.click(screen.getByRole("radio", { name: "12m" }));
    await waitFor(() => expect(monthRequests()).toBe(12));
  });
});
