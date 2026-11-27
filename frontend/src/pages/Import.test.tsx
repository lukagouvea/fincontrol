import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { installApiFixture, requests } from "../test/fixtures";

const at = (key: string) => new Date(`${key}T12:00:00`).toISOString();
const aurora = { id: "c1", name: "Aurora", last4: "4821", limit: 6000, closingDay: 8, dueDay: 15, color: "verde", archived: false, payments: [] };

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 25, 12));
  window.history.replaceState({}, "", "/importar");
});
afterEach(() => vi.useRealTimers());

const csv = [
  "date,title,amount",
  "2026-11-15,Mercado Bom Preço,142.30", // já lançada
  "2026-11-20,Mercado Central,95.00", // sugere Alimentação pela palavra
  "2026-11-22,Cinema,56.00", // sem categoria
  "2026-11-02,Pagamento recebido,-648.80", // pagamento da fatura
].join("\n");

describe("Importar extrato", () => {
  it("revisa, importa só o que foi escolhido e permite desfazer", async () => {
    installApiFixture({
      "/cards": [aurora],
      "/transactions": (config: { params?: { month: number } }) =>
        config.params?.month === 11
          ? [{ id: "t1", type: "expense", description: "Mercado Bom Preço", amount: 142.3, categoryId: "food", date: at("2026-11-15"), cardId: "c1" }]
          : [],
      "post /imports": { id: "b1", count: 2, total: 151 },
      "delete /imports/b1": { deleted: 2 },
    });
    render(<App />);
    const user = userEvent.setup({ applyAccept: false });
    const file = new File([csv], "fatura.csv", { type: "text/csv" });
    await user.upload(await screen.findByLabelText("Arquivo do extrato"), file);

    const review = await screen.findByRole("region", { name: "Revisar lançamentos" });
    expect(within(review).getByText("1 nova")).toBeVisible();
    expect(within(review).getByText("1 já lançada")).toBeVisible();
    expect(within(review).getByText("1 sem categoria")).toBeVisible();
    expect(within(review).getByRole("checkbox", { name: "Importar Mercado Bom Preço" })).not.toBeChecked();
    expect(within(review).getByRole("checkbox", { name: "Importar Cinema" })).toBeDisabled();

    await user.selectOptions(within(review).getByLabelText("Categoria de Cinema"), "food");
    expect(within(review).getByRole("checkbox", { name: "Importar Cinema" })).toBeChecked();
    await user.click(within(review).getByRole("button", { name: "Importar 2 lançamentos" }));

    expect(await screen.findByRole("heading", { name: "2 lançamentos importados" })).toBeVisible();
    const body = requests.find((r) => r.method === "post" && r.url === "/imports")?.data as { cardId: string; fileName: string; items: Array<{ description: string; amount: number; type: string; categoryId: string }> };
    expect(body.cardId).toBe("c1");
    expect(body.fileName).toBe("fatura.csv");
    expect(body.items.map((i) => [i.description, i.amount, i.type, i.categoryId])).toEqual([
      ["Mercado Central", 95, "expense", "food"],
      ["Cinema", 56, "expense", "food"],
    ]);

    await user.click(screen.getByRole("button", { name: "Desfazer importação" }));
    await waitFor(() => expect(requests.some((r) => r.method === "delete" && r.url === "/imports/b1")).toBe(true));
  });

  it("explica quando o arquivo não é um extrato", async () => {
    installApiFixture();
    render(<App />);
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(await screen.findByLabelText("Arquivo do extrato"), new File(["nome,idade\nana,30\n"], "planilha.csv", { type: "text/csv" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não reconheci as colunas");
  });
});
