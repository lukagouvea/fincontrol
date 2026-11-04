import { beforeEach, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../App";
import { installApiFixture } from "../../test/fixtures";

beforeEach(() => {
  localStorage.clear();
});
it("preserva totais com parcelas, variações e encerramento sem duplicar a variação de uma fixa", async () => {
  installApiFixture({
    "/transactions": [
      {
        id: "bonus",
        type: "income",
        amount: 500,
        categoryId: "salary",
        description: "Bônus",
        date: "2026-11-05T12:00:00Z",
      },
      {
        id: "food-one",
        type: "expense",
        amount: 100,
        categoryId: "food",
        description: "Mercado",
        date: "2026-11-06T12:00:00Z",
        isInstallment: false,
      },
      {
        id: "part",
        type: "expense",
        amount: 150,
        categoryId: "food",
        description: "Parcela",
        date: "2026-11-07T12:00:00Z",
        isInstallment: true,
        installmentInfo: { current: 1, total: 3 },
      },
      {
        id: "variation-child",
        type: "expense",
        amount: 800,
        categoryId: "food",
        description: "Variação",
        recurringRuleId: "rent",
        date: "2026-11-10T12:00:00Z",
      },
    ],
    "/recurring?type=income": [
      {
        id: "pay",
        type: "income",
        amount: 2000,
        categoryId: "salary",
        description: "Salário",
        day: 5,
        startDate: "2026-01-01T12:00:00Z",
      },
    ],
    "/recurring?type=expense": [
      {
        id: "rent",
        type: "expense",
        amount: 1000,
        categoryId: "food",
        description: "Aluguel",
        day: 10,
        startDate: "2026-01-01T12:00:00Z",
      },
      {
        id: "ended",
        type: "expense",
        amount: 9000,
        categoryId: "food",
        description: "Encerrada",
        day: 10,
        startDate: "2026-01-01T12:00:00Z",
        endDate: "2026-10-15T12:00:00Z",
      },
    ],
    "/recurring/variations": [
      {
        id: "variation-child",
        fixedItemId: "rent",
        type: "expense",
        amount: 800,
        year: 2026,
        month: 10,
      },
    ],
  });
  window.history.replaceState({}, "", "/relatorio-mensal?mes=11&ano=2026");
  render(<App />);
  const balance = await screen.findByRole("region", { name: "Saldo líquido" });
  expect(within(balance).getByText(/1\.450,00/)).toBeVisible();
  const expense = screen.getByRole("region", { name: "Despesas do mês" });
  expect(within(expense).getByText(/1\.050,00/)).toBeVisible();
  await userEvent.click(screen.getByRole("tab", { name: "Despesas" }));
  expect(new URLSearchParams(window.location.search).get("mes")).toBe("11");
  expect(screen.getByText("Parcela")).toBeVisible();
  expect(screen.queryByText("Encerrada")).not.toBeInTheDocument();
});

it("preenche o investimento específico quando os dados do mês chegam", async () => {
  installApiFixture({
    "/investment/effective": {
      defaultMonthlyAmount: 200,
      overrideMonthlyAmount: 750,
      effectiveMonthlyAmount: 750,
    },
  });
  window.history.replaceState({}, "", "/relatorio-mensal?mes=11&ano=2026");
  render(<App />);
  const input = await screen.findByLabelText("Investimento deste mês");
  expect((input as HTMLInputElement).value).toContain("750");
  expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
});
