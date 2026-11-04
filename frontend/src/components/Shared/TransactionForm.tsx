import { useEffect, useId, useState } from "react";
import CurrencyInput from "react-currency-input-field";
import { Loader2 } from "lucide-react";
import { useCategories } from "../../hooks/useCategories";
import { getCurrentDateAsYYYYMMDD } from "../../utils/dateUtils";
import type {
  FixedTransaction,
  VariableExpense,
} from "../../types/FinanceTypes";
import { Dialog } from "./Dialog";
import { Button, ErrorState } from "./UI";

export type TransactionFormValues = {
  description: string;
  amount: number;
  categoryId: string;
  date: string;
  isInstallment: boolean;
  installmentCount: number;
  day: number;
  startDate: string;
  endDate?: string;
};
export type TransactionFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionFormValues) => void | Promise<void>;
  initialData?: Partial<FixedTransaction & VariableExpense> | null;
  initialDate?: string;
  isLoading?: boolean;
  kind: "income" | "expense";
  recurring?: boolean;
};
export function TransactionForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  initialDate,
  isLoading = false,
  kind,
  recurring = false,
}: TransactionFormProps) {
  const id = useId();
  const query = useCategories();
  const categories = (query.data || []).filter(
    (c) =>
      c.type === kind &&
      (c.active !== false || c.id === initialData?.categoryId),
  );
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<string>();
  const [numeric, setNumeric] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [day, setDay] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [installment, setInstallment] = useState(false);
  const [count, setCount] = useState("2");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    setDescription(initialData?.description || "");
    setAmount(initialData?.amount?.toString());
    setNumeric(initialData?.amount ?? null);
    setDate(
      initialData?.date?.split("T")[0] ||
        initialDate ||
        getCurrentDateAsYYYYMMDD(),
    );
    setCategoryId(initialData?.categoryId || "");
    setDay(initialData?.day?.toString() || "");
    setStart(
      initialData?.startDate?.split("T")[0] || getCurrentDateAsYYYYMMDD(),
    );
    setEnd(initialData?.endDate?.split("T")[0] || "");
    setInstallment(false);
    setCount("2");
    setErrors({});
    setError("");
    setSubmitting(false);
    // Category refetches must not erase a draft. Reset only when opening or editing another record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData?.id]);
  useEffect(() => {
    if (isOpen && !categoryId && categories[0]) setCategoryId(categories[0].id);
  }, [isOpen, categoryId, categories]);
  const busy = submitting || isLoading;
  const label = kind === "income" ? "receita" : "despesa";
  const title =
    (initialData ? "Editar " : "Nova ") + label + (recurring ? " fixa" : "");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const next: Record<string, string> = {};
    if (!description.trim()) next.description = "Informe uma descrição.";
    if (numeric === null || !Number.isFinite(numeric) || numeric <= 0)
      next.amount = "Informe um valor maior que zero.";
    if (!categoryId) next.category = "Selecione uma categoria.";
    if (!recurring && !date) next.date = "Informe a data.";
    if (
      recurring &&
      (!Number.isInteger(Number(day)) || Number(day) < 1 || Number(day) > 31)
    )
      next.day = "Escolha um dia de 1 a 31.";
    if (recurring && !start) next.start = "Informe a data de início.";
    if (recurring && end && end < start)
      next.end = "A data final deve ser igual ou posterior ao início.";
    if (
      installment &&
      (!Number.isInteger(Number(count)) ||
        Number(count) < 2 ||
        Number(count) > 48)
    )
      next.count = "Informe de 2 a 48 parcelas.";
    setErrors(next);
    setError("");
    if (Object.keys(next).length) {
      requestAnimationFrame(() =>
        document.getElementById(id + "-" + Object.keys(next)[0])?.focus(),
      );
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        description: description.trim(),
        amount: numeric!,
        categoryId,
        date,
        day: Number(day),
        startDate: start,
        endDate: end || undefined,
        isInstallment: installment,
        installmentCount: Number(count),
      });
    } catch {
      setError(
        "Não foi possível salvar. Seu preenchimento foi mantido. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  const fieldError = (key: string) =>
    errors[key] ? (
      <p id={id + "-" + key + "-error"} className="field-error">
        {errors[key]}
      </p>
    ) : null;
  const accessibility = (key: string) => ({
    "aria-invalid": !!errors[key],
    "aria-describedby": errors[key] ? id + "-" + key + "-error" : undefined,
  });
  return (
    <Dialog
      dismissible={!busy}
      open={isOpen}
      onClose={onClose}
      title={title}
      description={
        recurring
          ? "Um compromisso que se repete a cada mês."
          : "Adicione os detalhes da movimentação."
      }
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={id}
            disabled={busy || query.isError || categories.length === 0}
          >
            {busy && <Loader2 className="animate-spin" />}
            {busy ? "Salvando…" : initialData ? "Salvar" : "Criar"}
          </Button>
        </>
      }
    >
      <form id={id} onSubmit={submit} noValidate className="form-stack">
        {error && <ErrorState message={error} />}
        {query.isError && (
          <ErrorState
            message="Não foi possível carregar as categorias."
            retry={() => void query.refetch()}
          />
        )}
        <div className="field">
          <label htmlFor={id + "-description"}>Descrição</label>
          <input
            id={id + "-description"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autoComplete="off"
            placeholder="Ex.: Mercado, salário, aluguel"
            {...accessibility("description")}
            required
          />
          {fieldError("description")}
        </div>
        <div className="field">
          <label htmlFor={id + "-amount"}>Valor (R$)</label>
          <CurrencyInput
            id={id + "-amount"}
            value={amount}
            prefix="R$ "
            intlConfig={{ locale: "pt-BR", currency: "BRL" }}
            decimalsLimit={2}
            decimalScale={2}
            inputMode="decimal"
            allowNegativeValue={false}
            onValueChange={(value, _name, values) => {
              setAmount(value);
              setNumeric(values?.float ?? null);
            }}
            {...accessibility("amount")}
            required
          />
          {fieldError("amount")}
        </div>
        <div className="field">
          <label htmlFor={id + "-category"}>Categoria</label>
          <select
            id={id + "-category"}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            {...accessibility("category")}
            required
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.active === false ? " (arquivada)" : ""}
              </option>
            ))}
          </select>
          {fieldError("category")}
          {!query.isLoading && !query.isError && !categories.length && (
            <p className="field-hint">
              Cadastre uma categoria de {label} antes de criar o lançamento.
            </p>
          )}
        </div>
        {recurring ? (
          <>
            <div className="field">
              <label htmlFor={id + "-day"}>
                {kind === "income" ? "Dia do recebimento" : "Dia do vencimento"}
              </label>
              <input
                id={id + "-day"}
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={day}
                onChange={(e) => setDay(e.target.value)}
                {...accessibility("day")}
              />
              {fieldError("day")}
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor={id + "-start"}>Data de início</label>
                <input
                  id={id + "-start"}
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  {...accessibility("start")}
                />
                {fieldError("start")}
              </div>
              <div className="field">
                <label htmlFor={id + "-end"}>Data final (opcional)</label>
                <input
                  id={id + "-end"}
                  type="date"
                  min={start}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  {...accessibility("end")}
                />
                {fieldError("end")}
              </div>
            </div>
          </>
        ) : (
          <div className="field">
            <label htmlFor={id + "-date"}>Data</label>
            <input
              id={id + "-date"}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              {...accessibility("date")}
            />
            {fieldError("date")}
          </div>
        )}
        {!recurring && kind === "expense" && !initialData && (
          <>
            <label className="check-field">
              <input
                type="checkbox"
                checked={installment}
                onChange={(e) => setInstallment(e.target.checked)}
              />
              Pagamento parcelado
            </label>
            {installment && (
              <div className="field">
                <label htmlFor={id + "-count"}>Número de parcelas</label>
                <input
                  id={id + "-count"}
                  type="number"
                  inputMode="numeric"
                  min={2}
                  max={48}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  {...accessibility("count")}
                />
                {fieldError("count")}
                <p className="field-hint">
                  O valor informado acima é o total da compra.
                </p>
              </div>
            )}
          </>
        )}
      </form>
    </Dialog>
  );
}
