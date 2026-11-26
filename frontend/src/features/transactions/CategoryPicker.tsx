import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Plus, Search } from "lucide-react";
import { useAddCategory, useCategories } from "../../hooks/useCategories";
import { cx } from "../../lib/cx";
import { Sheet } from "../../ui/Sheet";
import { Button } from "../../ui/Button";
import { Field, TextInput, inputClass } from "../../ui/Field";
import { CategoryIcon } from "../../ui/CategoryIcon";
import type { EntryType } from "../ledger";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** "Escolher categoria" (MaisCategorias): busca, lista completa e criar nova. */
export function CategoryPicker({
  open,
  type,
  selectedId,
  onClose,
  onSelect,
}: {
  open: boolean;
  type: EntryType;
  selectedId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const categories = useCategories();
  const addCategory = useAddCategory();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCreating(false);
    setName("");
    setError("");
  }, [open]);

  const list = useMemo(() => {
    const term = normalize(query.trim());
    return (categories.data ?? [])
      .filter((category) => category.type === type && category.active !== false)
      .filter((category) => !term || normalize(category.name).includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [categories.data, type, query]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Dê um nome à categoria.");
      return;
    }
    setError("");
    try {
      const created = await addCategory.mutateAsync({ name: name.trim(), type } as never);
      onSelect(created.id);
    } catch (cause) {
      const status = (cause as { response?: { status?: number } }).response?.status;
      setError(status === 409 ? "Já existe uma categoria com esse nome." : "Não foi possível criar a categoria.");
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={creating ? "Nova categoria" : "Escolher categoria"}>
      {creating ? (
        <form onSubmit={create} className="flex flex-col gap-4" noValidate>
          <Field label="Nome" error={error} hint={type === "income" ? "Categoria de receita" : "Categoria de despesa"}>
            <TextInput value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={100} />
          </Field>
          <div className="flex flex-col gap-2 lg:flex-row-reverse">
            <Button type="submit" size="lg" loading={addCategory.isPending}>
              Criar e usar
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setCreating(false)}>
              Voltar
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="relative">
            <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              aria-label="Buscar categoria"
              placeholder="Buscar categoria"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={inputClass(false, "pl-11")}
            />
          </div>
          <ul className="flex flex-col" aria-label="Categorias">
            {list.map((category) => {
              const selected = category.id === selectedId;
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(category.id)}
                    className={cx(
                      "-mx-2 flex min-h-16 w-[calc(100%+16px)] items-center gap-3 rounded-tile px-2 text-left hover:bg-surface-2",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus",
                    )}
                  >
                    <CategoryIcon category={category} />
                    <span className="flex-1 text-[15px] font-semibold">{category.name}</span>
                    {selected && <Check size={20} className="text-primary" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
            {!list.length && <li className="py-6 text-center text-sm text-muted">Nenhuma categoria encontrada.</li>}
          </ul>
          <Button
            variant="secondary"
            size="lg"
            icon={<Plus size={18} aria-hidden="true" />}
            onClick={() => {
              setName(query.trim());
              setCreating(true);
            }}
          >
            Nova categoria
          </Button>
        </>
      )}
    </Sheet>
  );
}
