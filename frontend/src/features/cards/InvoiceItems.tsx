import { Repeat } from "lucide-react";
import type { CategoryLookup } from "../categories";
import type { CardCharge } from "../invoice";
import { formatShortDate } from "../../lib/dates";
import { Money } from "../../ui/Money";
import { CategoryIcon } from "../../ui/CategoryIcon";

/** Compras de uma fatura (estornos aparecem como crédito). */
export function InvoiceItems({ items, category, limit }: { items: CardCharge[]; category: CategoryLookup; limit?: number }) {
  if (!items.length) return <p className="py-4 text-sm text-muted">Nenhuma compra nesta fatura.</p>;
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <ul>
      {shown.map((item) => {
        const cat = category(item.categoryId);
        const meta = [
          cat?.name ?? "Sem categoria",
          formatShortDate(item.date),
          item.installment ? `Parcela ${item.installment.current} de ${item.installment.total}` : null,
          item.source === "recurring" ? "Recorrente" : null,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={item.key} className="flex min-h-16 items-center gap-3 border-t border-border first:border-t-0">
            <CategoryIcon category={cat} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 truncate text-[15px] font-semibold">
                {item.description}
                {item.source === "recurring" && <Repeat size={14} className="shrink-0 text-muted" aria-hidden="true" />}
              </span>
              <span className="block truncate text-[13px] text-muted">{meta}</span>
            </span>
            <Money value={Math.abs(item.amount)} kind={item.amount < 0 ? "income" : "expense"} />
          </li>
        );
      })}
    </ul>
  );
}
