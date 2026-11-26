import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { installApiFixture } from "../test/fixtures";

const day = (d: number) => {
  const date = new Date();
  date.setDate(d);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
};

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/");
});

describe("Início", () => {
  it("mostra gasto, entradas e para onde foi o dinheiro, contando recorrentes", async () => {
    installApiFixture({
      "/transactions": [
        { id: "t1", type: "expense", description: "Compras", amount: 250, categoryId: "food", date: day(1) },
        { id: "t2", type: "income", description: "Freela", amount: 1000, categoryId: "salary", date: day(1) },
      ],
      "/recurring?type=expense": [
        { id: "rent", type: "expense", description: "Aluguel", amount: 800, categoryId: "food", day: 1, startDate: "2026-01-01T12:00:00Z" },
      ],
    });
    render(<App />);
    const summary = (await screen.findAllByRole("region", { name: "Resumo do mês" }))[0];
    expect(await within(summary).findByText("R$ 1.050,00")).toBeVisible();
    expect(within(summary).getByText(/Faltou R\$ 50,00/)).toBeVisible();
    expect(screen.getByRole("img", { name: /Gastos por categoria: Alimentação 100%/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Aluguel/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/transacoes?t=rec%3Arent"),
    );
  });

  it("mostra erro sem transformar dados desconhecidos em zero", async () => {
    installApiFixture({ "/transactions": new Error("Sem conexão") });
    render(<App />);
    expect(await screen.findByRole("alert", {}, { timeout: 3000 })).toHaveTextContent("Não foi possível carregar o resumo");
    expect(screen.queryByText("R$ 0,00")).not.toBeInTheDocument();
  });

  it("convida a registrar quando o mês está vazio", async () => {
    installApiFixture();
    render(<App />);
    expect(await screen.findByRole("heading", { name: /Nada registrado em/ })).toBeVisible();
    expect(screen.getByRole("button", { name: "Adicionar transação" })).toBeVisible();
  });
});
