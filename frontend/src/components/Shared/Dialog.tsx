import * as RadixDialog from "@radix-ui/react-dialog";
import { useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "form",
  size = "normal",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "form" | "panel" | "confirmation";
  size?: "normal" | "wide";
  dismissible?: boolean;
}) {
  const descriptionId = useId();
  const returnTarget = useRef<HTMLElement | null>(null);
  return (
    <RadixDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && dismissible) onClose();
      }}
    >
      <RadixDialog.Portal
        container={document.getElementById("modal-root") || undefined}
      >
        <RadixDialog.Overlay className="dialog-overlay" />
        <RadixDialog.Content
          className={"dialog dialog-" + variant + " dialog-" + size}
          aria-describedby={description ? descriptionId : undefined}
          onOpenAutoFocus={() => {
            returnTarget.current = document.activeElement as HTMLElement | null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = returnTarget.current;
            if (target?.isConnected) target.focus();
            else document.getElementById("header-account-button")?.focus();
          }}
        >
          <div className="dialog-heading">
            <div>
              <RadixDialog.Title>{title}</RadixDialog.Title>
              {description && (
                <RadixDialog.Description id={descriptionId}>
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              className="icon-button"
              aria-label="Fechar"
              disabled={!dismissible}
            >
              <X size={20} />
            </RadixDialog.Close>
          </div>
          <div className="dialog-body">{children}</div>
          {footer && <div className="dialog-footer">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
