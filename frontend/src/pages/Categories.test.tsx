import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { installApiFixture, requests } from "../test/fixtures";

const day = (d: number) => {
  const date = new Date();
  date.setDate(d);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
};

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/categorias");
});
afterEach(() => vi.useRealTimers());

describe("Categorias", () => {
  it("lista por tipo com lançamentos do mês e cria uma nova", async () => {
    installApiFixture({
      "/transactions": [{ id: "t1", type: "expense", description: "Padaria", amount: 38, categoryId: "food", date: day(1) }],
      "post /categories": { id: "pets", name: "Pets", type: "expense", active: true },
    });
    render(<App />);
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "Editar Alimentação" })).toHaveTextContent(/1 lançamento em/));
    await user.click(screen.getByRole("radio", { name: "Receitas" }));
    expect(screen.getByRole("button", { name: "Editar Trabalho" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Nova categoria" }));
    const form = await screen.findByRole("dialog", { name: "Nova categoria" });
    await user.click(within(form).getByRole("button", { name: "Criar categoria" }));
    expect(within(form).getByText("Dê um nome à categoria.")).toBeVisible();
    await user.type(within(form).getByLabelText("Nome"), "Pets");
    await user.click(within(form).getByRole("button", { name: "Criar categoria" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(requests.find((r) => r.method === "post" && r.url === "/categories")?.data).toMatchObject({ name: "Pets", type: "income" });
  });

  it("arquiva com desfazer e só chama a API quando o aviso some", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    installApiFixture();
    render(<App />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(await screen.findByRole("button", { name: "Editar Alimentação" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Editar categoria" })).getByRole("button", { name: "Arquivar categoria" }));
    expect(await screen.findByText("“Alimentação” arquivada")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Editar Alimentação" })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(7000));
    await waitFor(() => expect(requests.some((r) => r.method === "delete" && r.url === "/categories/food")).toBe(true));
  });
});
