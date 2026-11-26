import type { HTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { cx } from "../lib/cx";

/** Cartão base: raio 20, padding 16 (mobile) / 20 (desktop). */
export function Card({
  tone = "default",
  className,
  as: Tag = "section",
  ...props
}: HTMLAttributes<HTMLElement> & {
  tone?: "default" | "hero" | "flat";
  as?: "section" | "div" | "article" | "li";
}) {
  return (
    <Tag
      className={cx(
        "flex flex-col gap-3 rounded-card p-4 lg:p-5",
        tone === "default" && "border border-border bg-surface",
        tone === "hero" && "bg-hero text-on-hero",
        tone === "flat" && "bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

/** Título do cartão com ação opcional à direita ("Ver todas"). */
export function CardHeader({
  title,
  subtitle,
  action,
  id,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: { label: string; to: string } | ReactNode;
  id?: string;
}) {
  const isLink = action && typeof action === "object" && "to" in action;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="text-base font-semibold text-ink lg:text-[17px]">
          {title}
        </h2>
        {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
      </div>
      {isLink ? (
        <Link
          to={(action as { to: string }).to}
          className="-my-2 inline-flex min-h-tap shrink-0 items-center text-sm font-semibold text-primary hover:underline"
        >
          {(action as { label: string }).label}
        </Link>
      ) : (
        (action as ReactNode)
      )}
    </div>
  );
}
