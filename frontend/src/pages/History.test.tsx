import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { installApiFixture, requests } from "../test/fixtures";

const at = (key: string) => new Date(`${key}T12:00:00`).toISOString();
const octoberAndNovember = {
  "/transactions": (config: { params?: { month: number } }) =>
    config.params?.month === 10
      ? [
          { id: "o1", type: "expense", description: "Mercado", amount: 3940, categoryId: "food", date: at("2026-10-10") },
          { id: "o2", type: "income", description: "Salário", amount: 7200, categoryId: "salary", date: at("2026-10-05") },
        ]
      : config.params?.month === 11
        ? [{ id: "n1", type: "expense", description: "Padaria", amount: 100, categoryId: "food", date: at("2026-11-02") }]
        : [],
  "/budgets": [{ categoryId: "food", month: "2026-09", amount: 4150, repeat: true }],
};

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 3, 12));
});
afterEach(() => vi.useRealTimers());

describe("Histórico e fechamento", () => {
  it("lista os meses com o resultado (orçamento − gasto)", async () => {
    installApiFixture(octoberAndNovember);
    window.history.replaceState({}, "", "/relatorios/historico");
    render(<App />);
    const october = await screen.findByRole("link", { name: /Outubro 2026/ });
    expect(within(october).getByText("Sobrou R$ 210,00")).toBeVisible();
    expect(within(screen.getByRole("link", { name: /Novembro 2026/ })).getByText("Restam R$ 4.050,00")).toBeVisible();
  });

  it("fechamento guarda a sobra numa meta com o mês de origem", async () => {
    installApiFixture({
      ...octoberAndNovember,
      "/goals": [{ id: "g1", name: "Reserva", target: 10000, deadline: null, saved: 1000, createdAt: "2026-01-01T00:00:00Z", contributions: [] }],
      "post /goals/g1/contributions": { id: "c1", amount: 210, date: at("2026-11-03") },
    });
    window.history.replaceState({}, "", "/relatorios/historico/2026-10");
    render(<App />);
    const user = userEvent.setup();
    expect(await screen.findByText("Sobrou R$ 210,00")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Guardar a sobra numa meta" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Guardar a sobra" })).getByRole("button", { name: /Reserva/ }));
    const sheet = await screen.findByRole("dialog", { name: "Guardar na meta" });
    expect((within(sheet).getByLabelText("Valor") as HTMLInputElement).value).toMatch(/^R\$\s210$/);
    await user.click(within(sheet).getByRole("button", { name: "Confirmar aporte" }));
    await waitFor(() =>
      expect(requests.find((r) => r.method === "post" && r.url === "/goals/g1/contributions")?.data).toMatchObject({ amount: 210, sourceMonth: "2026-10" }),
    );
  });

  it("mostra a virada uma vez e marca como vista", async () => {
    installApiFixture({
      ...octoberAndNovember,
      "/auth/me": { user: { id: "u", name: "Ana", email: "ana@example.test", onboardingCompletedAt: "2026-09-01T00:00:00Z", lastClosingSeen: "2026-09" } },
      "post /months/2026-10/seen": { lastClosingSeen: "2026-10" },
    });
    window.history.replaceState({}, "", "/");
    render(<App />);
    const user = userEvent.setup();
    expect(await screen.findByRole("heading", { name: "Outubro fechou. Sobraram R$ 210,00." })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Começar novembro" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: /Outubro fechou/ })).not.toBeInTheDocument());
    expect(requests.some((r) => r.method === "post" && r.url === "/months/2026-10/seen")).toBe(true);
  });

  it("não mostra a virada já vista", async () => {
    installApiFixture({
      ...octoberAndNovember,
      "/auth/me": { user: { id: "u", name: "Ana", email: "ana@example.test", onboardingCompletedAt: "2026-09-01T00:00:00Z", lastClosingSeen: "2026-10" } },
    });
    window.history.replaceState({}, "", "/");
    render(<App />);
    await screen.findAllByRole("heading", { name: "Início" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole("heading", { name: /Outubro fechou/ })).not.toBeInTheDocument();
  });
});
