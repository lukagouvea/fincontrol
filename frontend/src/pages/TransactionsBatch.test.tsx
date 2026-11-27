import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { installApiFixture, requests } from "../test/fixtures";

const at = (key: string) => new Date(`${key}T12:00:00`).toISOString();
const aurora = { id: "c1", name: "Aurora", last4: "4821", limit: 6000, closingDay: 8, dueDay: 15, color: "verde", archived: false, payments: [] };
const data = {
  "/cards": [aurora],
  "/categories": [
    { id: "food", name: "Alimentação", type: "expense", active: true, color: "#000" },
    { id: "fun", name: "Lazer", type: "expense", active: true, color: "#000" },
    { id: "salary", name: "Trabalho", type: "income", active: true, color: "#000" },
  ],
  "/transactions": (config: { params?: { month: number } }) =>
    config.params?.month === 11
      ? [
          { id: "t1", type: "expense", description: "Padaria", amount: 38, categoryId: "food", date: at("2026-11-02"), cardId: null },
          { id: "t2", type: "expense", description: "Mercado", amount: 142.3, categoryId: "food", date: at("2026-11-03"), cardId: "c1" },
          { id: "t3", type: "expense", description: "Cinema", amount: 60, categoryId: "fun", date: at("2026-11-04"), cardId: "c1" },
        ]
      : config.params?.month === 10
        ? [{ id: "o1", type: "expense", description: "Farmácia", amount: 20, categoryId: "food", date: at("2026-10-20"), cardId: null }]
        : [],
};

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/transacoes");
});
afterEach(() => vi.useRealTimers());

describe("Filtros", () => {
  it("filtra por pagamento e categoria, mostra chips e total, e remove um filtro", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 18, 12));
    installApiFixture(data);
    render(<App />);
    const user = userEvent.setup();
    await screen.findByText("Padaria");
    await user.click(screen.getByRole("button", { name: "Filtros" }));
    const sheet = await screen.findByRole("dialog", { name: "Filtros" });
    await user.click(within(sheet).getByRole("button", { name: "Aurora" }));
    await user.click(within(sheet).getByRole("button", { name: "Alimentação" }));
    await user.click(within(sheet).getByRole("button", { name: "Mostrar 1 resultado" }));
    expect(screen.getByText("Mercado")).toBeVisible();
    expect(screen.queryByText("Padaria")).not.toBeInTheDocument();
    expect(screen.getByText("1 transação")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Remover filtro Alimentação" }));
    expect(screen.getByText("Cinema")).toBeVisible();
    expect(screen.getByText("2 transações")).toBeVisible();
  });

  it("período '3 meses' traz meses anteriores", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 18, 12));
    installApiFixture(data);
    render(<App />);
    const user = userEvent.setup();
    await screen.findByText("Padaria");
    await user.click(screen.getByRole("button", { name: "Filtros" }));
    const sheet = await screen.findByRole("dialog", { name: "Filtros" });
    await user.click(within(sheet).getByRole("button", { name: "3 meses" }));
    await user.click(await within(sheet).findByRole("button", { name: "Mostrar 4 resultados" }));
    expect(await screen.findByText("Farmácia")).toBeVisible();
  });
});

describe("Seleção em lote", () => {
  it("muda a categoria de várias e desfaz voltando cada uma à anterior", async () => {
    installApiFixture({ ...data, "post /transactions/batch": { updated: 2 } });
    render(<App />);
    const user = userEvent.setup();
    await screen.findByText("Padaria");
    await user.click(screen.getByRole("button", { name: "Selecionar" }));
    await user.click(screen.getByRole("button", { name: /Padaria/ }));
    await user.click(screen.getByRole("button", { name: /Cinema/ }));
    expect(screen.getByRole("heading", { name: "2 selecionadas" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Categoria" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Mudar categoria" })).getByRole("button", { name: "Lazer" }));
    await waitFor(() => expect(requests.filter((r) => r.url === "/transactions/batch")).toHaveLength(1));
    expect(requests.find((r) => r.url === "/transactions/batch")?.data).toEqual({ action: "update", ids: ["t3", "t1"], data: { categoryId: "fun" } });
    await user.click(await screen.findByRole("button", { name: "Desfazer" }));
    await waitFor(() => expect(requests.filter((r) => r.url === "/transactions/batch")).toHaveLength(3));
    const reverts = requests.filter((r) => r.url === "/transactions/batch").slice(1).map((r) => r.data);
    expect(reverts).toEqual(expect.arrayContaining([
      { action: "update", ids: ["t3"], data: { categoryId: "fun" } },
      { action: "update", ids: ["t1"], data: { categoryId: "food" } },
    ]));
  });

  it("exclui em lote com desfazer e só chama a API quando o aviso some", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    installApiFixture({ ...data, "post /transactions/batch": { deleted: 2 } });
    render(<App />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await screen.findByText("Padaria");
    await user.click(screen.getByRole("button", { name: "Selecionar" }));
    await user.click(screen.getByRole("checkbox", { name: /Selecionar todas as 3/ }));
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Excluir 3 transações?" })).getByRole("button", { name: "Excluir" }));
    expect(await screen.findByText("3 transações excluídas")).toBeVisible();
    expect(screen.queryByText("Padaria")).not.toBeInTheDocument();
    expect(requests.some((r) => r.url === "/transactions/batch")).toBe(false);
    act(() => vi.advanceTimersByTime(7000));
    await waitFor(() => expect(requests.find((r) => r.url === "/transactions/batch")?.data).toMatchObject({ action: "delete" }));
  });
});
