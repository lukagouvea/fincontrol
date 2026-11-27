import { Check } from "lucide-react";
import { cx } from "../../lib/cx";
import { formatShortDate, isoToDateKey } from "../../lib/dates";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RECURRING_PAYMENTS_KEY } from "../../hooks/useBills";
import { billService } from "../../services/billService";
import { Badge, type BadgeTone } from "../../ui/Chip";
import { useToast } from "../../ui/Toast";
import { billLabel, type Bill } from "../bills";
import type { LedgerEntry } from "../ledger";

const tone: Record<Bill["status"], BadgeTone> = { paga: "primary", "a-pagar": "neutral", vencida: "expense" };

/** Selo de conta a pagar. Em listas, só aparece enquanto não foi paga. */
export function BillBadge({ bill, showPaid, className }: { bill?: Bill; showPaid?: boolean; className?: string }) {
  if (!bill || (bill.status === "paga" && !showPaid)) return null;
  return (
    <Badge tone={tone[bill.status]} className={className}>
      {billLabel[bill.status]}
    </Badge>
  );
}

/** "Paga em 27 nov", "Vencida" etc. (detalhe). */
export function billDescription(bill: Bill) {
  if (bill.status === "paga") return bill.presumed ? "Paga" : `Paga em ${formatShortDate(isoToDateKey(bill.paidAt!))}`;
  return billLabel[bill.status];
}

/**
 * Marca/desmarca a conta como paga, com "Desfazer". Não usa o callback do
 * `mutate`: marcar remove a linha da lista ("Contas a pagar") e o React Query
 * não chama callbacks de um componente já desmontado; o aviso se perderia.
 */
export function useToggleBillPaid() {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [isPending, setPending] = useState(false);
  const save = async (entry: LedgerEntry, paidAt: string | null) => {
    if (entry.source === "recurring") await billService.setRecurringPaid(entry.id, entry.date.slice(0, 7), paidAt);
    else await billService.setInstallmentPaid(entry.id, paidAt);
    await queryClient.invalidateQueries({ queryKey: entry.source === "recurring" ? RECURRING_PAYMENTS_KEY : ["transactions"] });
  };
  const toggle = async (entry: LedgerEntry) => {
    if (!entry.bill || entry.bill.presumed) return;
    const wasPaid = entry.bill.status === "paga";
    const previous = entry.bill.paidAt;
    setPending(true);
    try {
      await save(entry, wasPaid ? null : new Date().toISOString());
      showToast({
        message: wasPaid ? `${entry.description}: pagamento desmarcado` : `${entry.description} marcada como paga`,
        actionLabel: "Desfazer",
        onAction: () => void save(entry, wasPaid ? previous : null).catch(() => showToast({ message: "Não foi possível desfazer. Tente de novo." })),
      });
    } catch {
      showToast({ message: "Não foi possível salvar o pagamento. Tente de novo." });
    } finally {
      setPending(false);
    }
  };
  return { toggle, isPending };
}

/** Botão redondo de marcar como paga (listas). */
export function BillCheckButton({ entry, className }: { entry: LedgerEntry; className?: string }) {
  const { toggle, isPending } = useToggleBillPaid();
  if (!entry.bill || entry.bill.presumed) return null;
  const paid = entry.bill.status === "paga";
  return (
    <button
      type="button"
      aria-pressed={paid}
      aria-label={paid ? `Desmarcar pagamento de ${entry.description}` : `Marcar ${entry.description} como paga`}
      disabled={isPending}
      onClick={(event) => {
        event.stopPropagation();
        void toggle(entry);
      }}
      className={cx(
        "inline-flex size-tap shrink-0 items-center justify-center rounded-full border-2",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60",
        paid ? "border-primary bg-primary text-on-primary" : entry.bill.status === "vencida" ? "border-expense text-expense" : "border-border-strong text-muted",
        className,
      )}
    >
      <Check size={18} strokeWidth={2.5} aria-hidden="true" className={paid ? undefined : "opacity-40"} />
    </button>
  );
}
