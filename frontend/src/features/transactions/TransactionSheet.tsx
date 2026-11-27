import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { MoreHorizontal } from "lucide-react";
import { useCategories } from "../../hooks/useCategories";
import { useAddCompraParcelada, useUpdateTransaction } from "../../hooks/useTransactions";
import { useAddFixedExpense, useAddFixedIncome } from "../../hooks/useFixedTransactions";
import { useCards } from "../../hooks/useCards";
import { useOfflineQueue } from "../../app/OfflineQueue";
import { cardVars } from "../cards/cardStyle";
import { closingDateOf, invoiceKeyFor } from "../invoice";
import { formatShortDate } from "../../lib/dates";
import type { Category } from "../../types/FinanceTypes";
import { cx } from "../../lib/cx";
import { dateKeyToIso, parseDateKey, toDateKey } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { Sheet } from "../../ui/Sheet";
import { Button } from "../../ui/Button";
import { Field, SelectInput, TextInput } from "../../ui/Field";
import { Segmented } from "../../ui/Segmented";
import { Toggle } from "../../ui/Toggle";
import { useToast } from "../../ui/Toast";
import { CategoryIcon } from "../../ui/CategoryIcon";
import { MoneyInput } from "../../ui/MoneyInput";
import { CategoryPicker } from "./CategoryPicker";
import type { EntryType, LedgerEntry } from "../ledger";

export type TransactionDraft = {
  type?: EntryType;
  amount?: number;
  description?: string;
  categoryId?: string | null;
  date?: string;
  cardId?: string | null;
};

const LAST_PAYMENT_KEY = "fincontrol:last-payment";
const readLastPayment = () => {
  try {
    return localStorage.getItem(LAST_PAYMENT_KEY);
  } catch {
    return null;
  }
};
const saveLastPayment = (cardId: string | null) => {
  try {
    localStorage.setItem(LAST_PAYMENT_KEY, cardId ?? "avista");
  } catch {
    /* só uma conveniência */
  }
};

export type TransactionSheetMode =
  | { kind: "create"; draft?: TransactionDraft }
  | { kind: "edit"; entry: LedgerEntry };

const QUICK_CATEGORIES = 5;
const MAX_INSTALLMENTS = 48;

