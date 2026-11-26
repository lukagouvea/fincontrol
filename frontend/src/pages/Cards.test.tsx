import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { installApiFixture, requests } from "../test/fixtures";
import { groupPurchases } from "./Commitments";
import type { Transaction } from "../types/FinanceTypes";

const aurora = {
  id: "c1",
  name: "Aurora",
  last4: "4821",
  limit: 6000,
  closingDay: 8,
  dueDay: 15,
  color: "verde",
  archived: false,
  createdAt: "2026-01-01T12:00:00.000Z",
  payments: [],
};
const at = (key: string) => new Date(`${key}T12:00:00`).toISOString();

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 18, 12));
});
afterEach(() => vi.useRealTimers());

describe("Cartões", () => {
  it("cadastra um cartão guardando só os 4 últimos dígitos", async () => {
    installApiFixture({ "post /cards": { ...aurora, id: "new" } });
    window.history.replaceState({}, "", "/cartoes");
    render(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Adicionar cartão" }));
    const form = await screen.findByRole("dialog", { name: "Novo cartão" });
    await user.type(within(form).getByLabelText("Apelido"), "Aurora");
    await user.type(within(form).getByLabelText("Final do cartão"), "1234 5678 4821");
    expect(within(form).getByLabelText("Final do cartão")).toHaveValue("1234");
    await user.clear(within(form).getByLabelText("Final do cartão"));
    await user.type(within(form).getByLabelText("Final do cartão"), "4821");
    await user.type(within(form).getByLabelText("Limite"), "6000");
    await user.type(within(form).getByLabelText("Fecha dia"), "8");
    await user.type(within(form).getByLabelText("Vence dia"), "15");
    await user.click(within(form).getByRole("radio", { name: "Azul" }));
    await user.click(within(form).getByRole("button", { name: "Salvar cartão" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(requests.find((r) => r.method === "post" && r.url === "/cards")?.data).toEqual({
      name: "Aurora",
      last4: "4821",
      limit: 6000,
      closingDay: 8,
      dueDay: 15,
      color: "azul",
    });
  });

  it("mostra a fatura aberta e registra o pagamento sem criar gasto", async () => {
    installApiFixture({
      "/cards": [aurora],
      "/transactions/by-card/c1": [
        { id: "t1", type: "expense", description: "Mercado", amount: 142.3, categoryId: "food", date: at("2026-11-15"), cardId: "c1" },
        { id: "t2", type: "expense", description: "Restaurante", amount: 86.5, categoryId: "food", date: at("2026-11-14"), cardId: "c1" },
        { id: "t0", type: "expense", description: "Farmácia", amount: 40, categoryId: "food", date: at("2026-11-05"), cardId: "c1" },
      ],
      "post /cards/c1/payments": { id: "p1", invoiceMonth: "2026-12", amount: 228.8, paidAt: at("2026-11-18") },
    });
    window.history.replaceState({}, "", "/cartoes/c1/fatura");
    render(<App />);
    const user = userEvent.setup();
    const hero = await screen.findByRole("region", { name: "Fatura atual" });
    expect(within(hero).getByText("R$ 228,80")).toBeVisible();
    expect(within(hero).getByText("Fecha em 8 dez")).toBeVisible();
    expect(within(hero).getByText("Vence em 15 dez")).toBeVisible();
    expect(screen.queryByText("Farmácia")).not.toBeInTheDocument(); // fatura de novembro

    await user.click(screen.getByRole("button", { name: "Registrar pagamento" }));
    const sheet = await screen.findByRole("dialog", { name: "Pagar fatura" });
    expect(within(sheet).getByText(/não é um gasto novo/)).toBeVisible();
    await user.click(within(sheet).getByRole("button", { name: "Confirmar pagamento" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(requests.find((r) => r.method === "post" && r.url === "/cards/c1/payments")?.data).toMatchObject({
      invoiceMonth: "2026-12",
      amount: 228.8,
    });
    expect(requests.some((r) => r.method === "post" && r.url === "/transactions")).toBe(false);
  });

  it("lança uma compra no cartão, mostra a fatura em que cai e lembra a escolha", async () => {
    installApiFixture({ "/cards": [aurora] });
    window.history.replaceState({}, "", "/transacoes");
    render(<App />);
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole("button", { name: "Nova transação" }))[0]);
    const form = await screen.findByRole("dialog", { name: "Nova transação" });
    expect(await within(form).findByRole("button", { name: /À vista/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(within(form).getByRole("button", { name: /Aurora/ }));
    expect(within(form).getByText("Entra na fatura que fecha em 8 dez.")).toBeVisible();
    await user.type(within(form).getByLabelText("Valor"), "50");
    await user.type(within(form).getByLabelText("Descrição"), "Farmácia");
    await user.click(within(form).getByRole("button", { name: "Salvar despesa" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(requests.find((r) => r.method === "post" && r.url === "/transactions")?.data).toMatchObject({ cardId: "c1" });

    await user.click(screen.getAllByRole("button", { name: "Nova transação" })[0]);
    const again = await screen.findByRole("dialog", { name: "Nova transação" });
    expect(within(again).getByRole("button", { name: /Aurora/ })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("Compromissos", () => {
  it("agrupa parcelas por compra e soma o que falta depois do mês atual", () => {
    const parcel = (n: number, key: string, group = "g1") =>
      ({
        id: `${group}-${n}`,
        type: "expense",
        description: group === "g1" ? "Notebook" : "Geladeira",
        amount: group === "g1" ? 420 : 215,
        categoryId: "food",
        date: at(key),
        cardId: "c1",
        installmentGroupId: group,
        installmentNumber: n,
        installmentInfo: { current: n, total: group === "g1" ? 4 : 2 },
      }) as unknown as Transaction;
    const purchases = groupPurchases(
      [parcel(1, "2026-09-03"), parcel(2, "2026-10-03"), parcel(3, "2026-11-03"), parcel(4, "2026-12-03"), parcel(1, "2026-10-22", "g2"), parcel(2, "2026-11-22", "g2")],
      "2026-11-18",
    );
    expect(purchases.map((p) => [p.description, p.current, p.count, p.remaining, p.perMonth])).toEqual([
      ["Notebook", 3, 4, 420, 420],
      ["Geladeira", 2, 2, 0, 215],
    ]);
  });
});
