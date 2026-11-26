import type { ReactNode } from "react";
import type { Card } from "../../types/FinanceTypes";
import { cx } from "../../lib/cx";
import { cardVars } from "./cardStyle";

/** Arte do cartão (cor sólida, apelido, final e um valor em destaque). */
export function CardArt({
  card,
  label,
  value,
  footer,
  className,
  selected,
}: {
  card: Pick<Card, "name" | "last4" | "color">;
  label?: string;
  value?: ReactNode;
  footer?: ReactNode;
  className?: string;
  selected?: boolean;
}) {
  const vars = cardVars(card.color);
  return (
    <div
      className={cx(
        "flex min-h-[150px] flex-col justify-between gap-3 rounded-card p-5",
        selected && "outline outline-[3px] outline-offset-[3px] outline-ink",
        className,
      )}
      style={{ background: vars.background, color: vars.ink }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-[15px] font-semibold">{card.name}</span>
        <span className="shrink-0 font-num text-sm tracking-[0.12em]" aria-label={`final ${card.last4}`}>
          •••• {card.last4 || "0000"}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {label && <span className="text-[13px] opacity-80">{label}</span>}
        {value}
        {footer && <span className="text-[13px] opacity-80">{footer}</span>}
      </div>
    </div>
  );
}
