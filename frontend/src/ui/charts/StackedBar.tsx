import { formatMoney } from "../../lib/money";

export type StackedSegment = { key: string; label: string; value: number; color: string };

/**
 * Barra horizontal empilhada (distribuição por categoria). O texto alternativo
 * lista cada parte; a legenda/tabela visível fica a cargo de quem usa.
 */
export function StackedBar({ segments, label }: { segments: StackedSegment[]; label: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total <= 0) return <div className="h-3 rounded-full bg-surface-2" role="img" aria-label={`${label}: sem valores`} />;
  const description = segments
    .map((segment) => `${segment.label} ${Math.round((segment.value / total) * 100)}% (${formatMoney(segment.value)})`)
    .join(", ");
  return (
    <div role="img" aria-label={`${label}: ${description}`} className="flex h-3 gap-[3px] overflow-hidden rounded-full">
      {segments.map((segment) => (
        <span
          key={segment.key}
          className="h-full min-w-[4px] first:rounded-l-full last:rounded-r-full"
          style={{ flexGrow: segment.value, flexBasis: 0, background: segment.color }}
        />
      ))}
    </div>
  );
}

/** Agrupa o que passar de `max` itens em "Outras". */
export function topSegments(segments: StackedSegment[], max: number, otherColor: string): StackedSegment[] {
  if (segments.length <= max) return segments;
  const head = segments.slice(0, max - 1);
  const rest = segments.slice(max - 1).reduce((sum, segment) => sum + segment.value, 0);
  return [...head, { key: "outras", label: "Outras", value: rest, color: otherColor }];
}
