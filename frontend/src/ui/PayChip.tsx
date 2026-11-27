import type { Card } from "../types/FinanceTypes";
import { cardVars } from "../features/cards/cardStyle";
import { Badge } from "./Chip";

/** Forma de pagamento: "À vista" ou o apelido do cartão na cor dele. */
export function PayChip({ card }: { card?: Pick<Card, "name" | "color"> | null }) {
  if (!card) return <Badge tone="neutral">À vista</Badge>;
  const vars = cardVars(card.color);
  return <Badge style={{ background: vars.tint, color: vars.tintInk }}>{card.name}</Badge>;
}
