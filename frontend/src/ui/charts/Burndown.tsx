import type { BurnPoint } from "../../features/budget";
import { formatMoney } from "../../lib/money";

/**
 * Burndown: restante (eixo y) por dia. Linha real (sólida, laranja), ideal
 * (tracejada) e estimativa (mediana pontilhada sobre a faixa de 80%). Texto
 * alternativo resume hoje × ideal e a estimativa; a legenda fica embaixo.
 */
export function Burndown({ points, budget, label, height = 180 }: { points: BurnPoint[]; budget: number; label: string; height?: number }) {
  const width = 320;
  const pad = { left: 40, right: 10, top: 12, bottom: 22 };
  const values = points.flatMap((p) => [p.real, p.ideal, p.projection?.p10 ?? null, p.projection?.p90 ?? null]).filter((v): v is number => v !== null);
  const max = Math.max(1, budget, ...values);
  const min = Math.min(0, ...values);
  // i = -1 é o início do período (orçamento cheio); i = n-1 é o fim do último dia.
  const x = (i: number) => pad.left + ((i + 1) / Math.max(1, points.length)) * (width - pad.left - pad.right);
  const y = (v: number) => pad.top + ((max - v) / (max - min || 1)) * (height - pad.top - pad.bottom);
  const path = (pick: (p: BurnPoint) => number | null, start = 0) =>
    points
      .map((p, i) => ({ v: pick(p), i }))
      .filter((p) => p.v !== null && p.i >= start)
      .map((p, k) => `${k === 0 ? "M" : "L"}${x(p.i).toFixed(1)},${y(p.v!).toFixed(1)}`)
      .join(" ");
  // As linhas real e ideal partem do orçamento cheio, antes do primeiro dia.
  const start = `M${x(-1).toFixed(1)},${y(budget).toFixed(1)} `;
  const idealPath = start + path((p) => p.ideal).replace(/^M/, "L");
  const lastReal = points.reduce((found, p, i) => (p.real !== null ? i : found), -1);
  const realPath = lastReal >= 0 ? start + path((p) => p.real).replace(/^M/, "L") : "";
  const projectionPath = path((p) => p.projection?.p50 ?? null, Math.max(0, lastReal));
  const banded = points.map((p, i) => ({ band: p.projection, i })).filter((p) => p.band !== null && p.i >= lastReal);
  const bandPath = banded.length
    ? [...banded.map((p) => [x(p.i), y(p.band!.p90)]), ...[...banded].reverse().map((p) => [x(p.i), y(p.band!.p10)])]
        .map(([px, py], k) => `${k === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`)
        .join(" ") + " Z"
    : "";
  const end = points.at(-1)?.projection;
  const ticks = [max, max / 2, 0];
  const labelEvery = Math.ceil(points.length / 6);
  const today = lastReal >= 0 ? points[lastReal] : null;
  const summary = today
    ? `${label}: hoje restam ${formatMoney(today.real!)}; o ideal seria ${formatMoney(today.ideal)}${end ? `; a estimativa é terminar com ${formatMoney(end.p50)}, entre ${formatMoney(end.p10)} e ${formatMoney(end.p90)}` : ""}.`
    : `${label}: ainda não começou.`;
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary} className="w-full">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeWidth="1" />
            <text x={pad.left - 6} y={y(tick) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">
              {Math.round(tick).toLocaleString("pt-BR")}
            </text>
          </g>
        ))}
        {min < 0 && <line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} stroke="var(--expense)" strokeWidth="1" strokeDasharray="2 3" />}
        <path d={idealPath} fill="none" stroke="var(--muted-2)" strokeWidth="1.5" strokeDasharray="5 4" />
        {realPath && <path d={realPath} fill="none" stroke="var(--expense)" strokeWidth="2.2" strokeLinejoin="round" />}
        {bandPath && <path d={bandPath} fill="var(--primary)" fillOpacity="0.14" stroke="none" />}
        {projectionPath && <path d={projectionPath} fill="none" stroke="var(--primary)" strokeWidth="2" strokeDasharray="2 3" />}
        {today && (
          <g>
            <circle cx={x(lastReal)} cy={y(today.real!)} r="4.5" fill="var(--surface)" stroke="var(--expense)" strokeWidth="2" />
            <text x={x(lastReal)} y={y(today.real!) - 9} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--ink)">
              hoje
            </text>
          </g>
        )}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text key={p.x} x={x(i)} y={height - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">
              {p.label}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 bg-expense" />
          Real
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="w-4 border-t-[1.5px] border-dashed border-muted-2" />
          Ritmo ideal
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="relative h-2.5 w-4">
            <span className="absolute inset-0 rounded-sm bg-primary opacity-[0.14]" />
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-primary" />
          </span>
          Estimativa (faixa de 80%)
        </span>
      </figcaption>
    </figure>
  );
}
