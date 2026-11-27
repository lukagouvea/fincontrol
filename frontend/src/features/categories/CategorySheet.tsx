import { useEffect, useId, useState, type FormEvent } from "react";
import { useAddCategory, useCategories, useUpdateCategory } from "../../hooks/useCategories";
import type { Category } from "../../types/FinanceTypes";
import { cx } from "../../lib/cx";
import { Sheet } from "../../ui/Sheet";
import { Button } from "../../ui/Button";
import { Field, SelectInput, TextInput } from "../../ui/Field";
import { Segmented } from "../../ui/Segmented";
import { useToast } from "../../ui/Toast";
import { CATEGORY_ICONS, categoryColorVar, guessIconKey } from "../categories";
import type { EntryType } from "../ledger";

export type CategorySheetState = { kind: "create"; type: EntryType } | { kind: "edit"; category: Category };

export type DeleteChoice = { mode: "merge"; targetId: string } | { mode: "archive" };

const ICON_CHOICES = [
  "utensils", "shopping-cart", "house", "car", "play", "heart",
  "dumbbell", "repeat", "graduation-cap", "book", "plane", "shirt",
  "shopping-bag", "paw-print", "gift", "coffee", "music", "wrench",
  "wifi", "zap", "sparkles", "briefcase", "piggy-bank", "receipt",
];

