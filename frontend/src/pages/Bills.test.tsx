import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { installApiFixture, requests } from "../test/fixtures";

const at = (key: string) => new Date(`${key}T12:00:00`).toISOString();

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 27, 12)); // 27/nov/2026
});
afterEach(() => vi.useRealTimers());

const user = { id: "u", name: "Ana", email: "ana@example.test", onboardingCompletedAt: "2026-01-01T00:00:00Z", lastClosingSeen: "2026-10", paymentsTrackedFrom: "2026-11-01T00:00:00.000Z" };
const data = {
  "/auth/me": { user },
  "/recurring?type=expense": [
    { id: "rent", type: "expense", description: "Aluguel", amount: 1500, categoryId: "food", day: 5, startDate: "2026-01-01T12:00:00Z", cardId: null },
  ],
  "/transactions": [
    { id: "p2", type: "expense", description: "Curso", amount: 300, categoryId: "food", date: at("2026-11-27"), cardId: null, installmentGroupId: "g1", installmentInfo: { current: 2, total: 3 }, paidAt: null },
    { id: "pix", type: "expense", description: "Padaria", amount: 20, categoryId: "food", date: at("2026-11-26"), cardId: null },
  ],
  "put /recurring/rent/payments/2026-11": { ruleId: "rent", month: "2026-11", paidAt: "2026-11-27T15:00:00.000Z" },
  "put /transactions/p2/paid": { id: "p2", paidAt: "2026-11-27T15:00:00.000Z" },
};

describe("Contas a pagar", () => {
  it("Início lista a recorrente vencida e a parcela que vence hoje, e marca como paga", async () => {
    installApiFixture(data);
    window.history.replaceState({}, "", "/");
    render(<App />);
    const ui = userEvent.setup();
    const card = await screen.findByRole("region", { name: "Contas a pagar" });
    expect(within(card).getByText("1 vencida · R$ 1.800,00 no total")).toBeVisible();
    expect(within(card).getByText("Venceu há 22 dias")).toBeVisible();
    expect(within(card).getByText("Vence hoje · parcela 2 de 3")).toBeVisible();
    // Despesa avulsa À vista não é conta a pagar.
    expect(within(card).queryByText("Padaria")).not.toBeInTheDocument();

    await ui.click(within(card).getByRole("button", { name: "Marcar Aluguel como paga" }));
    await waitFor(() => expect(requests.find((r) => r.method === "put" && r.url === "/recurring/rent/payments/2026-11")?.data).toMatchObject({ paidAt: expect.stringMatching(/^2026-11-27T/) }));
    expect(await screen.findByText("Aluguel marcada como paga")).toBeVisible();
  });

  it("detalhe da parcela À vista mostra o status e marca como paga", async () => {
    installApiFixture(data);
    window.history.replaceState({}, "", "/transacoes");
    render(<App />);
    const ui = userEvent.setup();
    await ui.click(await screen.findByText("Curso"));
    expect(await screen.findByText("A pagar", { selector: "dd span" })).toBeVisible();
    await ui.click(screen.getByRole("button", { name: "Marcar como paga" }));
    await waitFor(() => expect(requests.find((r) => r.method === "put" && r.url === "/transactions/p2/paid")?.data).toMatchObject({ paidAt: expect.any(String) }));
  });
});
