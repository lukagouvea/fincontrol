import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExpenseModal } from "../Expenses/ExpenseModal";
import { installApiFixture } from "../../test/fixtures";

function renderExpense(
  onSubmit: (data: unknown) => Promise<void>,
  initialDate = "2026-11-03",
) {
  installApiFixture();
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ExpenseModal
        isOpen
        onClose={() => {}}
        onSubmit={onSubmit}
        initialDate={initialDate}
      />
    </QueryClientProvider>,
  );
}
describe("formulário de lançamento", () => {
  it("preserva os campos e a data selecionada quando o servidor rejeita o envio", async () => {
    const user = userEvent.setup();
    renderExpense(async () => {
      throw new Error("Servidor indisponível");
    }, "2026-12-19");
    await screen.findByRole("option", { name: "Alimentação" });
    await user.type(screen.getByLabelText("Descrição"), "Compras da semana");
    await user.type(screen.getByLabelText("Valor (R$)"), "123,45");
    await user.selectOptions(screen.getByLabelText("Categoria"), "food");
    await user.click(screen.getByRole("button", { name: "Criar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar",
    );
    expect(screen.getByLabelText("Descrição")).toHaveValue("Compras da semana");
    expect(screen.getByLabelText("Data")).toHaveValue("2026-12-19");
    expect(
      (screen.getByLabelText("Valor (R$)") as HTMLInputElement).value,
    ).toContain("123,45");
  });
  it("bloqueia envio duplicado até a operação terminar", async () => {
    let calls = 0;
    let finish: (() => void) | undefined;
    const user = userEvent.setup();
    renderExpense(() => {
      calls++;
      return new Promise<void>((resolve) => {
        finish = resolve;
      });
    });
    await screen.findByRole("option", { name: "Alimentação" });
    await user.type(screen.getByLabelText("Descrição"), "Mercado");
    await user.type(screen.getByLabelText("Valor (R$)"), "25");
    await user.selectOptions(screen.getByLabelText("Categoria"), "food");
    await user.dblClick(screen.getByRole("button", { name: "Criar" }));
    expect(calls).toBe(1);
    expect(screen.getByRole("button", { name: /Salvando/ })).toBeDisabled();
    finish?.();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Criar" })).toBeEnabled(),
    );
  });
});