/** Nova/Editar categoria (NovaCategoria.html): nome e ícone. */
export function CategorySheet({
  state,
  onClose,
  onDelete,
  monthCount,
}: {
  state: CategorySheetState | null;
  onClose: () => void;
  onDelete: (category: Category, choice: DeleteChoice) => void;
  /** Lançamentos da categoria no mês, para o texto de apagar. */
  monthCount?: (id: string) => number;
}) {
  const formId = useId();
  const add = useAddCategory();
  const update = useUpdateCategory();
  const showToast = useToast();
  const editing = state?.kind === "edit" ? state.category : null;
  const [type, setType] = useState<EntryType>("expense");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("tag");
  const [iconTouched, setIconTouched] = useState(false);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!state) return;
    const category = state.kind === "edit" ? state.category : null;
    setType(category?.type ?? (state.kind === "create" ? state.type : "expense"));
    setName(category?.name ?? "");
    setIcon(category?.icon && CATEGORY_ICONS[category.icon] ? category.icon : guessIconKey(category?.name));
    setIconTouched(!!category?.icon);
    setError("");
    setSubmitError("");
    setDeleting(false);
  }, [state]);

  // Enquanto o usuário não escolhe, o ícone acompanha o nome digitado.
  useEffect(() => {
    if (!iconTouched) setIcon(guessIconKey(name));
  }, [name, iconTouched]);

  const busy = add.isPending || update.isPending;
  const color = categoryColorVar(editing ?? { id: name || "nova" });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!name.trim()) {
      setError("Dê um nome à categoria.");
      return;
    }
    setError("");
    setSubmitError("");
    try {
      if (editing) await update.mutateAsync({ id: editing.id, data: { name: name.trim(), icon } });
      else await add.mutateAsync({ name: name.trim(), type, icon } as never);
      showToast({ message: editing ? "Categoria atualizada" : "Categoria criada" });
      onClose();
    } catch (cause) {
      const status = (cause as { response?: { status?: number } }).response?.status;
      if (status === 409) setError("Já existe uma categoria com esse nome.");
      else setSubmitError("Não foi possível salvar. O que você preencheu foi mantido.");
    }
  };

  return (
    <>
      <Sheet
        open={!!state && !deleting}
        onClose={onClose}
        dismissible={!busy}
        title={editing ? "Editar categoria" : "Nova categoria"}
        footer={
          <>
            <Button type="submit" form={formId} size="lg" block loading={busy} className="lg:w-auto">
              {editing ? "Salvar" : "Criar categoria"}
            </Button>
            {editing && (
              <Button variant="link" className="self-center !text-expense lg:mr-auto" disabled={busy} onClick={() => setDeleting(true)}>
                Apagar categoria
              </Button>
            )}
          </>
        }
      >
        <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
          {!editing && (
            <Segmented
              label="Tipo"
              value={type}
              onChange={setType}
              options={[
                { value: "expense", label: "Despesa" },
                { value: "income", label: "Receita" },
              ]}
            />
          )}
          <Field label="Nome" error={error}>
            <TextInput value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoComplete="off" placeholder="Ex.: Pets" />
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Ícone</legend>
            <div role="radiogroup" aria-label="Ícone" className="grid grid-cols-6 gap-2">
              {ICON_CHOICES.map((key) => {
                const { icon: Icon, label } = CATEGORY_ICONS[key];
                const checked = icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    aria-label={label}
                    title={label}
                    onClick={() => {
                      setIcon(key);
                      setIconTouched(true);
                    }}
                    className={cx(
                      "flex aspect-square min-h-tap items-center justify-center rounded-tile border-2",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                      checked ? "border-primary" : "border-border bg-surface hover:bg-surface-2",
                    )}
                    style={checked ? { background: `color-mix(in srgb, ${color} 16%, var(--surface))`, color: `color-mix(in srgb, ${color} 75%, var(--ink))` } : undefined}
                  >
                    <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </fieldset>
          {submitError && (
            <p role="alert" className="rounded-field bg-expense-tint px-4 py-3 text-sm text-expense">
              {submitError}
            </p>
          )}
        </form>
      </Sheet>
      {editing && (
        <DeleteCategorySheet
          open={deleting}
          category={editing}
          count={monthCount?.(editing.id) ?? 0}
          onClose={() => setDeleting(false)}
          onConfirm={(choice) => {
            setDeleting(false);
            onDelete(editing, choice);
          }}
        />
      )}
    </>
  );
}

/** Apagar categoria: mesclar em outra (recomendado) ou só arquivar. */
function DeleteCategorySheet({
  open,
  category,
  count,
  onClose,
  onConfirm,
}: {
  open: boolean;
  category: Category;
  count: number;
  onClose: () => void;
  onConfirm: (choice: DeleteChoice) => void;
}) {
  const categories = useCategories();
  const targets = (categories.data ?? [])
    .filter((item) => item.type === category.type && item.active !== false && item.id !== category.id)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const fallback = targets.find((item) => /^outr[oa]s?$/i.test(item.name.trim())) ?? targets[0];
  const [mode, setMode] = useState<"merge" | "archive">("merge");
  const [targetId, setTargetId] = useState("");

  useEffect(() => {
    if (!open) return;
    setMode(fallback ? "merge" : "archive");
    setTargetId(fallback?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category.id]);

  const target = targets.find((item) => item.id === targetId);
  const option = (selected: boolean) =>
    cx(
      "flex flex-col gap-2 rounded-card border-2 p-4 text-left",
      selected ? "border-primary bg-primary-tint" : "border-border bg-surface",
    );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Apagar “${category.name}”?`}
      description={
        count > 0
          ? `${category.name} tem ${count} ${count === 1 ? "lançamento" : "lançamentos"} neste mês. Escolha o que fazer com eles.`
          : "Escolha o que fazer com os lançamentos desta categoria."
      }
      footer={
        <>
          <Button
            size="lg"
            block
            className="lg:w-auto"
            disabled={mode === "merge" && !target}
            onClick={() => onConfirm(mode === "merge" && target ? { mode: "merge", targetId: target.id } : { mode: "archive" })}
          >
            {mode === "merge" ? `Mesclar em ${target?.name ?? "…"}` : "Arquivar"}
          </Button>
          <Button variant="secondary" size="lg" block className="lg:w-auto" onClick={onClose}>
            Cancelar
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label="O que fazer com os lançamentos" className="flex flex-col gap-3">
        {targets.length > 0 && (
          <div className={option(mode === "merge")}>
            <label className="flex cursor-pointer items-center gap-3">
              <input type="radio" name="delete-mode" checked={mode === "merge"} onChange={() => setMode("merge")} className="size-5 accent-[var(--primary)]" />
              <span className="flex-1 text-[15px] font-semibold">Mesclar em outra categoria</span>
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-on-primary">Recomendado</span>
            </label>
            <div className="flex items-center justify-between gap-3 pl-8">
              <span className="text-sm text-ink-2">Mover os lançamentos para</span>
              <SelectInput
                aria-label="Categoria de destino"
                value={targetId}
                onChange={(event) => {
                  setTargetId(event.target.value);
                  setMode("merge");
                }}
                className="!h-11 !w-44 rounded-full"
              >
                {targets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <p className="pl-8 text-[13px] text-muted">
              Os valores continuam nos relatórios, dentro de {target?.name ?? "outra categoria"}. As recorrências que usam {category.name} também mudam.
            </p>
          </div>
        )}
        <label className={cx(option(mode === "archive"), "cursor-pointer")}>
          <span className="flex items-center gap-3">
            <input type="radio" name="delete-mode" checked={mode === "archive"} onChange={() => setMode("archive")} className="size-5 accent-[var(--primary)]" />
            <span className="text-[15px] font-semibold">Arquivar</span>
          </span>
          <span className="pl-8 text-[13px] text-muted">
            Some das telas de lançamento. O histórico e os relatórios continuam com o nome {category.name}.
          </span>
        </label>
      </div>
      <p className="text-[13px] text-muted">Você pode desfazer por alguns segundos.</p>
    </Sheet>
  );
}
