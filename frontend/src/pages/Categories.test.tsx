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

  it("apagar mescla em outra categoria, com desfazer, e só chama a API quando o aviso some", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    installApiFixture({
      "/categories": [
        { id: "food", name: "Alimentação", type: "expense", active: true, color: "#000" },
        { id: "fun", name: "Lazer", type: "expense", active: true, color: "#000" },
        { id: "others", name: "Outros", type: "expense", active: true, color: "#000" },
        { id: "old", name: "Academia", type: "expense", active: false, color: "#000" },
      ],
    });
    render(<App />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(await screen.findByRole("button", { name: "Editar Lazer" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Editar categoria" })).getByRole("button", { name: "Apagar categoria" }));
    const sheet = await screen.findByRole("dialog", { name: "Apagar “Lazer”?" });
    // Destino padrão: "Outros".
    expect(within(sheet).getByLabelText("Categoria de destino")).toHaveValue("others");
    await user.click(within(sheet).getByRole("button", { name: "Mesclar em Outros" }));
    expect(await screen.findByText("“Lazer” mesclada em Outros")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Editar Lazer" })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(7000));
    await waitFor(() =>
      expect(requests.find((r) => r.method === "post" && r.url === "/categories/fun/merge")?.data).toEqual({ targetId: "others" }),
    );
    expect(requests.some((r) => r.method === "delete")).toBe(false);
  });

  it("arquiva sem mover e restaura uma arquivada", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    installApiFixture({
      "/categories": [
        { id: "food", name: "Alimentação", type: "expense", active: true, color: "#000" },
        { id: "old", name: "Academia", type: "expense", active: false, color: "#000" },
      ],
    });
    render(<App />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(await screen.findByRole("button", { name: "Arquivadas (1)" }));
    await user.click(screen.getByRole("button", { name: "Restaurar Academia" }));
    await waitFor(() => expect(requests.find((r) => r.method === "put" && r.url === "/categories/old")?.data).toEqual({ active: true }));

    await user.click(screen.getByRole("button", { name: "Editar Alimentação" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Editar categoria" })).getByRole("button", { name: "Apagar categoria" }));
    const sheet = await screen.findByRole("dialog", { name: "Apagar “Alimentação”?" });
    // Sem outra categoria ativa do mesmo tipo, só dá para arquivar.
    expect(within(sheet).queryByLabelText("Categoria de destino")).not.toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: "Arquivar" }));
    expect(await screen.findByText("“Alimentação” arquivada")).toBeVisible();
    act(() => vi.advanceTimersByTime(7000));
    await waitFor(() => expect(requests.some((r) => r.method === "delete" && r.url === "/categories/food")).toBe(true));
  });

  it("escolhe o ícone ao criar e o sugere pelo nome", async () => {
    installApiFixture({ "post /categories": { id: "pets", name: "Pets", type: "expense", active: true } });
    render(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Nova categoria" }));
    const form = await screen.findByRole("dialog", { name: "Nova categoria" });
    await user.type(within(form).getByLabelText("Nome"), "Pets");
    expect(within(form).getByRole("radio", { name: "Pata" })).toHaveAttribute("aria-checked", "true");
    await user.click(within(form).getByRole("radio", { name: "Presente" }));
    await user.click(within(form).getByRole("button", { name: "Criar categoria" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(requests.find((r) => r.method === "post" && r.url === "/categories")?.data).toMatchObject({ name: "Pets", icon: "gift" });
  });
});
