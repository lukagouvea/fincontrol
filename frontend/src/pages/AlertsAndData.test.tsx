import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { installApiFixture, requests } from "../test/fixtures";

const at = (key: string) => new Date(`${key}T12:00:00`).toISOString();
const user = { id: "u", name: "Ana", email: "ana@example.test", onboardingCompletedAt: "2026-01-01T00:00:00Z", lastClosingSeen: "2026-10" };
const overLimit = {
  "/budgets": [{ categoryId: "food", month: "2026-11", amount: 100, repeat: true }],
  "/transactions": (config: { params?: { month: number } }) =>
    config.params?.month === 11 ? [{ id: "t1", type: "expense", description: "Mercado", amount: 150, categoryId: "food", date: at("2026-11-10") }] : [],
};

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 18, 12));
});
afterEach(() => vi.useRealTimers());

describe("Alertas", () => {
  it("o sino mostra não lidos; abrir a central lista e marca como vistos", async () => {
    installApiFixture({ ...overLimit, "/auth/me": { user: { ...user, alertsReadAt: null } }, "post /me/alerts/read": { alertsReadAt: at("2026-11-18") } });
    window.history.replaceState({}, "", "/");
    render(<App />);
    const user1 = userEvent.setup();
    const bell = await screen.findByRole("link", { name: /Alertas: \d+ não/ });
    await user1.click(bell);
    expect(await screen.findByText("Alimentação passou do limite do mês")).toBeVisible();
    expect(screen.getByText("R$ 50,00 acima dos R$ 100,00 definidos.")).toBeVisible();
    await waitFor(() => expect(requests.some((r) => r.method === "post" && r.url === "/me/alerts/read")).toBe(true));
  });

  it("desligar um tipo de alerta salva e some da central", async () => {
    installApiFixture({ ...overLimit, "/auth/me": { user }, "put /me/alerts/preferences": { alertPrefs: { categorias: false } } });
    window.history.replaceState({}, "", "/ajustes/alertas");
    render(<App />);
    const user1 = userEvent.setup();
    const toggle = await screen.findByRole("switch", { name: "Limite das categorias" });
    expect(toggle).toBeChecked();
    expect(screen.getByRole("switch", { name: "Recorrência lançada" })).not.toBeChecked();
    await user1.click(toggle);
    await waitFor(() => expect(requests.find((r) => r.url === "/me/alerts/preferences")?.data).toEqual({ categorias: false }));
    expect(toggle).not.toBeChecked();
  });
});

describe("Segurança e dados", () => {
  it("apagar tudo só libera ao digitar APAGAR", async () => {
    installApiFixture({ "/auth/me": { user }, "post /me/wipe": { wiped: true } });
    window.history.replaceState({}, "", "/ajustes/dados");
    render(<App />);
    const user1 = userEvent.setup();
    expect(await screen.findByRole("link", { name: /Exportar meus dados/ })).toHaveAttribute("href", expect.stringContaining("/me/export.csv"));
    await user1.click(screen.getByRole("button", { name: /Apagar todos os dados/ }));
    const sheet = await screen.findByRole("dialog", { name: "Apagar todos os dados?" });
    const confirm = within(sheet).getByRole("button", { name: "Apagar tudo" });
    expect(confirm).toBeDisabled();
    await user1.type(within(sheet).getByLabelText("Para confirmar, digite APAGAR"), "APAGAR");
    await user1.click(confirm);
    await waitFor(() => expect(requests.find((r) => r.url === "/me/wipe")?.data).toEqual({ confirm: "APAGAR" }));
  });

  it("excluir a conta com senha errada avisa e não sai", async () => {
    installApiFixture({ "/auth/me": { user }, "delete /me": Object.assign(new Error("403"), { response: { status: 403 } }) });
    window.history.replaceState({}, "", "/ajustes/dados");
    render(<App />);
    const user1 = userEvent.setup();
    await user1.click(await screen.findByRole("button", { name: /Excluir minha conta/ }));
    const sheet = await screen.findByRole("dialog", { name: "Excluir sua conta?" });
    await user1.type(within(sheet).getByLabelText("Sua senha"), "errada");
    await user1.click(within(sheet).getByRole("button", { name: "Excluir minha conta" }));
    expect(await within(sheet).findByText("Senha incorreta.")).toBeVisible();
    expect(window.location.pathname).toBe("/ajustes/dados");
  });
});
