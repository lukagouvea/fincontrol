import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import { installApiFixture } from "./test/fixtures";

beforeEach(() => {
  localStorage.clear();
  installApiFixture();
});

describe("navegação financeira", () => {
  it("leva links antigos de fixas para Recorrentes", async () => {
    window.history.replaceState({}, "", "/lancamentos?tipo=receita&grupo=fixas");
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe("/recorrentes"));
    expect(new URLSearchParams(window.location.search).get("tipo")).toBe(
      "receita",
    );
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
      await screen.findByRole("radio", { name: "Receitas" }),
    ).toHaveAttribute("aria-checked", "true");
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

});
