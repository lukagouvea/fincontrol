import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { installApiFixture, requests } from "../test/fixtures";
import { MINUS } from "../lib/money";

const day = (d: number) => {
  const date = new Date();
  date.setDate(d);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
};

const monthTransactions = [
  { id: "t1", type: "expense", description: "Padaria", amount: 38, categoryId: "food", date: day(2) },
  { id: "t2", type: "income", description: "Cashback", amount: 12.5, categoryId: "salary", date: day(1) },
  {
    id: "t3",
    type: "expense",
    description: "Notebook",
    amount: 420,
    categoryId: "food",
    date: day(1),
    installmentGroupId: "g1",
    installmentInfo: { current: 4, total: 10 },
  },
];

function renderAt(path: string, overrides: Record<string, unknown> = {}) {
  installApiFixture({
    "/transactions": monthTransactions,
    "/recurring?type=expense": [
      { id: "rent", type: "expense", description: "Aluguel", amount: 1450, categoryId: "food", day: 1, startDate: "2026-01-01T12:00:00Z" },
    ],
    ...overrides,
  });
  window.history.replaceState({}, "", path);
  return render(<App />);
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.useRealTimers());

describe("Transações", () => {
  it("lista avulsas, parcelas e recorrentes do mês com filtros e busca", async () => {
    renderAt("/transacoes");
    const user = userEvent.setup();
    expect(await screen.findByText("Padaria")).toBeVisible();
    expect(screen.getByText("Aluguel")).toBeVisible();
    expect(screen.getByText(/Parcela 4 de 10/)).toBeVisible();
    expect(screen.getByText(`${MINUS} R$ 38,00`)).toBeVisible();
    expect(screen.getByText("+ R$ 12,50")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Receitas" }));
    expect(screen.queryByText("Padaria")).not.toBeInTheDocument();
    expect(screen.getByText("Cashback")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Todas" }));
    await user.type(screen.getByRole("searchbox", { name: "Buscar transações" }), "padar");
    expect(screen.getByText("Padaria")).toBeVisible();
    expect(screen.queryByText("Aluguel")).not.toBeInTheDocument();
  });

  it("cria uma despesa e não envia duas vezes", async () => {
    let resolve: () => void = () => {};
    renderAt("/transacoes", {
      "post /transactions": () =>
        new Promise((done) => {
          resolve = () => done({ id: "new" });
        }),
    });
    const user = userEvent.setup();
    await screen.findByText("Padaria");
    await user.click(screen.getAllByRole("button", { name: "Nova transação" })[0]);
    const dialog = await screen.findByRole("dialog", { name: "Nova transação" });
    await user.type(within(dialog).getByLabelText("Valor"), "1990");
    await user.type(within(dialog).getByLabelText("Descrição"), "Mercado");
    const save = within(dialog).getByRole("button", { name: "Salvar despesa" });
    await user.click(save);
    await user.click(save);
    await act(async () => resolve());
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const posts = requests.filter((r) => r.method === "post" && r.url === "/transactions");
    expect(posts).toHaveLength(1);
    expect(posts[0].data).toMatchObject({ description: "Mercado", amount: 1990, type: "expense", categoryId: "food" });
  });

  it("mantém o preenchimento quando salvar falha", async () => {
    renderAt("/transacoes", { "post /transactions": Object.assign(new Error("Erro do servidor"), { response: { status: 500 } }) });
    const user = userEvent.setup();
    await screen.findByText("Padaria");
    await user.click(screen.getAllByRole("button", { name: "Nova transação" })[0]);
    const dialog = await screen.findByRole("dialog", { name: "Nova transação" });
    await user.type(within(dialog).getByLabelText("Valor"), "50");
    await user.type(within(dialog).getByLabelText("Descrição"), "Farmácia");
    await user.click(within(dialog).getByRole("button", { name: "Salvar despesa" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Não foi possível salvar");
    expect(within(dialog).getByLabelText("Descrição")).toHaveValue("Farmácia");
  });

  it("exclui com desfazer e só chama a API quando o aviso some", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderAt("/transacoes");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(await screen.findByText("Padaria"));
    const detail = await screen.findByRole("dialog", { name: "Detalhes" });
    await user.click(within(detail).getByRole("button", { name: "Excluir transação" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Excluir transação?" })).getByRole("button", { name: "Excluir" }));

    expect(await screen.findByText("Transação excluída")).toBeVisible();
    expect(screen.queryByText("Padaria")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(screen.getByText("Padaria")).toBeVisible();
    act(() => vi.advanceTimersByTime(7000));
    expect(requests.some((r) => r.method === "delete")).toBe(false);

    await user.click(screen.getByText("Padaria"));
    await user.click(within(await screen.findByRole("dialog", { name: "Detalhes" })).getByRole("button", { name: "Excluir transação" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Excluir transação?" })).getByRole("button", { name: "Excluir" }));
    await screen.findByText("Transação excluída");
    act(() => vi.advanceTimersByTime(7000));
    await waitFor(() => expect(requests.some((r) => r.method === "delete" && r.url === "/transactions/t1")).toBe(true));
  });

  it("mostra estado vazio com ação para adicionar", async () => {
    renderAt("/transacoes", { "/transactions": [], "/recurring?type=expense": [] });
    expect(await screen.findByRole("heading", { name: /Nenhuma transação em/ })).toBeVisible();
    expect(screen.getByRole("button", { name: "Adicionar transação" })).toBeVisible();
  });
});

it("cria uma compra parcelada (Transações) com valor total e quantidade corretos", async () => {
  installApiFixture();
  window.history.replaceState({}, "", "/transacoes");
  render(<App />);
  const user = userEvent.setup();
  await user.click((await screen.findAllByRole("button", { name: "Nova transação" }))[0]);
  const form = await screen.findByRole("dialog", { name: "Nova transação" });
  await user.type(within(form).getByLabelText("Descrição"), "Compra parcelada");
  await user.type(within(form).getByLabelText("Valor"), "300");
  await user.selectOptions(within(form).getByLabelText("Parcelas"), "3");
  expect(within(form).getByText("3x de R$ 100,00")).toBeVisible();
  expect(within(form).queryByRole("switch", { name: "Repetir todo mês" })).not.toBeInTheDocument();
  await user.click(within(form).getByRole("button", { name: "Salvar despesa" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  const sent = requests.filter((r) => r.method === "post");
  expect(sent).toHaveLength(1);
  expect(sent[0].url).toBe("/transactions/installment");
  expect(sent[0].data).toMatchObject({
    description: "Compra parcelada",
    totalAmount: 300,
    totalInstallments: 3,
    categoryId: "food",
  });
});