export function TransactionSheet({
  open,
  mode,
  onClose,
}: {
  open: boolean;
  mode: TransactionSheetMode;
  onClose: () => void;
}) {
  const formId = useId();
  const editing = mode.kind === "edit" ? mode.entry : null;
  const categoriesQuery = useCategories();
  const updateTransaction = useUpdateTransaction();
  const addInstallments = useAddCompraParcelada();
  const addFixedExpense = useAddFixedExpense();
  const addFixedIncome = useAddFixedIncome();
  const showToast = useToast();
  const cardsQuery = useCards();
  const offline = useOfflineQueue();
  const activeCards = useMemo(() => (cardsQuery.data ?? []).filter((card) => !card.archived), [cardsQuery.data]);

  const [type, setType] = useState<EntryType>("expense");
  const [amount, setAmount] = useState<number | null>(null);
  // Categoria escolhida; a usada é `categoryId`, abaixo (cai na primeira do tipo se não valer).
  const [chosenCategoryId, setCategoryId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(toDateKey(new Date()));
  const [installments, setInstallments] = useState(1);
  const [cardId, setCardId] = useState<string | null>(null);
  const [repeat, setRepeat] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Rascunho reinicia só ao abrir ou ao trocar o registro editado.
  useEffect(() => {
    if (!open) return;
    const source = editing ?? (mode.kind === "create" ? mode.draft : undefined);
    setType(source?.type ?? "expense");
    setAmount(source?.amount ?? null);
    setCategoryId(source?.categoryId ?? "");
    setDescription(source?.description ?? "");
    setDate(source?.date ?? toDateKey(new Date()));
    const last = readLastPayment();
    setCardId(source && "cardId" in source && source.cardId !== undefined ? source.cardId : last && last !== "avista" ? last : null);
    setInstallments(1);
    setRepeat(false);
    setErrors({});
    setSubmitError("");
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.key]);

  const categories = useMemo(
    () =>
      (categoriesQuery.data ?? []).filter(
        (category) => category.type === type && (category.active !== false || category.id === chosenCategoryId),
      ),
    [categoriesQuery.data, type, chosenCategoryId],
  );

  // Categoria padrão: a primeira do tipo, quando nenhuma (válida) foi escolhida.
  // Derivada na renderização, não corrigida por efeito: um efeito rodava no
  // instante em que a folha abria ainda com o tipo anterior (ex.: editar uma
  // despesa logo depois de lançar uma receita) e trocava a categoria salva.
  const categoryId = categories.some((category) => category.id === chosenCategoryId) ? chosenCategoryId : categories[0]?.id ?? "";

  const quick = useMemo(() => {
    const first = categories.slice(0, QUICK_CATEGORIES);
    const selected = categories.find((category) => category.id === categoryId);
    if (selected && !first.includes(selected)) first[first.length - 1] = selected;
    return first;
  }, [categories, categoryId]);

  // Último cartão usado pode ter sido arquivado/apagado: volta para À vista.
  const card = type === "expense" ? (cardsQuery.data ?? []).find((item) => item.id === cardId) : undefined;
  useEffect(() => {
    if (open && cardId && cardsQuery.data && !cardsQuery.data.some((item) => item.id === cardId)) setCardId(null);
  }, [open, cardId, cardsQuery.data]);
  const effectiveCardId = card ? card.id : null;

  const isInstallment = !editing && type === "expense" && installments > 1 && offline.online;
  const canRepeat = !editing && !isInstallment && offline.online;
  const day = parseDateKey(date).getDate();
  const label = type === "income" ? "receita" : "despesa";
  const title = editing ? `Editar ${label}` : "Nova transação";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const next: Record<string, string> = {};
    if (amount === null || !Number.isFinite(amount) || amount <= 0) next.amount = "Informe um valor maior que zero.";
    if (!categoryId) next.category = "Escolha uma categoria.";
    if (!description.trim()) next.description = "Informe uma descrição.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = "Informe a data.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    setSubmitError("");
    const payload = {
      description: description.trim(),
      amount: amount!,
      categoryId,
      date: dateKeyToIso(date),
      type,
      cardId: effectiveCardId,
    };
    try {
      if (editing) {
        await updateTransaction.mutateAsync({ id: editing.id, data: payload });
        showToast({ message: `${type === "income" ? "Receita" : "Despesa"} atualizada` });
      } else if (isInstallment) {
        await addInstallments.mutateAsync({ ...payload, numParcelas: installments });
        showToast({ message: `Compra parcelada em ${installments}x salva` });
      } else if (repeat) {
        const rule = { description: payload.description, amount: payload.amount, categoryId, day, startDate: payload.date, type, cardId: effectiveCardId };
        await (type === "income" ? addFixedIncome : addFixedExpense).mutateAsync(rule as never);
        showToast({ message: `Recorrente salva: todo dia ${day}` });
      } else {
        const { queued } = await offline.submit(payload);
        showToast({
          message: queued
            ? "Sem conexão: lançamento guardado. Será enviado quando a internet voltar."
            : `${type === "income" ? "Receita" : "Despesa"} salva`,
        });
      }
      if (type === "expense") saveLastPayment(effectiveCardId);
      onClose();
    } catch {
      setSubmitError("Não foi possível salvar. O que você preencheu foi mantido.");
      setSubmitting(false);
    }
  };

  const perInstallment = amount && installments > 1 ? amount / installments : null;

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={title}
        mobile="full"
        dismissible={!submitting}
        footer={
          <>
            <Button type="submit" form={formId} size="lg" block loading={submitting} className="lg:w-auto">
              {editing ? "Salvar alterações" : `Salvar ${label}`}
            </Button>
            <Button variant="secondary" size="lg" onClick={onClose} disabled={submitting} className="hidden lg:inline-flex">
              Cancelar
            </Button>
          </>
        }
      >
        <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-5">
          {!editing && (
            <Segmented
              label="Tipo"
              value={type}
              onChange={(value) => {
                setType(value);
                setCategoryId("");
                if (value === "income") setInstallments(1);
              }}
              options={[
                { value: "expense", label: "Despesa" },
                { value: "income", label: "Receita" },
              ]}
            />
          )}

          <div className="flex flex-col items-center gap-1">
            <label htmlFor={`${formId}-amount`} className="text-sm text-muted">
              Valor{isInstallment ? " total" : ""}
            </label>
            <MoneyInput
              id={`${formId}-amount`}
              mode="cents"
              appearance="big"
              value={amount}
              onValueChange={setAmount}
              invalid={!!errors.amount}
              aria-describedby={errors.amount ? `${formId}-amount-error` : undefined}
              className={type === "expense" ? "caret-expense" : "caret-income"}
            />
            {errors.amount && (
              <p id={`${formId}-amount-error`} className="text-[13px] text-expense">
                {errors.amount}
              </p>
            )}
            {perInstallment && (
              <p className="text-[13px] text-muted">
                {installments}x de {formatMoney(perInstallment)}
              </p>
            )}
          </div>

          {type === "expense" && (activeCards.length > 0 || card) && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-semibold">Pago com</legend>
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0">
                <PaymentChoice selected={!card} onSelect={() => setCardId(null)} title="À vista" subtitle="Pix, dinheiro" />
                {activeCards.map((item) => (
                  <PaymentChoice
                    key={item.id}
                    selected={card?.id === item.id}
                    onSelect={() => setCardId(item.id)}
                    title={item.name}
                    subtitle={`•••• ${item.last4}`}
                    dot={cardVars(item.color).background}
                  />
                ))}
              </div>
              <p className="text-[13px] text-muted">
                {card
                  ? `${isInstallment ? "1ª parcela entra" : "Entra"} na fatura que fecha em ${formatShortDate(closingDateOf(invoiceKeyFor(date, card.closingDay), card.closingDay))}.`
                  : "À vista é Pix, dinheiro ou débito: não entra em nenhuma fatura."}
              </p>
            </fieldset>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold">Categoria</legend>
            {categoriesQuery.isError ? (
              <p role="alert" className="text-[13px] text-expense">
                Não foi possível carregar as categorias.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {quick.map((category) => (
                  <CategoryChoice
                    key={category.id}
                    category={category}
                    selected={category.id === categoryId}
                    onSelect={() => setCategoryId(category.id)}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className={cx(
                    choiceBase,
                    "border-dashed border-border-strong text-ink-2 hover:bg-surface-2",
                  )}
                >
                  <MoreHorizontal size={20} aria-hidden="true" />
                  <span>{categories.length > QUICK_CATEGORIES ? "Mais" : "+ Nova"}</span>
                </button>
              </div>
            )}
            {errors.category && <p className="text-[13px] text-expense">{errors.category}</p>}
          </fieldset>

          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-[1fr_auto] lg:grid-cols-[1fr_200px]">
            <Field label="Descrição" error={errors.description}>
              <TextInput
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={type === "income" ? "Ex.: Cashback" : "Ex.: Restaurante"}
                autoComplete="off"
                maxLength={120}
              />
            </Field>
            <Field label="Data" error={errors.date}>
              <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </Field>
          </div>

          {!editing && !offline.online && (
            <p className="rounded-field bg-surface-2 px-4 py-3 text-[13px] text-ink-2">
              Sem conexão: este lançamento fica guardado no aparelho e é enviado quando a internet voltar. Parcelas e recorrências precisam de conexão.
            </p>
          )}
          {!editing && type === "expense" && offline.online && (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <label htmlFor={`${formId}-installments`} className="text-[15px] font-semibold">
                  Parcelas
                </label>
                <p className="text-[13px] text-muted">
                  {installments > 1 ? "Uma parcela por mês a partir da data" : "À vista ou parcela única"}
                </p>
              </div>
              <SelectInput
                id={`${formId}-installments`}
                value={installments}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setInstallments(value);
                  if (value > 1) setRepeat(false);
                }}
                className="!w-28 shrink-0 rounded-full"
              >
                {Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1).map((count) => (
                  <option key={count} value={count}>
                    {count}x
                  </option>
                ))}
              </SelectInput>
            </div>
          )}

          {canRepeat && (
            <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4">
              <div className="min-w-0">
                <span className="block text-[15px] font-semibold">Repetir todo mês</span>
                <span className="block text-[13px] text-muted">
                  {repeat ? `Lança sozinho todo dia ${day}` : "Desligado"}
                </span>
              </div>
              <Toggle checked={repeat} onChange={setRepeat} label="Repetir todo mês" />
            </div>
          )}

          {submitError && (
            <p role="alert" className="rounded-field bg-expense-tint px-4 py-3 text-sm text-expense">
              {submitError}
            </p>
          )}
        </form>
      </Sheet>
      <CategoryPicker
        open={pickerOpen}
        type={type}
        selectedId={categoryId}
        onClose={() => setPickerOpen(false)}
        onSelect={(id) => {
          setCategoryId(id);
          setPickerOpen(false);
        }}
      />
    </>
  );
}

const choiceBase =
  "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border px-2 text-sm font-semibold " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function CategoryChoice({
  category,
  selected,
  onSelect,
}: {
  category: Category;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cx(
        choiceBase,
        selected
          ? "border-primary bg-primary-tint text-primary"
          : "border-border bg-surface text-ink hover:bg-surface-2",
      )}
    >
      <CategoryIcon category={category} className="!size-6 !bg-transparent" />
      <span className="max-w-full truncate">{category.name}</span>
    </button>
  );
}

function PaymentChoice({
  selected,
  onSelect,
  title,
  subtitle,
  dot,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
  dot?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cx(
        "flex min-h-[60px] min-w-[110px] shrink-0 flex-col justify-center rounded-2xl border-2 px-4 text-left",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        selected ? "border-primary bg-primary-tint" : "border-border bg-surface hover:bg-surface-2",
      )}
    >
      <span className="flex items-center gap-1.5 text-[15px] font-semibold">
        {dot && <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: dot }} />}
        {title}
      </span>
      <span className="text-xs text-muted">{subtitle}</span>
    </button>
  );
}
