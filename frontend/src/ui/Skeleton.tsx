import { cx } from "../lib/cx";

/** Bloco de carregamento. Use dentro de um contêiner com role="status". */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cx("block animate-pulse rounded-lg bg-surface-2", className)} />;
}

export function LoadingCard({ label = "Carregando…", rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div role="status" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 lg:p-5">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
