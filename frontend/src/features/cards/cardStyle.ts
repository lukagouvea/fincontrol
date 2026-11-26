import type { Card, CardColor } from "../../types/FinanceTypes";

export const CARD_COLORS: Array<{ value: CardColor; label: string }> = [
  { value: "verde", label: "Verde" },
  { value: "azul", label: "Azul" },
  { value: "laranja", label: "Laranja" },
  { value: "grafite", label: "Grafite" },
];

const safe = (color: string): CardColor => (CARD_COLORS.some((c) => c.value === color) ? (color as CardColor) : "verde");

/** Cores do cartão vindas dos tokens (funcionam nos dois temas). */
export const cardVars = (color: string) => {
  const key = safe(color);
  return {
    background: `var(--card-${key})`,
    ink: `var(--on-card-${key})`,
    tint: `var(--card-${key}-tint)`,
    tintInk: `var(--card-${key}-ink)`,
  };
};

export type CardLookup = (id: string | null | undefined) => Card | undefined;

export const makeCardLookup = (cards: Card[] = []): CardLookup => {
  const map = new Map(cards.map((card) => [card.id, card]));
  return (id) => (id ? map.get(id) : undefined);
};
