import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecentTransactions } from "./RecentTransactions";
import { UpcomingBills } from "./UpcomingBills";
import type { VariableExpense, FixedExpense } from "../../types/FinanceTypes";

beforeEach(() => {
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    matches: query === "(max-width: 767px)",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

it("mostra uma prévia curta das despesas no mobile e mantém as demais acessíveis", async () => {
  const date = new Date();
  const transactions: VariableExpense[] = Array.from(
    { length: 6 },
    (_, index) => ({
      id: String(index),
      description: "Despesa " + (index + 1),
      type: "expense",
      amount: 100 + index,
      categoryId: "food",
      date: date.toISOString(),
      isInstallment: false,
    }),
  );
  render(
    <RecentTransactions
      transactions={transactions}
      categories={[]}
      date={date}
    />,
  );
  expect(screen.getByText("Despesa 1")).toBeVisible();
  expect(screen.queryByText("Despesa 4")).not.toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: "Mostrar todas as despesas recentes" }),
  );
  expect(screen.getByText("Despesa 6")).toBeVisible();
  await userEvent.click(
    screen.getByRole("button", { name: "Recolher despesas recentes" }),
  );
  expect(screen.queryByText("Despesa 4")).not.toBeInTheDocument();
});

it("limita a prévia das contas no mobile sem omitir os compromissos restantes", async () => {
  const date = new Date();
  const fixedExpenses: FixedExpense[] = Array.from(
    { length: 6 },
    (_, index) => ({
      id: String(index),
      description: "Conta " + (index + 1),
      type: "expense",
      amount: 100,
      categoryId: "food",
      day: index + 1,
      startDate: "2026-01-01T12:00:00Z",
    }),
  );
  render(
    <UpcomingBills
      fixedExpenses={fixedExpenses}
      transactions={[]}
      monthlyVariations={[]}
      date={date}
    />,
  );
  expect(screen.getByText("Conta 3")).toBeVisible();
  expect(screen.getByText("Conta 4")).not.toBeVisible();
  await userEvent.click(screen.getByText("Ver mais 3 contas"));
  expect(screen.getByText("Conta 6")).toBeVisible();
});
