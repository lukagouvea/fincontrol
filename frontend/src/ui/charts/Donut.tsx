import type { ReactNode } from "react";
import { formatMoney } from "../../lib/money";

export type DonutSlice = { key: string; label: string; value: number; color: string };

/** Rosca com o total no centro. Fatias em ordem, começando ao meio-dia. */
export function Donut({
  slices,
  label,
  center,
  size = 164,
  thickness = 30,
}: {
  slices: DonutSlice[];
  label: string;
  center?: ReactNode;
  size?: number;
  thickness?: number;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = slices.length > 1 ? 2 : 0;
  let offset = 0;
  const description = slices
    .map((slice) => `${slice.label} ${total ? Math.round((slice.value / total) * 100) : 0}% (${formatMoney(slice.value)})`)
    .join(", ");
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${description}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
        {total > 0 &&
          slices.map((slice) => {
            const length = (slice.value / total) * circumference;
            const dash = Math.max(0, length - gap);
            const element = (
              <circle
                key={slice.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            offset += length;
            return element;
          })}
      </svg>
      {center && (
        <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {center}
        </div>
      )}
    </div>
  );
}
