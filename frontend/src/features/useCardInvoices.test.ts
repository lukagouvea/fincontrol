import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Card, FixedTransaction } from "../types/FinanceTypes";
import { cardCharges } from "./useCardInvoices";

const card: Card = { id: "roxo", name: "Roxinho", last4: "1234", limit: 5000, closingDay: 5, dueDay: 12, color: "verde", archived: false, createdAt: "2025-01-01T12:00:00Z", payments: [] };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 27, 12)); // 27/nov/2026
});
afterEach(() => vi.useRealTimers());

const streaming = (versions: FixedTransaction["versions"], cardId: string | null): FixedTransaction => ({
  id: "netflix",
  description: "Streaming",
  amount: 39.9,
  categoryId: "subs",
  type: "expense",
  day: 10,
  startDate: "2024-06-01T12:00:00Z",
  cardId,
  versions,
});

it("trocar uma recorrente para o cartão não leva as cobranças antigas para as faturas passadas", () => {
  // À vista desde 2024; passa para o cartão a partir de nov/2026.
  const rule = streaming(
    [
      { effectiveFrom: "2024-06-01", amount: 39.9, categoryId: "subs", day: 10, cardId: null },
      { effectiveFrom: "2026-11-01", amount: 39.9, categoryId: "subs", day: 10, cardId: "roxo" },
    ],
    "roxo",
  );
  const charges = cardCharges(card, [], [{ item: rule, type: "expense" }], [], "2026-11-27");
  expect(charges.map((c) => c.date)).toEqual(["2026-11-10"]);
});

it("recorrente que saiu do cartão continua nas faturas antigas dele", () => {
  const rule = streaming(
    [
      { effectiveFrom: "2026-08-01", amount: 39.9, categoryId: "subs", day: 10, cardId: "roxo" },
      { effectiveFrom: "2026-10-01", amount: 39.9, categoryId: "subs", day: 10, cardId: null },
    ],
    null,
  );
  const rule2 = { ...rule, startDate: "2026-08-01T12:00:00Z" };
  const charges = cardCharges(card, [], [{ item: rule2, type: "expense" }], [], "2026-11-27");
  expect(charges.map((c) => c.date)).toEqual(["2026-08-10", "2026-09-10"]);
});

it("versões antigas sem cardId (antes da migração) usam o cartão da regra", () => {
  const rule = streaming([{ effectiveFrom: "2026-09-01", amount: 39.9, categoryId: "subs", day: 10 }], "roxo");
  const rule2 = { ...rule, startDate: "2026-09-01T12:00:00Z" };
  const charges = cardCharges(card, [], [{ item: rule2, type: "expense" }], [], "2026-11-27");
  expect(charges.map((c) => c.date)).toEqual(["2026-09-10", "2026-10-10", "2026-11-10"]);
});
