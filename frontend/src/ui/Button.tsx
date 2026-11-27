import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { cx } from "../lib/cx";

export type ButtonVariant = "primary" | "secondary" | "danger" | "link" | "ghost";
export type ButtonSize = "lg" | "md";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none transition-[opacity,background-color] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:opacity-90",
  secondary: "bg-surface text-ink border border-border hover:bg-surface-2",
  danger: "bg-expense text-on-primary hover:opacity-90",
  link: "text-primary hover:underline underline-offset-4",
  ghost: "text-ink hover:bg-surface-2",
};

const sizes: Record<ButtonSize, string> = {
  // Botão principal: 56px, pílula. Botões de cabeçalho/ação: 44px.
  lg: "min-h-btn px-6 rounded-full text-base",
  md: "min-h-tap px-4 rounded-full text-sm",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  block = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
} = {}) {
  return cx(
    base,
    variants[variant],
    variant === "link" ? "min-h-tap px-1 text-sm" : sizes[size],
    block && "w-full",
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, loading, icon, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass({ variant, size, block, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({
  variant,
  size,
  block,
  icon,
  className,
  children,
  ...props
}: LinkProps & { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; icon?: ReactNode }) {
  return (
    <Link className={buttonClass({ variant, size, block, className })} {...props}>
      {icon}
      {children}
    </Link>
  );
}

/** Botão redondo de 44px com borda (sino, engrenagem, fechar). */
export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; bare?: boolean }
>(function IconButton({ label, bare, className, children, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-tap shrink-0 items-center justify-center rounded-full text-ink",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        "disabled:cursor-not-allowed disabled:opacity-50",
        bare ? "hover:bg-surface-2" : "border border-border bg-surface hover:bg-surface-2",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
