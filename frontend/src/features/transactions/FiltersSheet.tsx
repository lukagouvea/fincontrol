import { useEffect, useState } from "react";
import type { Card, Category } from "../../types/FinanceTypes";
import { Sheet } from "../../ui/Sheet";
import { Button } from "../../ui/Button";
import { Chip } from "../../ui/Chip";
import { Field, TextInput } from "../../ui/Field";
import { MoneyInput } from "../../ui/MoneyInput";
import { EMPTY_FILTERS, type Period, type TransactionFilters } from "./filters";

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "mes", label: "Este mês" },
  { value: "mes-passado", label: "Mês passado" },
  { value: "3-meses", label: "3 meses" },
  { value: "datas", label: "Escolher datas" },
];

const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

/**
 * Filtros (Filtros.html / DeskFiltros.html: painel lateral no desktop).
 * `count` diz quantos resultados o rascunho daria, para o botão.
 */
export function FiltersSheet({
  open,
  value,
  cards,
  categories,
  count,
  onPreview,
  onApply,
  onClose,
}: {
  open: boolean;
  value: TransactionFilters;
  cards: Card[];
  categories: Category[];
  count: (filters: TransactionFilters) => number | null;
  onPreview?: (filters: TransactionFilters) => void;
  onApply: (filters: TransactionFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<TransactionFilters>(value);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
  }, [open, value]);

  const update = (next: TransactionFilters) => {
    setDraft(next);
    onPreview?.(next);
  };
  const results = count(draft);
  const invalidDates = draft.period === "datas" && (!draft.from || !draft.to);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filtros"
      desktop="panel"
      footer={
        <>
          <Button size="lg" block disabled={invalidDates} onClick={() => onApply(draft)} className="lg:w-auto lg:flex-1">
            {results === null ? "Aplicar filtros" : results === 1 ? "Mostrar 1 resultado" : `Mostrar ${results} resultados`}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            block
            className="lg:w-auto"
            onClick={() => update(EMPTY_FILTERS)}
          >
            Limpar
          </Button>
        </>
      }
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">Período</legend>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((period) => (
            <Chip key={period.value} selected={draft.period === period.value} onClick={() => update({ ...draft, period: period.value })}>
              {period.label}
            </Chip>
          ))}
        </div>
        {draft.period === "datas" && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Field label="De">
              <TextInput type="date" value={draft.from ?? ""} onChange={(e) => update({ ...draft, from: e.target.value })} />
            </Field>
            <Field label="Até">
              <TextInput type="date" value={draft.to ?? ""} onChange={(e) => update({ ...draft, to: e.target.value })} />
            </Field>
          </div>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">Pago com</legend>
        <div className="flex flex-wrap gap-2">
          <Chip selected={draft.payments.includes("avista")} onClick={() => update({ ...draft, payments: toggle(draft.payments, "avista") })}>
            À vista
          </Chip>
          {cards.map((card) => (
            <Chip key={card.id} selected={draft.payments.includes(card.id)} onClick={() => update({ ...draft, payments: toggle(draft.payments, card.id) })}>
              {card.name}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">Categoria</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Chip
              key={category.id}
              selected={draft.categories.includes(category.id)}
              onClick={() => update({ ...draft, categories: toggle(draft.categories, category.id) })}
            >
              {category.name}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Valor</legend>
        <div className="flex items-center gap-3">
          <MoneyInput
            aria-label="Valor mínimo"
            placeholder="Mínimo"
            value={draft.min ?? null}
            onValueChange={(min) => update({ ...draft, min })}
          />
          <span className="text-sm text-muted">até</span>
          <MoneyInput
            aria-label="Valor máximo"
            placeholder="Máximo"
            value={draft.max ?? null}
            onValueChange={(max) => update({ ...draft, max })}
          />
        </div>
      </fieldset>
    </Sheet>
  );
}
