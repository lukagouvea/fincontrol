import { useEffect, useState } from "react";
import { useAddMonthlyVariation, useDeleteMonthlyVariation } from "../../hooks/useMonthlyVariations";
import { monthNames } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { Sheet } from "../../ui/Sheet";
import { Button } from "../../ui/Button";
import { Field, MoneyInput } from "../../ui/Field";
import { useToast } from "../../ui/Toast";
import type { LedgerEntry } from "../ledger";

/** Muda o valor de uma recorrente só no mês da ocorrência (variação). */
export function VariationSheet({
  entry,
  standardAmount,
  onClose,
}: {
  entry: LedgerEntry | null;
  /** Valor da versão vigente (sem variação). */
  standardAmount?: number;
  onClose: () => void;
}) {
  const addVariation = useAddMonthlyVariation();
  const deleteVariation = useDeleteMonthlyVariation();
  const showToast = useToast();
  const [text, setText] = useState<string>();
  const [value, setValue] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!entry) return;
    setText(String(entry.amount).replace(".", ","));
    setValue(entry.amount);
    setError("");
  }, [entry]);

  if (!entry) return null;
  const [year, month] = entry.date.split("-").map(Number);
  const busy = addVariation.isPending || deleteVariation.isPending;

  const save = async () => {
    if (value === null || value < 0) {
      setError("Informe um valor válido.");
      return;
    }
    try {
      await addVariation.mutateAsync({ fixedItemId: entry.id, amount: value, year, month: month - 1, type: entry.type });
      showToast({ message: `Valor de ${monthNames[month - 1].toLowerCase()} atualizado` });
      onClose();
    } catch {
      setError("Não foi possível salvar. Tente de novo.");
    }
  };

  const reset = async () => {
    if (!entry.recurring?.variationId) return;
    try {
      await deleteVariation.mutateAsync(entry.recurring.variationId);
      showToast({ message: "Valor padrão restaurado" });
      onClose();
    } catch {
      setError("Não foi possível restaurar. Tente de novo.");
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      dismissible={!busy}
      title={`Valor de ${monthNames[month - 1].toLowerCase()}`}
      description={`Muda só este mês de “${entry.description}”. Os outros meses continuam com o valor da recorrência.`}
      footer={
        <>
          <Button size="lg" block onClick={save} loading={addVariation.isPending} className="lg:w-auto">
            Salvar valor do mês
          </Button>
          {entry.recurring?.hasVariation && (
            <Button variant="secondary" size="lg" block onClick={reset} loading={deleteVariation.isPending} className="lg:w-auto">
              Voltar ao padrão{standardAmount !== undefined ? ` (${formatMoney(standardAmount)})` : ""}
            </Button>
          )}
        </>
      }
    >
      <Field label="Valor neste mês" error={error}>
        <MoneyInput value={text} onValueChange={(next) => setText(next)} onNumberChange={setValue} />
      </Field>
    </Sheet>
  );
}
