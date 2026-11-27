import type { ReactNode } from "react";
import { Sheet } from "./Sheet";
import { Button } from "./Button";

/** Confirmação (folha no mobile, diálogo no desktop). */
export function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel,
  tone = "danger",
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      dismissible={!busy}
      footer={
        <>
          <Button variant={tone} size="lg" block loading={busy} onClick={onConfirm} className="lg:w-auto">
            {confirmLabel}
          </Button>
          <Button variant="secondary" size="lg" block disabled={busy} onClick={onClose} className="lg:w-auto">
            Cancelar
          </Button>
        </>
      }
    >
      <div className="text-[15px] text-ink-2">{description}</div>
    </Sheet>
  );
}
