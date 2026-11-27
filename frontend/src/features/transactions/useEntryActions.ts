import { useDeleteTransaction } from "../../hooks/useTransactions";
import { usePendingDeletes } from "../../app/PendingDeletes";
import type { LedgerEntry } from "../ledger";

/** Exclusão com desfazer de uma linha do livro (avulsa ou compra parcelada inteira). */
export function useDeleteEntry() {
  const remove = useDeleteTransaction();
  const { scheduleDelete } = usePendingDeletes();
  return (entry: LedgerEntry, siblings: LedgerEntry[] = []) => {
    const group = entry.installment?.groupId;
    // A API apaga a compra parcelada inteira; escondemos as parcelas visíveis do grupo.
    const keys = group
      ? siblings.filter((item) => item.installment?.groupId === group).map((item) => item.key).concat(entry.key)
      : [entry.key];
    scheduleDelete({
      keys,
      message: group ? "Compra parcelada excluída" : "Transação excluída",
      commit: () => remove.mutateAsync(entry.id),
    });
  };
}
