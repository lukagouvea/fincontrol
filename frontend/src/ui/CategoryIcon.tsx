import { categoryColorVar, categoryIcon } from "../features/categories";
import type { Category } from "../types/FinanceTypes";
import { cx } from "../lib/cx";

/**
 * Tile de 44px com o ícone da categoria. O fundo é a cor da categoria misturada
 * com a superfície, então funciona nos dois temas.
 */
export function CategoryIcon({
  category,
  size = "md",
  className,
}: {
  category?: Pick<Category, "id" | "name" | "icon"> | null;
  size?: "md" | "lg";
  className?: string;
}) {
  const Icon = categoryIcon(category);
  const color = categoryColorVar(category);
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-flex shrink-0 items-center justify-center",
        size === "lg" ? "size-16 rounded-[20px]" : "size-tap rounded-tile",
        className,
      )}
      style={{
        // Puxa o ícone para a cor do texto: contraste melhor nas cores claras da paleta.
        color: `color-mix(in srgb, ${color} 75%, var(--ink))`,
        background: `color-mix(in srgb, ${color} 16%, var(--surface))`,
      }}
    >
      <Icon size={size === "lg" ? 28 : 22} strokeWidth={1.8} />
    </span>
  );
}
