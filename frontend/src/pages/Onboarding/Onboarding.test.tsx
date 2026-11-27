import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../../App";
import { installApiFixture, requests } from "../../test/fixtures";

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });
const newUser = { id: "u-new", name: "Nova", email: "nova@example.test", onboardingCompletedAt: null };

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 18, 12));
});
afterEach(() => vi.useRealTimers());

describe("Primeiro uso", () => {
  it("sem sessão, o início leva às boas-vindas", async () => {
    installApiFixture({ "/auth/me": httpError(401) });
    window.history.replaceState({}, "", "/");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Seu dinheiro, sem planilha" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/criar-conta");
  });

  it("conta nova configura cartão e orçamento e chega ao Início com o checklist", async () => {
    installApiFixture({
      "/auth/me": { user: newUser },
      "post /cards": { id: "c1", name: "Aurora", last4: "4821", limit: 6000, closingDay: 8, dueDay: 15, color: "verde", archived: false, payments: [] },
      "post /onboarding/complete": { categoriesCreated: 9, onboardingCompletedAt: "2026-11-18T12:00:00.000Z" },
    });
    window.history.replaceState({}, "", "/");
    render(<App />);
    const user = userEvent.setup();
    await waitFor(() => expect(window.location.pathname).toBe("/configurar"));
    await user.type(await screen.findByLabelText("Apelido do cartão"), "Aurora");
    await user.type(screen.getByLabelText("Final"), "4821");
    await user.type(screen.getByLabelText("Limite"), "6000");
    await user.type(screen.getByLabelText("Fecha no dia"), "8");
    await user.type(screen.getByLabelText("Vence no dia"), "15");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByRole("heading", { name: "Quanto quer gastar por mês?" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "R$ 3.000" }));
    expect(screen.getByText("R$ 700 por semana")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Começar" }));
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(requests.find((r) => r.method === "post" && r.url === "/onboarding/complete")?.data).toEqual({ budget: 3000 });
    expect(requests.find((r) => r.method === "post" && r.url === "/cards")?.data).toMatchObject({ name: "Aurora", last4: "4821", closingDay: 8 });
    const checklist = await screen.findByRole("region", { name: "Comece por aqui" });
    expect(within(checklist).getByText("1 de 4")).toBeVisible();
  });

  it("pular o cartão e o orçamento ainda conclui a configuração", async () => {
    installApiFixture({
      "/auth/me": { user: newUser },
      "post /onboarding/complete": { categoriesCreated: 9, onboardingCompletedAt: "2026-11-18T12:00:00.000Z" },
    });
    window.history.replaceState({}, "", "/configurar");
    render(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Pular, só uso à vista" }));
    await user.click(await screen.findByRole("button", { name: "Começar" }));
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(requests.find((r) => r.url === "/onboarding/complete")?.data).toEqual({ budget: null });
    expect(requests.some((r) => r.method === "post" && r.url === "/cards")).toBe(false);
  });

  it("contas antigas (já configuradas) não veem o fluxo nem o checklist", async () => {
    installApiFixture({ "/auth/me": { user: { ...newUser, onboardingCompletedAt: "2025-01-01T00:00:00.000Z" } } });
    window.history.replaceState({}, "", "/");
    render(<App />);
    expect((await screen.findAllByRole("heading", { name: "Início" })).length).toBeGreaterThan(0);
    expect(screen.queryByRole("region", { name: "Comece por aqui" })).not.toBeInTheDocument();
  });

  it("orçamento inicial aparece como 'Geral' em Orçamento", async () => {
    installApiFixture({ "/budgets": [{ categoryId: null, month: "2026-11", amount: 3000, repeat: true }] });
    window.history.replaceState({}, "", "/orcamento");
    render(<App />);
    expect(await screen.findByText("Geral")).toBeVisible();
    expect(screen.getByText("R$ 0,00 de R$ 3.000,00")).toBeVisible();
  });
});
