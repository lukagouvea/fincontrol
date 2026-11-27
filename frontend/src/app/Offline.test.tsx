import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { installApiFixture, requests } from "../test/fixtures";
import { keypadDisplay, keypadValue, pressKey } from "../features/transactions/QuickExpenseSheet";

let online = true;
beforeEach(() => {
  localStorage.clear();
  online = true;
  Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => online });
});
afterEach(() => {
  online = true;
});

const queueKey = "fincontrol:offline-queue:test-user";

describe("teclado do gasto rápido", () => {
  it("monta o valor com vírgula e até 2 casas", () => {
    const type = (keys: string[]) => keys.reduce(pressKey, "");
    expect(type(["2", "0"])).toBe("20");
    expect(keypadDisplay("20")).toBe("20,00");
    expect(type([",", "5"])).toBe("0,5");
    expect(type(["1", ",", "2", "5", "9"])).toBe("1,25");
    expect(type(["1", "2", "3", "4", ",", "5"])).toBe("1234,5");
    expect(keypadDisplay("1234,5")).toBe("1.234,50");
    expect(type(["9", "9", "back"])).toBe("9");
    expect(keypadValue("1234,5")).toBe(1234.5);
  });
});

describe("atalhos e fila offline", () => {
  it("o atalho ?rapido=1 abre o Gasto rápido e salva pelo teclado", async () => {
    installApiFixture({ "post /transactions": { id: "n1" } });
    window.history.replaceState({}, "", "/?rapido=1");
    render(<App />);
    const user = userEvent.setup();
    const sheet = await screen.findByRole("dialog", { name: "Gasto rápido" });
    await waitFor(() => expect(window.location.search).toBe(""));
    await user.click(within(sheet).getByRole("button", { name: "2" }));
    await user.click(within(sheet).getByRole("button", { name: "0" }));
    expect(within(sheet).getByLabelText("Valor: R$ 20,00")).toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: "Salvar gasto" }));
    await waitFor(() => expect(requests.find((r) => r.method === "post" && r.url === "/transactions")?.data).toMatchObject({ amount: 20, description: "Alimentação", categoryId: "food", type: "expense", cardId: null }));
  });

  it("sem conexão guarda o lançamento e envia quando a internet volta", async () => {
    online = false;
    installApiFixture({ "post /transactions": { id: "n1" } });
    window.history.replaceState({}, "", "/transacoes");
    render(<App />);
    const user = userEvent.setup();
    expect(await screen.findByText("Sem conexão")).toBeVisible();
    await user.click((await screen.findAllByRole("button", { name: "Nova transação" }))[0]);
    const form = await screen.findByRole("dialog", { name: "Nova transação" });
    expect(within(form).getByText(/Parcelas e recorrências precisam de conexão/)).toBeVisible();
    expect(within(form).queryByRole("switch", { name: "Repetir todo mês" })).not.toBeInTheDocument();
    await user.type(within(form).getByLabelText("Valor"), "3500");
    await user.type(within(form).getByLabelText("Descrição"), "Feira");
    await user.click(within(form).getByRole("button", { name: "Salvar despesa" }));
    expect(await screen.findByText(/lançamento guardado. Será enviado/)).toBeVisible();
    expect(requests.some((r) => r.method === "post" && r.url === "/transactions")).toBe(false);
    expect(JSON.parse(localStorage.getItem(queueKey) ?? "[]")).toHaveLength(1);

    online = true;
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    await waitFor(() => expect(requests.find((r) => r.method === "post" && r.url === "/transactions")?.data).toMatchObject({ description: "Feira", amount: 35 }));
    await waitFor(() => expect(localStorage.getItem(queueKey)).toBeNull());
    expect(await screen.findByText("1 lançamento guardado foi enviado")).toBeVisible();
  });

  it("se a rede cair no envio, guarda; erro do servidor (5xx) mantém na fila; 4xx descarta", async () => {
    localStorage.setItem(
      queueKey,
      JSON.stringify([
        { id: "a", createdAt: "x", payload: { description: "A", amount: 1, categoryId: "food", date: "2026-11-01T03:00:00.000Z", type: "expense", cardId: null } },
        { id: "b", createdAt: "x", payload: { description: "B", amount: 2, categoryId: "food", date: "2026-11-01T03:00:00.000Z", type: "expense", cardId: null } },
      ]),
    );
    let call = 0;
    installApiFixture({
      "post /transactions": () => {
        call += 1;
        if (call === 1) throw Object.assign(new Error("400"), { response: { status: 400 } }); // A: recusado
        throw Object.assign(new Error("503"), { response: { status: 503 } }); // B: servidor instável
      },
    });
    window.history.replaceState({}, "", "/transacoes");
    render(<App />);
    expect(await screen.findByText(/1 lançamento guardado não pôde ser enviado e foi descartado/)).toBeVisible();
    const left = JSON.parse(localStorage.getItem(queueKey) ?? "[]");
    expect(left.map((item: { id: string }) => item.id)).toEqual(["b"]);
    expect(screen.getByText("Lançamentos aguardando envio")).toBeVisible();
  });

  it("sessão expirada (401) ao reenviar mantém tudo na fila, sem descartar", async () => {
    localStorage.setItem(
      queueKey,
      JSON.stringify([
        { id: "a", createdAt: "x", payload: { description: "A", amount: 1, categoryId: "food", date: "2026-11-01T03:00:00.000Z", type: "expense", cardId: null } },
        { id: "b", createdAt: "x", payload: { description: "B", amount: 2, categoryId: "food", date: "2026-11-01T03:00:00.000Z", type: "expense", cardId: null } },
      ]),
    );
    installApiFixture({ "post /transactions": () => { throw Object.assign(new Error("401"), { response: { status: 401 } }); } });
    window.history.replaceState({}, "", "/transacoes");
    render(<App />);
    expect(await screen.findByText("Lançamentos aguardando envio")).toBeVisible();
    await waitFor(() => expect(requests.filter((r) => r.method === "post" && r.url === "/transactions").length).toBeGreaterThan(0));
    expect(screen.queryByText(/descartado/)).not.toBeInTheDocument();
    const left = JSON.parse(localStorage.getItem(queueKey) ?? "[]");
    expect(left.map((item: { id: string }) => item.id)).toEqual(["a", "b"]);
  });
});
