import { useId, useState } from "react";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import {
  useCategories,
  useAddCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "../hooks/useCategories";
import type { Category } from "../types/FinanceTypes";
import { Dialog } from "../components/Shared/Dialog";
import { ConfirmationModal } from "../components/Shared/ConfirmationModal";
import { Tabs } from "../components/Shared/Tabs";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageTitle,
} from "../components/Shared/UI";

const colors = [
  ["#F44336", "Vermelho"],
  ["#E91E63", "Rosa"],
  ["#9C27B0", "Púrpura"],
  ["#673AB7", "Violeta"],
  ["#3F51B5", "Índigo"],
  ["#2196F3", "Azul"],
  ["#03A9F4", "Azul claro"],
  ["#00BCD4", "Ciano"],
  ["#009688", "Verde petróleo"],
  ["#4CAF50", "Verde"],
  ["#8BC34A", "Verde claro"],
  ["#CDDC39", "Lima"],
  ["#FFEB3B", "Amarelo"],
  ["#FFC107", "Âmbar"],
  ["#FF9800", "Laranja"],
  ["#FF5722", "Terracota"],
  ["#795548", "Marrom"],
  ["#607D8B", "Ardósia"],
];
export function Categories() {
  const query = useCategories();
  const create = useAddCategory(),
    update = useUpdateCategory(),
    remove = useDeleteCategory();
  const [tab, setTab] = useState<"expense" | "income">("expense");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [name, setName] = useState(""),
    [description, setDescription] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [color, setColor] = useState("#009688");
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const id = useId();
  const busy = create.isPending || update.isPending;
  const items = (query.data || []).filter(
    (c) => c.type === tab && c.active !== false,
  );
  const openForm = (item?: Category) => {
    setEditing(item || null);
    setName(item?.name || "");
    setDescription(item?.description || "");
    setType(item?.type || tab);
    setColor(item?.color || "#009688");
    setError("");
    setNameError("");
    setOpen(true);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!name.trim()) {
      setNameError("Informe o nome da categoria.");
      document.getElementById(id + "-name")?.focus();
      return;
    }
    setNameError("");
    setError("");
    try {
      if (editing)
        await update.mutateAsync({
          id: editing.id,
          data: { name: name.trim(), description: description.trim(), color },
        });
      else
        await create.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          color,
          type,
          active: true,
        });
      setOpen(false);
    } catch {
      setError(
        "Não foi possível salvar a categoria. Seu preenchimento foi mantido.",
      );
    }
  };
  const count = (kind: string) =>
    (query.data || []).filter((c) => c.type === kind && c.active !== false)
      .length;
  return (
    <div id="category-container" className="page-stack">
      <PageTitle
        title="Categorias"
        actions={
          <Button onClick={() => openForm()}>
            <Plus />
            Nova categoria
          </Button>
        }
      />
      <Tabs
        label="Tipos de categoria"
        value={tab}
        onChange={(value) => setTab(value as "expense" | "income")}
        panelId="category-list"
        items={[
          { value: "expense", label: "Despesas (" + count("expense") + ")" },
          { value: "income", label: "Receitas (" + count("income") + ")" },
        ]}
      />
      <div
        role="tabpanel"
        id="category-list"
        aria-labelledby={"category-list-tab-" + tab}
      >
        {query.isError ? (
          <ErrorState retry={() => void query.refetch()} />
        ) : query.isLoading ? (
          <LoadingState />
        ) : items.length ? (
          <ul className="category-list">
            {items.map((item) => (
              <li key={item.id}>
                <span
                  className="category-swatch"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                <div className="category-copy">
                  <h2>{item.name}</h2>
                  {item.description && <p>{item.description}</p>}
                </div>
                <div className="inline-actions">
                  <button
                    className="icon-button"
                    aria-label={"Editar " + item.name}
                    onClick={() => openForm(item)}
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={"Excluir " + item.name}
                    onClick={() => setDeleting(item)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Nenhuma categoria cadastrada"
            description="Adicione uma categoria para classificar seus lançamentos."
            action={
              <Button variant="secondary" onClick={() => openForm()}>
                Adicionar categoria
              </Button>
            }
          />
        )}
      </div>
      <Dialog
        dismissible={!busy}
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Editar categoria" : "Nova categoria"}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" form={id} disabled={busy}>
              {busy ? "Salvando…" : editing ? "Salvar" : "Criar"}
            </Button>
          </>
        }
      >
        <form id={id} onSubmit={submit} noValidate className="form-stack">
          {error && <ErrorState message={error} />}
          <div className="field">
            <label htmlFor={id + "-name"}>Nome</label>
            <input
              id={id + "-name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-invalid={!!nameError}
              aria-describedby={nameError ? id + "-error" : undefined}
            />
            {nameError && (
              <p className="field-error" id={id + "-error"}>
                {nameError}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor={id + "-description"}>Descrição (opcional)</label>
            <input
              id={id + "-description"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {!editing && (
            <fieldset className="field">
              <legend className="field-label">Tipo</legend>
              <div className="inline-actions">
                <label className="check-field">
                  <input
                    type="radio"
                    name={id + "-type"}
                    checked={type === "expense"}
                    onChange={() => setType("expense")}
                  />
                  Despesa
                </label>
                <label className="check-field">
                  <input
                    type="radio"
                    name={id + "-type"}
                    checked={type === "income"}
                    onChange={() => setType("income")}
                  />
                  Receita
                </label>
              </div>
            </fieldset>
          )}
          <fieldset className="field">
            <legend className="field-label">Cor da categoria</legend>
            <div className="color-picker">
              {colors.map(([value, label]) => (
                <button
                  key={value}
                  className="color-choice"
                  type="button"
                  aria-label={label}
                  aria-pressed={color === value}
                  onClick={() => setColor(value)}
                >
                  <span style={{ backgroundColor: value }} />
                  {color === value && <Check size={17} aria-hidden="true" />}
                </button>
              ))}
            </div>
            <p className="field-hint">
              Selecionada:{" "}
              {colors.find(([value]) => value === color)?.[1] || color}
            </p>
          </fieldset>
        </form>
      </Dialog>
      <ConfirmationModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        title="Excluir categoria?"
        message={
          "A categoria " +
          (deleting?.name || "") +
          " será excluída. Essa ação não pode ser desfeita."
        }
        confirmationMessage="Excluir"
        onConfirm={async () => {
          if (deleting) await remove.mutateAsync(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}
