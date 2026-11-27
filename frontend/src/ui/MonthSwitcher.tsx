import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthNames } from "../lib/dates";

/** Pílula "‹ Novembro ›". `month` é 0–11. */
export function MonthSwitcher({
  month,
  year,
  onChange,
}: {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}) {
  const shift = (delta: number) => {
    const index = year * 12 + month + delta;
    onChange(((index % 12) + 12) % 12, Math.floor(index / 12));
  };
  const showYear = year !== new Date().getFullYear();
  const buttonClass =
    "inline-flex size-tap items-center justify-center rounded-full text-ink hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus";
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-surface">
      <button type="button" aria-label="Mês anterior" className={buttonClass} onClick={() => shift(-1)}>
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <span aria-live="polite" className="min-w-[84px] px-1 text-center text-sm font-semibold">
        {monthNames[month]}
        {showYear && ` ${year}`}
      </span>
      <button type="button" aria-label="Próximo mês" className={buttonClass} onClick={() => shift(1)}>
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
