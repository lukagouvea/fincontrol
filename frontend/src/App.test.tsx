import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import { installApiFixture, requests } from "./test/fixtures";

beforeEach(() => {
  localStorage.clear();
  installApiFixture();
});

describe("navegação financeira", () => {
  it("mantém os totais à vista e abre a composição do resumo somente quando solicitada", async () => {
    const date = new Date();
    date.setDate(3);
    date.setHours(12, 0, 0, 0);
    installApiFixture({
      "/transactions": [
        {
          id: "income",
          type: "income",
          description: "Salário",
          amount: 5000,
          categoryId: "salary",
          date: date.toISOString(),
        },
        {
          id: "expense",
          type: "expense",
          description: "Compras",
          amount: 2500,
          categoryId: "food",
          date: date.toISOString(),
          isInstallment: false,
        },
      ],
      "/recurring?type=expense": [
        {
          id: "rent",
          type: "expense",
          description: "Aluguel",
          amount: 800,
          categoryId: "food",
          day: 10,
          startDate: "2026-01-01T12:00:00Z",
        },
      ],
      "/investment/effective": {
        defaultMonthlyAmount: 500,
        overrideMonthlyAmount: null,
        effectiveMonthlyAmount: 500,
      },
    });
    window.history.replaceState({}, "", "/");
    render(<App />);
    const composition = await screen.findByRole("button", {
      name: "Composição e limites",
    });
    expect(
      within(screen.getByRole("group", { name: "Saldo do mês" })).getByText(
        /1\.700,00/,
      ),
    ).toBeVisible();
    expect(
      within(
        screen.getByRole("group", { name: "Orçamento planejado" }),
      ).getByText(/3\.700,00/),
    ).toBeVisible();
    expect(composition).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Receitas fixas")).not.toBeVisible();
    await userEvent.click(composition);
    expect(composition).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Receitas fixas")).toBeVisible();
    expect(screen.getByText("Compromissos e parcelas")).toBeVisible();
    expect(screen.getByText("Investimento reservado")).toBeVisible();
    await userEvent.click(composition);
    expect(screen.getByText("Receitas fixas")).not.toBeVisible();
  });

  it("abre a central e mantém tipo e grupo na URL ao alternar", async () => {
    window.history.replaceState({}, "", "/lancamentos");
    render(<App />);
    await screen.findByRole("heading", { name: "Lançamentos", level: 1 });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Receitas" }));
    await user.click(screen.getByRole("button", { name: "Fixas" }));
    expect(new URLSearchParams(window.location.search).get("tipo")).toBe(
      "receita",
    );
    expect(new URLSearchParams(window.location.search).get("grupo")).toBe(
      "fixas",
    );
    expect(
      screen.getByRole("button", { name: "Nova receita fixa" }),
    ).toBeVisible();
  });

  it("preserva links antigos de despesas fixas", async () => {
    window.history.replaceState({}, "", "/despesas-fixas");
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe("/recorrentes"));
    expect(new URLSearchParams(window.location.search).get("tipo")).toBe(
      "despesa",
    );
    expect(
      await screen.findByRole("heading", { name: "Recorrentes", level: 1 }),
    ).toBeVisible();
  });

  it("leva lançamentos antigos para Transações mantendo os filtros", async () => {
    window.history.replaceState({}, "", "/lancamentos?tipo=receita&grupo=variaveis");
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe("/transacoes"));
    expect(new URLSearchParams(window.location.search).get("tipo")).toBe(
      "receita",
    );
  });

  it("mantém o histórico de receitas acessível pela aba correta", async () => {
    window.history.replaceState({}, "", "/historico-rendas");
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe("/relatorios"));
    expect(new URLSearchParams(window.location.search).get("aba")).toBe(
      "receitas",
    );
    expect(
      await screen.findByRole("tab", { name: "Receitas" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("navega pela barra principal e marca a página atual", async () => {
    window.history.replaceState({}, "", "/transacoes");
    render(<App />);
    const user = userEvent.setup();
    // Barra lateral (desktop) e barra inferior (mobile) usam o mesmo rótulo.
    const [nav] = await screen.findAllByRole("navigation", {
      name: "Navegação principal",
    });
    await user.click(within(nav).getByRole("link", { name: "Categorias" }));
    expect(
      await screen.findByRole("heading", { name: "Categorias", level: 1 }),
    ).toBeVisible();
    expect(within(nav).getByRole("link", { name: "Categorias" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("redireciona o login antigo para Entrar", async () => {
    installApiFixture({ "/auth/me": new Error("401") });
    window.history.replaceState({}, "", "/login");
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe("/entrar"));
  });

  it("recupera o início quando a preferência de organização está inválida", async () => {
    localStorage.setItem("dashboardLayout", '{"unexpected":true}');
    window.history.replaceState({}, "", "/");
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Início", level: 1 }),
    ).toBeVisible();
    expect(
      await screen.findByRole("heading", { name: "Contas do mês" }),
    ).toBeVisible();
  });

  it("apresenta falha de rede sem transformar dados desconhecidos em zero", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    installApiFixture({ "/transactions": new Error("Sem conexão") });
    window.history.replaceState({}, "", "/lancamentos");
    render(<App />);
    await waitFor(
      () =>
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Não foi possível carregar",
        ),
      { timeout: 3000 },
    );
    expect(
      screen.queryByText("0 lançamentos no período"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Nenhuma despesa neste período"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toBeVisible();
  });

  it("carrega os doze meses de histórico apenas ao abrir os detalhes", async () => {
    window.history.replaceState({}, "", "/");
    render(<App />);
    await screen.findByRole("heading", { name: "Contas do mês" });
    expect(
      requests.filter((request) => request.url === "/transactions"),
    ).toHaveLength(1);
    await userEvent.click(screen.getByText("Detalhes do mês"));
    await waitFor(() =>
      expect(
        requests.filter((request) => request.url === "/transactions"),
      ).toHaveLength(13),
    );
  });

  it("não mostra saldo semanal enquanto o investimento está indisponível", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    installApiFixture({ "/investment/effective": new Error("Sem conexão") });
    window.history.replaceState({}, "", "/");
    render(<App />);
    await waitFor(
      () =>
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Não foi possível carregar seu investimento",
        ),
      { timeout: 3000 },
    );
    expect(screen.queryByText("Saldo da semana")).not.toBeInTheDocument();
    expect(screen.getByText("Total gasto na semana")).toBeVisible();
  });
});
