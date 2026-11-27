import { describe, expect, it } from "vitest";
import { buildReview, makeSuggester } from "./review";
import type { LedgerEntry } from "../ledger";
import type { Category } from "../../types/FinanceTypes";

const categories: Category[] = [
  { id: "food", name: "Alimentação", type: "expense", color: "", active: true },
  { id: "car", name: "Transporte", type: "expense", color: "", active: true },
  { id: "health", name: "Saúde", type: "expense", color: "", active: true },
  { id: "subs", name: "Assinaturas", type: "expense", color: "", active: true },
  { id: "extra", name: "Extras", type: "income", color: "", active: true },
];
const entry = (date: string, description: string, amount: number, categoryId: string): LedgerEntry => ({
  key: description, source: "transaction", id: description, type: "expense", description, amount, categoryId, date, upcoming: false, cardId: null,
});
const history = [entry("2026-10-08", "Mercado Bom Preço", 120, "food"), entry("2026-11-14", "Streaming de vídeo", 39.9, "subs")];

describe("revisão da importação", () => {
  const suggest = makeSuggester(history, categories);

  it("sugere pela descrição já usada, pela primeira palavra ou pelo assunto", () => {
    expect(suggest("MERCADO BOM PRECO", "expense")).toBe("food");
    expect(suggest("Mercado Central", "expense")).toBe("food");
    expect(suggest("Posto Rodovia", "expense")).toBe("car");
    expect(suggest("Farmácia Popular", "expense")).toBe("health");
    expect(suggest("Cinema", "expense")).toBeNull();
  });

  it("fatura do cartão: positivo é compra, pagamento é ignorado, repetido fica de fora", () => {
    const items = buildReview(
      [
        { date: "2026-11-08", description: "Mercado Bom Preço", amount: 142.3 },
        { date: "2026-11-14", description: "Streaming de vídeo", amount: 39.9 },
        { date: "2026-11-05", description: "Cinema", amount: 56 },
        { date: "2026-11-02", description: "Pagamento recebido", amount: -500 },
        { date: "2026-11-03", description: "Estorno Loja", amount: -20 },
      ],
      { onCard: true, existing: history, suggest },
    );
    expect(items.map((i) => [i.description, i.type, i.status, i.selected])).toEqual([
      ["Mercado Bom Preço", "expense", "nova", true],
      ["Streaming de vídeo", "expense", "duplicada", false],
      ["Cinema", "expense", "sem-categoria", false],
      ["Pagamento recebido", "income", "pagamento", false],
      ["Estorno Loja", "income", "sem-categoria", false],
    ]);
  });

  it("extrato de conta (à vista): negativo é despesa, positivo é receita", () => {
    const items = buildReview(
      [
        { date: "2026-11-03", description: "Padaria", amount: -28.4 },
        { date: "2026-11-05", description: "Reembolso extra", amount: 30 },
      ],
      { onCard: false, existing: [], suggest },
    );
    expect(items.map((i) => [i.type, i.amount, i.categoryId])).toEqual([["expense", 28.4, "food"], ["income", 30, "extra"]]);
  });
});
