import { cx } from "../../lib/cx";
import { formatMoney } from "../../lib/money";

export type BarGroup = { key: string; label: string; current?: boolean; values: number[] };
export type BarSeries = { label: string; color: string };

/**
 * Barras agrupadas por período (ex.: receitas × despesas por mês). Cada grupo
 * tem um rótulo acessível com os valores; a tabela visível fica com quem usa.
 */
export function GroupedBars({
  groups,
  series,
  label,
  height = 140,
}: {
  groups: BarGroup[];
  series: BarSeries[];
  label: string;
  height?: number;
}) {
  const max = Math.max(1, ...groups.flatMap((group) => group.values));
  return (
    <figure aria-label={label} className="flex flex-col gap-2">
      <div className="flex items-end justify-around gap-2" style={{ height }}>
        {groups.map((group) => (
          <div
            key={group.key}
            role="img"
            aria-label={`${group.label}: ${series.map((s, i) => `${s.label} ${formatMoney(group.values[i] ?? 0)}`).join(", ")}`}
            className="flex h-full flex-1 items-end justify-center gap-1"
          >
            {series.map((s, i) => (
              <span
                key={s.label}
                className="w-full max-w-[18px] rounded-t-[4px]"
                style={{ height: `${Math.max(2, ((group.values[i] ?? 0) / max) * 100)}%`, background: s.color }}
              />
            ))}
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex justify-around gap-2 text-[13px] text-muted">
        {groups.map((group) => (
          <span key={group.key} className={cx("flex-1 text-center", group.current && "font-semibold text-ink")}>
            {group.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

export function Legend({ series }: { series: BarSeries[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
      {series.map((s) => (
        <li key={s.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: s.color }} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}
