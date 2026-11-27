/**
 * Revisão da importação (ImportarRevisar.html): tipo pelo sinal, duplicados
 * ("já lançada"), pagamento de fatura ignorado e categoria sugerida.
 */
import type { Category } from "../../types/FinanceTypes";
import { toCents } from "../../lib/money";
import { guessIconKey } from "../categories";
import type { LedgerEntry } from "../ledger";
import type { RawItem } from "./parse";

export type ReviewStatus = "nova" | "duplicada" | "sem-categoria" | "pagamento";

export type ReviewItem = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "expense" | "income";
  categoryId: string | null;
  status: ReviewStatus;
  selected: boolean;
};

export const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\d+\/\d+$/, "") // "Loja 2/3" → mesma loja
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const INVOICE_PAYMENT = /pagamento|pgto|pag\.? ?fatura|payment|pagto/i;

/** Sugere a categoria: mesma descrição já usada; senão, mesma primeira palavra; senão, pelo assunto. */
export function makeSuggester(history: LedgerEntry[], categories: Category[]) {
  const active = categories.filter((category) => category.active !== false);
  const byText = new Map<string, string>();
  const byWord = new Map<string, string>();
  // Mais recentes por último: sobrescrevem as antigas.
  for (const entry of [...history].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    if (!entry.categoryId || !active.some((c) => c.id === entry.categoryId)) continue;
    const key = `${entry.type}:${normalizeText(entry.description)}`;
    byText.set(key, entry.categoryId);
    const word = normalizeText(entry.description).split(" ").find((token) => token.length >= 4);
    if (word) byWord.set(`${entry.type}:${word}`, entry.categoryId);
  }
  return (description: string, type: "expense" | "income"): string | null => {
    const text = normalizeText(description);
    const exact = byText.get(`${type}:${text}`);
    if (exact) return exact;
    const word = text.split(" ").find((token) => token.length >= 4);
    if (word && byWord.get(`${type}:${word}`)) return byWord.get(`${type}:${word}`)!;
    const icon = guessIconKey(description);
    if (icon === "receipt" || icon === "tag") return null;
    return active.find((category) => category.type === type && guessIconKey(category.name) === icon)?.id ?? null;
  };
}

export function buildReview(
  raw: RawItem[],
  options: { onCard: boolean; existing: LedgerEntry[]; suggest: (description: string, type: "expense" | "income") => string | null },
): ReviewItem[] {
  // Fatura de cartão: compras costumam vir positivas; extrato de conta, negativas.
  // No cartão, o sinal da maioria é o das compras.
  const positives = raw.filter((item) => item.amount > 0).length;
  const purchaseSign = options.onCard ? (positives >= raw.length - positives ? 1 : -1) : -1;
  const existing = new Set(
    options.existing
      .filter((entry) => entry.source === "transaction")
      .map((entry) => `${entry.date}|${toCents(entry.amount)}|${normalizeText(entry.description)}`),
  );
  return raw.map((item, index) => {
    const type = Math.sign(item.amount) === purchaseSign ? "expense" : "income";
    const amount = Math.abs(item.amount);
    const description = item.description.trim();
    const base = { id: `${index}`, date: item.date, description, amount, type } as const;
    if (options.onCard && type === "income" && INVOICE_PAYMENT.test(description))
      return { ...base, categoryId: null, status: "pagamento", selected: false };
    const categoryId = options.suggest(description, type);
    if (existing.has(`${item.date}|${toCents(amount)}|${normalizeText(description)}`))
      return { ...base, categoryId, status: "duplicada", selected: false };
    if (!categoryId) return { ...base, categoryId: null, status: "sem-categoria", selected: false };
    return { ...base, categoryId, status: "nova", selected: true };
  });
}
