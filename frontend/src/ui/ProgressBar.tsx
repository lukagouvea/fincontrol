import { cx } from "../lib/cx";

/** Barra de progresso de 8px. `label` vira o nome acessível (role=img). */
export function ProgressBar({
  value,
  max = 100,
  label,
  tone = "primary",
  className,
}: {
  value: number;
  max?: number;
  label: string;
  tone?: "primary" | "expense" | "hero";
  className?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="img"
      aria-label={label}
      className={cx(
        "h-2 overflow-hidden rounded",
        tone === "hero" ? "bg-hero-track" : "bg-surface-2",
        className,
      )}
    >
      <div
        className={cx(
          "h-full rounded",
          tone === "primary" && "bg-primary",
          tone === "expense" && "bg-expense",
          tone === "hero" && "bg-hero-fill",
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
