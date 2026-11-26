import * as RadixDialog from "@radix-ui/react-dialog";
import { useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cx } from "../lib/cx";
import { IconButton } from "./Button";

/**
 * Um só componente para sobreposições (DESIGN.md):
 * - abaixo de 1024px: folha inferior (raio 28 em cima, alça 40×5), presa ao
 *   viewport visível para acompanhar o teclado (useViewport);
 * - a partir de 1024px: diálogo centralizado (520px, 620px em `wide`) ou painel
 *   lateral (`desktop="panel"`).
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "normal",
  desktop = "dialog",
  mobile = "sheet",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "normal" | "wide";
  desktop?: "dialog" | "panel";
  /** "full" ocupa a tela toda abaixo de 1024px (telas do design mobile). */
  mobile?: "sheet" | "full";
  dismissible?: boolean;
}) {
  const returnTarget = useRef<HTMLElement | null>(null);
  return (
    <RadixDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && dismissible) onClose();
      }}
    >
      <RadixDialog.Portal container={document.getElementById("modal-root") || undefined}>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <RadixDialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            returnTarget.current = document.activeElement as HTMLElement | null;
          }}
          onCloseAutoFocus={(event) => {
            const target = returnTarget.current;
            if (target?.isConnected) {
              event.preventDefault();
              target.focus();
            }
          }}
          className={cx(
            "fixed z-50 flex flex-col bg-surface text-ink shadow-dialog outline-none",
            mobile === "full"
              ? // Mobile: tela cheia, presa ao viewport visível (teclado)
                "inset-x-0 top-[var(--viewport-top,0px)] h-[var(--viewport-height,100dvh)] bg-bg pt-[env(safe-area-inset-top)] lg:h-auto lg:bg-surface lg:pt-0"
              : // Mobile: folha inferior
                "inset-x-0 top-[calc(var(--viewport-top,0px)+var(--viewport-height,100dvh))] -translate-y-full max-h-[calc(var(--viewport-height,100dvh)-24px)] rounded-t-sheet",
            desktop === "dialog"
              ? cx(
                  "lg:inset-x-auto lg:left-1/2 lg:top-24 lg:-translate-x-1/2 lg:translate-y-0",
                  "lg:max-h-[calc(100dvh-120px)] lg:rounded-dialog",
                  size === "wide" ? "lg:w-[min(620px,calc(100%-48px))]" : "lg:w-[min(520px,calc(100%-48px))]",
                )
              : "lg:inset-y-0 lg:left-auto lg:right-0 lg:top-0 lg:h-full lg:max-h-none lg:w-[420px] lg:translate-y-0 lg:rounded-none lg:rounded-l-dialog",
          )}
        >
          {mobile === "sheet" && (
            <div aria-hidden="true" className="mx-auto mt-2.5 h-[5px] w-10 shrink-0 rounded-full bg-border-strong lg:hidden" />
          )}
          <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-4 lg:px-7 lg:pt-7">
            <div className="min-w-0">
              <RadixDialog.Title className="font-num text-[22px] font-semibold leading-tight">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="mt-1 text-sm text-muted">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild disabled={!dismissible}>
              <IconButton label="Fechar" bare className="-mr-2 -mt-1">
                <X size={20} aria-hidden="true" />
              </IconButton>
            </RadixDialog.Close>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pb-5 pt-2 lg:px-7">
            {children}
          </div>
          {footer && (
            <div className="flex flex-col gap-2 border-t border-border px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 lg:flex-row-reverse lg:px-7 lg:pb-7">
              {footer}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
