import { useEffect, useId, useState, type FormEvent } from "react";
import { useAddCategory, useUpdateCategory } from "../../hooks/useCategories";
import type { Category } from "../../types/FinanceTypes";
import { Sheet } from "../../ui/Sheet";
import { Button } from "../../ui/Button";
import { Field, TextInput } from "../../ui/Field";
import { Segmented } from "../../ui/Segmented";
import { useToast } from "../../ui/Toast";
import { CategoryIcon } from "../../ui/CategoryIcon";
import type { EntryType } from "../ledger";

export type CategorySheetState = { kind: "create"; type: EntryType } | { kind: "edit"; category: Category };

/** Nova/Editar categoria. Ícone e limite mensal chegam nas fases 3b/3c. */
export function CategorySheet({
  state,
  onClose,
  onArchive,
}: {
  state: CategorySheetState | null;
  onClose: () => void;
  onArchive: (category: Category) => void;
}) {
  const formId = useId();
  const add = useAddCategory();
  const update = useUpdateCategory();
  const showToast = useToast();
  const editing = state?.kind === "edit" ? state.category : null;
  const [type, setType] = useState<EntryType>("expense");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!state) return;
    setType(state.kind === "edit" ? state.category.type : state.type);
    setName(state.kind === "edit" ? state.category.name : "");
    setError("");
    setSubmitError("");
  }, [state]);

  const busy = add.isPending || update.isPending;

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
      if (editing) await update.mutateAsync({ id: editing.id, data: { name: name.trim() } });
      else await add.mutateAsync({ name: name.trim(), type } as never);
      showToast({ message: editing ? "Categoria atualizada" : "Categoria criada" });
      onClose();
    } catch (cause) {
      const status = (cause as { response?: { status?: number } }).response?.status;
      if (status === 409) setError("Já existe uma categoria com esse nome.");
      else setSubmitError("Não foi possível salvar. O que você preencheu foi mantido.");
    }
  };

  return (
    <Sheet
      open={!!state}
      onClose={onClose}
      dismissible={!busy}
      title={editing ? "Editar categoria" : "Nova categoria"}
      footer={
        <>
          <Button type="submit" form={formId} size="lg" block loading={busy} className="lg:w-auto">
            {editing ? "Salvar" : "Criar categoria"}
          </Button>
          {editing && (
            <Button variant="link" className="self-center !text-expense lg:mr-auto" disabled={busy} onClick={() => onArchive(editing)}>
              Arquivar categoria
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
        <div className="flex items-end gap-3">
          <CategoryIcon category={{ id: editing?.id ?? name, name }} className="mb-1" />
          <Field label="Nome" error={error} className="flex-1">
            <TextInput value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoComplete="off" placeholder="Ex.: Pets" />
          </Field>
        </div>
        <p className="text-[13px] text-muted">O ícone é escolhido pelo nome. Em breve você poderá trocar o ícone e definir um limite mensal.</p>
        {submitError && (
          <p role="alert" className="rounded-field bg-expense-tint px-4 py-3 text-sm text-expense">
            {submitError}
          </p>
        )}
      </form>
    </Sheet>
  );
}
