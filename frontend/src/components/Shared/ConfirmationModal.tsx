import { useEffect, useState } from "react";
import { Dialog } from "./Dialog";
import { Button, ErrorState } from "./UI";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmationMessage?: string;
};
export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmationMessage = "Confirmar",
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (isOpen) {
      setError("");
      setBusy(false);
    }
  }, [isOpen]);
  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm();
    } catch {
      setError("Não foi possível concluir. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      dismissible={!busy}
      open={isOpen}
      onClose={onClose}
      title={title}
      description={message}
      variant="confirmation"
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy ? "Aguarde…" : confirmationMessage}
          </Button>
        </>
      }
    >
      {error ? (
        <ErrorState message={error} />
      ) : (
        <p className="subtle">Confirme para continuar.</p>
      )}
    </Dialog>
  );
}
