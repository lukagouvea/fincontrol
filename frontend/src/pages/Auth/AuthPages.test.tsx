import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../../App";
import { installApiFixture, requests } from "../../test/fixtures";

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });

beforeEach(() => localStorage.clear());

describe("Entrar e Criar conta", () => {
  it("explica senha errada e volta para a página pedida depois de entrar", async () => {
    let attempts = 0;
    installApiFixture({
      "/auth/me": httpError(401),
      "post /auth/login": () => {
        attempts += 1;
        if (attempts === 1) throw httpError(401);
        return { user: { id: "u", name: "Ana", email: "ana@example.test" } };
      },
    });
    window.history.replaceState({}, "", "/relatorios");
    render(<App />);
    const user = userEvent.setup();
    await waitFor(() => expect(window.location.pathname).toBe("/entrar"));
    await user.type(await screen.findByLabelText("E-mail"), "ana@example.test");
    await user.type(screen.getByLabelText("Senha"), "errada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.");
    expect(screen.getByLabelText("Senha")).toHaveValue("errada");

    await user.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(window.location.pathname).toBe("/relatorios"));
  });

  it("depois de \"Sair da conta\", entrar de novo começa no Início", async () => {
    const ana = { id: "u", name: "Ana", email: "ana@example.test", onboardingCompletedAt: "2026-01-01T00:00:00Z" };
    installApiFixture({
      "/auth/me": { user: ana },
      "post /auth/logout": {},
      "post /auth/login": { user: ana },
    });
    window.history.replaceState({}, "", "/ajustes");
    render(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Sair da conta" }));
    await waitFor(() => expect(window.location.pathname).toBe("/entrar"));
    await user.type(await screen.findByLabelText("E-mail"), "ana@example.test");
    await user.type(screen.getByLabelText("Senha"), "certa");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(window.location.pathname).toBe("/"));
  });

  it("valida o cadastro antes de enviar e avisa e-mail já cadastrado", async () => {
    installApiFixture({ "/auth/me": httpError(401), "post /auth/signup": httpError(409) });
    window.history.replaceState({}, "", "/criar-conta");
    render(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Criar conta" }));
    expect(screen.getByText("Use pelo menos 2 letras.")).toBeVisible();
    expect(screen.getByText("Informe um e-mail válido.")).toBeVisible();
    expect(requests.some((r) => r.url === "/auth/signup")).toBe(false);

    await user.type(screen.getByLabelText("Nome"), "Ana");
    await user.type(screen.getByLabelText("E-mail"), "ana@example.test");
    await user.type(screen.getByLabelText("Senha"), "segredo1");
    await user.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Este e-mail já está cadastrado.");
  });
});
