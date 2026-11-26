import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../App";
import { installApiFixture, requests } from "../../test/fixtures";

beforeEach(() => localStorage.clear());
afterEach(() => vi.useRealTimers());
it("cria uma compra parcelada com valor total e quantidade corretos", async () => {
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
  window.history.replaceState({}, "", "/recorrentes?tipo=despesa");
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
it("edita o valor de uma fixa a partir de um mês, sem reescrever o histórico", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 3, 12));
  installApiFixture({
    "/recurring?type=expense": [
      {
        id: "rent",
        type: "expense",
        description: "Aluguel",
        amount: 1500,
        day: 10,
        startDate: "2026-01-01T12:00:00Z",
        categoryId: "food",
        versions: [
          {
            effectiveFrom: "2026-01-01",
            amount: 1400,
            categoryId: "food",
            day: 10,
          },
          {
            effectiveFrom: "2026-06-01",
            amount: 1500,
            categoryId: "food",
            day: 10,
          },
        ],
      },
    ],
  });
  window.history.replaceState({}, "", "/recorrentes?tipo=despesa");
  render(<App />);
  const user = userEvent.setup();
  expect(await screen.findByText("Histórico de valores")).toBeInTheDocument();
  expect(screen.getByText(/1\.400,00 desde jan\/2026/)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Editar Aluguel" }));
  const form = screen.getByRole("dialog", { name: "Editar despesa fixa" });
  // Sem mudança em valor/categoria/dia, não há escolha de escopo.
  expect(within(form).queryByText("Aplicar alteração")).not.toBeInTheDocument();

  await user.clear(within(form).getByLabelText("Valor (R$)"));
  await user.type(within(form).getByLabelText("Valor (R$)"), "1650");
  expect(within(form).getByText("Aplicar alteração")).toBeInTheDocument();
  expect(within(form).getByLabelText("A partir de")).toBeChecked();
  await user.selectOptions(within(form).getByLabelText("Mês"), "11");
  await user.click(within(form).getByRole("button", { name: "Salvar" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  const put = requests.find(
    (r) => r.method === "put" && r.url === "/recurring/rent",
  );
  expect(put?.data).toMatchObject({
    amount: 1650,
    scope: "from",
    effectiveFrom: "2026-12",
  });
  // Campos versionados que não mudaram não são enviados.
  expect(put?.data).not.toHaveProperty("categoryId");
  expect(put?.data).not.toHaveProperty("day");
});
it("corrige todo o histórico de uma fixa e só avisa sobre reajustes quando o valor muda", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 3, 12));
  installApiFixture({
    "/recurring?type=expense": [
      {
        id: "rent",
        type: "expense",
        description: "Aluguel",
        amount: 1500,
        day: 10,
        startDate: "2026-01-01T12:00:00Z",
        categoryId: "food",
        versions: [
          {
            effectiveFrom: "2026-01-01",
            amount: 1400,
            categoryId: "food",
            day: 10,
          },
          {
            effectiveFrom: "2026-06-01",
            amount: 1500,
            categoryId: "food",
            day: 10,
          },
        ],
      },
    ],
  });
  window.history.replaceState({}, "", "/recorrentes?tipo=despesa");
  render(<App />);
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Editar Aluguel" }),
  );
  const form = screen.getByRole("dialog", { name: "Editar despesa fixa" });
  await user.clear(within(form).getByLabelText("Dia do vencimento"));
  await user.type(within(form).getByLabelText("Dia do vencimento"), "15");
  await user.click(within(form).getByLabelText("Corrigir todo o histórico"));
  // Corrigir o dia mantém os reajustes de valor: sem aviso.
  expect(
    within(form).queryByText(/Substitui os reajustes/),
  ).not.toBeInTheDocument();
  await user.clear(within(form).getByLabelText("Valor (R$)"));
  await user.type(within(form).getByLabelText("Valor (R$)"), "1550");
  expect(
    within(form).getByText(/Substitui os reajustes anteriores/),
  ).toBeInTheDocument();
  await user.click(within(form).getByRole("button", { name: "Salvar" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  const put = requests.find(
    (r) => r.method === "put" && r.url === "/recurring/rent",
  );
  expect(put?.data).toMatchObject({ day: 15, amount: 1550, scope: "all" });
  expect(put?.data).not.toHaveProperty("categoryId");
});
