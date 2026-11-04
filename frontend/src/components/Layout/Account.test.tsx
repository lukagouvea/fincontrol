import { expect, it, afterEach, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../App";
import { installApiFixture, requests } from "../../test/fixtures";
import type { InternalAxiosRequestConfig } from "axios";

afterEach(() => vi.useRealTimers());

it("salva investimento decimal só por ação explícita e confirma o resultado", async () => {
  localStorage.clear();
  installApiFixture({
    "put /investment": (config: InternalAxiosRequestConfig) =>
      JSON.parse(config.data),
  });
  window.history.replaceState({}, "", "/lancamentos");
  render(<App />);
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Abrir conta e preferências" }),
  );
  const panel = screen.getByRole("dialog", { name: "Conta e preferências" });
  const input = within(panel).getByLabelText("Investimento mensal padrão");
  await user.clear(input);
  await user.type(input, "123,45");
  await user.tab();
  expect(
    requests.filter((r) => r.url === "/investment" && r.method === "put"),
  ).toHaveLength(0);
  await user.click(
    within(panel).getByRole("button", { name: "Salvar investimento" }),
  );
  await waitFor(() =>
    expect(
      requests.find((r) => r.url === "/investment" && r.method === "put")?.data,
    ).toEqual({ defaultMonthlyAmount: 123.45 }),
  );
  expect(await within(panel).findByRole("status")).toHaveTextContent(
    "Investimento mensal salvo.",
  );
});

it("limpa os dados financeiros da sessão anterior ao trocar de conta", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 3, 12));
  const transaction = {
    id: "one",
    type: "expense",
    amount: 80,
    categoryId: "food",
    date: "2026-11-03T12:00:00Z",
    isInstallment: false,
  };
  installApiFixture({
    "/transactions": [
      { ...transaction, description: "Dados da primeira conta" },
    ],
  });
  window.history.replaceState({}, "", "/lancamentos");
  render(<App />);
  expect(await screen.findByText("Dados da primeira conta")).toBeVisible();
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "Abrir conta e preferências" }),
  );
  await user.click(screen.getByRole("button", { name: "Sair da conta" }));
  await screen.findByRole("heading", { name: "Entrar" });
  installApiFixture({
    "post /auth/login": {
      user: { id: "second", name: "Bia", email: "bia@example.test" },
    },
    "/transactions": [
      { ...transaction, description: "Dados da segunda conta" },
    ],
  });
  await user.type(screen.getByLabelText("E-mail"), "bia@example.test");
  await user.type(screen.getByLabelText("Senha"), "123456");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  await screen.findByRole("heading", { name: "Início", level: 1 });
  await user.click(screen.getAllByRole("link", { name: "Lançamentos" })[0]);
  expect(await screen.findByText("Dados da segunda conta")).toBeVisible();
  expect(screen.queryByText("Dados da primeira conta")).not.toBeInTheDocument();
});
