import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../App";
import { installApiFixture, requests } from "../../test/fixtures";

beforeEach(() => localStorage.clear());
afterEach(() => vi.useRealTimers());
it("cria uma compra parcelada com valor total e quantidade corretos", async () => {
  installApiFixture();
  window.history.replaceState({}, "", "/lancamentos");
  render(<App />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Nova despesa" }));
  const form = screen.getByRole("dialog", { name: "Nova despesa" });
  await user.type(within(form).getByLabelText("Descrição"), "Compra parcelada");
  await user.type(within(form).getByLabelText("Valor (R$)"), "300");
  await user.click(within(form).getByLabelText("Pagamento parcelado"));
  await user.clear(within(form).getByLabelText("Número de parcelas"));
  await user.type(within(form).getByLabelText("Número de parcelas"), "3");
  await user.click(within(form).getByRole("button", { name: "Criar" }));
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
it("permite variação zero em outro mês e mantém edição de uma fixa arquivada", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 3, 12));
  installApiFixture({
    "/recurring?type=expense": [
      {
        id: "rent",
        type: "expense",
        description: "Aluguel",
        amount: 1000,
        day: 10,
        startDate: "2026-01-01T12:00:00Z",
        categoryId: "food",
      },
      {
        id: "ended",
        type: "expense",
        description: "Assinatura antiga",
        amount: 40,
        day: 10,
        startDate: "2026-01-01T12:00:00Z",
        endDate: "2026-10-01T12:00:00Z",
        categoryId: "food",
      },
    ],
    "/recurring/variations": [
      {
        id: "variation",
        fixedItemId: "rent",
        type: "expense",
        amount: 1200,
        month: 11,
        year: 2026,
      },
    ],
  });
  window.history.replaceState({}, "", "/lancamentos?tipo=despesa&grupo=fixas");
  render(<App />);
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Variação mensal de Aluguel" }),
  );
  const panel = screen.getByRole("dialog", { name: "Variação mensal" });
  await user.selectOptions(within(panel).getByLabelText("Mês"), "11");
  expect(
    (
      within(panel).getByLabelText(
        "Valor para este mês (R$)",
      ) as HTMLInputElement
    ).value,
  ).toContain("1.200");
  await user.clear(within(panel).getByLabelText("Valor para este mês (R$)"));
  await user.type(
    within(panel).getByLabelText("Valor para este mês (R$)"),
    "0",
  );
  await user.click(
    within(panel).getByRole("button", { name: "Salvar variação" }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(
    requests.find(
      (r) => r.method === "post" && r.url === "/recurring/rent/variation",
    )?.data,
  ).toEqual({ year: 2026, month: 11, amount: 0, type: "expense" });
  await user.click(screen.getByRole("button", { name: "Arquivadas (1)" }));
  await user.click(
    screen.getByRole("button", { name: "Editar Assinatura antiga" }),
  );
  expect(screen.getByLabelText("Data final (opcional)")).toHaveValue(
    "2026-10-01",
  );
});
