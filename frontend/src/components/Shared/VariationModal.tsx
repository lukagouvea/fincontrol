import { useEffect, useId, useState } from "react";
import CurrencyInput from "react-currency-input-field";
import type { MonthlyVariation } from "../../types/FinanceTypes";
import { Dialog } from "./Dialog";
import { Button, ErrorState, MonthPicker } from "./UI";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    year: number;
    month: number;
    amount: number;
  }) => void | Promise<void>;
  itemDescription: string;
  defaultAmount: number;
  existingVariations: MonthlyVariation[];
  formatValue: (amount: number) => string;
  formatMonthYear: (month: number, year: number) => string;
};
export function VariationModal({
  isOpen,
  onClose,
  onSubmit,
  itemDescription,
  defaultAmount,
  existingVariations,
  formatValue,
  formatMonthYear,
}: Props) {
  const id = useId();
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [amount, setAmount] = useState<string>();
  const [numeric, setNumeric] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (isOpen) {
      setMonth(new Date().getMonth());
      setYear(new Date().getFullYear());
      setError("");
    }
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const value =
      existingVariations.find((v) => v.year === year && v.month === month)
        ?.amount ?? defaultAmount;
    setAmount(String(value));
    setNumeric(value);
    // Reset the value only when changing the selected period, not on a background refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, month, year, defaultAmount]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (numeric === null || numeric < 0) {
      setError("Informe um valor válido.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit({ year, month, amount: numeric });
    } catch {
      setError(
        "Não foi possível salvar a variação. Seu preenchimento foi mantido.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      dismissible={!busy}
      open={isOpen}
      onClose={onClose}
      title="Variação mensal"
      description={itemDescription}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={id} disabled={busy}>
            {busy ? "Salvando…" : "Salvar variação"}
          </Button>
        </>
      }
    >
      <form id={id} className="form-stack" onSubmit={submit}>
        {error && <ErrorState message={error} />}
        <MonthPicker
          month={month}
          year={year}
          onChange={(m, y) => {
            setMonth(m);
            setYear(y);
          }}
        />
        <div className="field">
          <label htmlFor={id + "-amount"}>Valor para este mês (R$)</label>
          <CurrencyInput
            id={id + "-amount"}
            value={amount}
            onValueChange={(value, _name, values) => {
              setAmount(value);
              setNumeric(values?.float ?? null);
            }}
            prefix="R$ "
            intlConfig={{ locale: "pt-BR", currency: "BRL" }}
            decimalScale={2}
            decimalsLimit={2}
            inputMode="decimal"
            allowNegativeValue={false}
          />
          <p className="field-hint">
            Padrão: {formatValue(defaultAmount)}. Use o mesmo valor para remover
            a variação do mês.
          </p>
        </div>
        {existingVariations.length > 0 && (
          <div className="variation-history">
            <h3>Valores por mês</h3>
            {[...existingVariations]
              .sort((a, b) => b.year - a.year || b.month - a.month)
              .map((v) => (
                <p key={v.id}>
                  <span>{formatMonthYear(v.month, v.year)}</span>
                  <strong>{formatValue(v.amount)}</strong>
                </p>
              ))}
          </div>
        )}
      </form>
    </Dialog>
  );
}
