import { useMemo, useRef, useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Download, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCards } from "../hooks/useCards";
import { useCategories } from "../hooks/useCategories";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useLedgerMonths } from "../features/useLedger";
import { decode, ImportError, MAX_FILE_BYTES, parseStatement, readFileBuffer, type RawItem } from "../features/import/parse";
import { buildReview, makeSuggester, type ReviewItem } from "../features/import/review";
import { importService } from "../services/importService";
import { dateKeyToIso, formatShortDate, fromMonthIndex, monthIndex } from "../lib/dates";
import { formatMoney, sumMoney } from "../lib/money";
import { cx } from "../lib/cx";
import { Button, ButtonLink } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { Badge } from "../ui/Chip";
import { Money } from "../ui/Money";
import { PageHeader } from "../ui/PageHeader";
import { SelectInput } from "../ui/Field";
import { LoadingCard } from "../ui/Skeleton";
import { useToast } from "../ui/Toast";

type Parsed = { fileName: string; items: RawItem[] };
type Done = { id: string; count: number; total: number; skipped: number };

/** Meses do arquivo mais 3 anteriores (histórico para sugerir categoria), até 12. */
function monthsFor(items: RawItem[]) {
  if (!items.length) return [];
  const indexes = items.map((item) => monthIndex(Number(item.date.slice(0, 4)), Number(item.date.slice(5, 7)) - 1));
  const end = Math.max(...indexes);
  const start = Math.max(Math.min(...indexes) - 3, end - 11);
  return Array.from({ length: end - start + 1 }, (_, i) => fromMonthIndex(end - i));
}

export function Import() {
  const desktop = useMediaQuery("(min-width: 1024px)");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const cardsQuery = useCards();
  const categoriesQuery = useCategories();
  const cards = (cardsQuery.data ?? []).filter((card) => !card.archived);
  const [cardId, setCardId] = useState<string | null | undefined>(undefined);
  const chosenCard = cardId === undefined ? cards[0]?.id ?? null : cardId;
  const card = cards.find((item) => item.id === chosenCard);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [error, setError] = useState("");
  const [edits, setEdits] = useState<Record<string, Partial<ReviewItem>>>({});
  const [saving, setSaving] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const months = useMemo(() => monthsFor(parsed?.items ?? []), [parsed]);
  const ledger = useLedgerMonths(months);
  const categories = categoriesQuery.data ?? [];

  const review = useMemo<ReviewItem[]>(() => {
    if (!parsed || ledger.isLoading || categoriesQuery.isPending) return [];
    const suggest = makeSuggester(ledger.entries, categories);
    return buildReview(parsed.items, { onCard: !!card, existing: ledger.entries, suggest });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed, ledger.isLoading, ledger.entries, categoriesQuery.data, card?.id]);

  const items = review.map((item) => ({ ...item, ...edits[item.id] }));
  const toImport = items.filter((item) => item.selected && item.categoryId);
  const counts = {
    novas: items.filter((item) => item.status === "nova").length,
    duplicadas: items.filter((item) => item.status === "duplicada").length,
    semCategoria: items.filter((item) => !item.categoryId && item.status !== "pagamento").length,
    pagamentos: items.filter((item) => item.status === "pagamento").length,
  };

  const readFile = async (file: File) => {
    setError("");
    setDone(null);
    setEdits({});
    if (file.size > MAX_FILE_BYTES) {
      setError("O arquivo passa de 5 MB. Exporte um período menor.");
      return;
    }
    try {
      const { items: raw } = parseStatement(decode(await readFileBuffer(file)));
      setParsed({ fileName: file.name, items: raw });
    } catch (cause) {
      setParsed(null);
      setError(cause instanceof ImportError ? cause.message : "Não consegui ler este arquivo. Use CSV ou OFX exportado pelo banco.");
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void readFile(file);
  };

  const edit = (id: string, change: Partial<ReviewItem>) => setEdits((current) => ({ ...current, [id]: { ...current[id], ...change } }));

  const submit = async () => {
    if (!parsed || !toImport.length) return;
    setSaving(true);
    try {
      const result = await importService.create({
        fileName: parsed.fileName,
        cardId: chosenCard,
        items: toImport.map((item) => ({
          date: dateKeyToIso(item.date),
          description: item.description,
          amount: item.amount,
          type: item.type,
          categoryId: item.categoryId!,
        })),
      });
      await queryClient.invalidateQueries();
      setDone({ ...result, skipped: counts.duplicadas });
      setParsed(null);
    } catch {
      showToast({ message: "Não foi possível importar. Nada foi lançado." });
    } finally {
      setSaving(false);
    }
  };

  const undo = async () => {
    if (!done) return;
    setUndoing(true);
    try {
      const result = await importService.undo(done.id);
      await queryClient.invalidateQueries();
      showToast({ message: `Importação desfeita: ${result.deleted} ${result.deleted === 1 ? "lançamento removido" : "lançamentos removidos"}` });
      setDone(null);
    } catch {
      showToast({ message: "Não foi possível desfazer a importação." });
    } finally {
      setUndoing(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col items-center justify-center gap-4 text-center">
        <span aria-hidden="true" className="flex size-20 items-center justify-center rounded-full bg-primary text-on-primary">
          <Check size={40} strokeWidth={2.4} />
        </span>
        <h1 className="font-num text-[26px] font-semibold leading-tight">
          {done.count} {done.count === 1 ? "lançamento importado" : "lançamentos importados"}
        </h1>
        <p className="text-[15px] text-muted">
          Somam {formatMoney(Math.abs(done.total))} {card ? `na fatura ${card.name}` : "à vista"}.
          {done.skipped === 1 && " O que já existia ficou de fora."}
          {done.skipped > 1 && ` Os ${done.skipped} que já existiam ficaram de fora.`} A categoria pode ser ajustada depois.
        </p>
        <div className="flex w-full flex-col gap-2 pt-6">
          <Button size="lg" block onClick={() => navigate("/transacoes")}>
            Ver transações
          </Button>
          <Button variant="secondary" size="lg" block loading={undoing} onClick={undo}>
            Desfazer importação
          </Button>
        </div>
      </div>
    );
  }

  const header = "py-3 text-left text-xs font-semibold uppercase tracking-[.04em] text-muted";

  return (
    <>
      <PageHeader back="/transacoes" title="Importar extrato" eyebrow={<span className="hidden lg:inline">Transações</span>} />
      <Card>
        <p className="text-[15px] text-muted">Traga lançamentos de um arquivo do banco em vez de digitar um por um.</p>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{cards.length ? "Para qual cartão?" : "Forma de pagamento"}</legend>
          <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-wrap">
            {[...cards.map((item) => ({ id: item.id as string | null, title: item.name, hint: `•••• ${item.last4}` })), { id: null, title: "À vista", hint: "Pix, débito" }].map((option) => (
              <button
                key={option.id ?? "avista"}
                type="button"
                aria-pressed={chosenCard === option.id}
                onClick={() => {
                  setCardId(option.id);
                  setEdits({});
                }}
                className={cx(
                  "flex min-h-[60px] flex-col justify-center rounded-2xl border-2 px-3 text-left lg:min-w-[130px]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                  chosenCard === option.id ? "border-primary bg-primary-tint" : "border-border bg-surface hover:bg-surface-2",
                )}
              >
                <span className="text-[15px] font-semibold">{option.title}</span>
                <span className="text-xs text-muted">{option.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cx(
            "flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed p-6 text-center focus-within:outline focus-within:outline-2 focus-within:outline-focus",
            dragging ? "border-primary bg-primary-tint" : "border-border-strong",
          )}
        >
          <Download size={26} aria-hidden="true" className="text-primary" />
          <span className="text-[17px] font-semibold text-primary">{parsed ? parsed.fileName : "Escolher arquivo"}</span>
          <span className="text-[13px] text-muted">{parsed ? `${parsed.items.length} lançamentos · trocar arquivo` : "CSV ou OFX · até 5 MB"}</span>
          <input
            ref={input}
            type="file"
            accept=".csv,.ofx,.txt,text/csv,application/x-ofx"
            className="sr-only"
            aria-label="Arquivo do extrato"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
              event.target.value = "";
            }}
          />
        </label>
        {error && (
          <p role="alert" className="rounded-field bg-expense-tint px-4 py-3 text-sm text-expense">
            {error}
          </p>
        )}
        <p className="flex items-start gap-2 text-[13px] text-muted">
          <ShieldCheck size={18} aria-hidden="true" className="shrink-0" />O arquivo é lido no seu aparelho. Nada é lançado sem você revisar antes, e lançamentos repetidos são avisados.
        </p>
      </Card>

      {parsed &&
        (ledger.isLoading || categoriesQuery.isPending ? (
          <LoadingCard label="Comparando com o que você já lançou…" rows={4} />
        ) : (
          <Card aria-label="Revisar lançamentos">
            <CardHeader
              title="Revisar lançamentos"
              action={
                <span className="flex flex-wrap justify-end gap-1.5">
                  <Badge tone="primary">{counts.novas} {counts.novas === 1 ? "nova" : "novas"}</Badge>
                  {counts.duplicadas > 0 && <Badge tone="neutral">{counts.duplicadas} já {counts.duplicadas === 1 ? "lançada" : "lançadas"}</Badge>}
                  {counts.semCategoria > 0 && <Badge tone="expense">{counts.semCategoria} sem categoria</Badge>}
                </span>
              }
            />
            <p className="text-[13px] text-muted">
              {card ? `Fatura ${card.name}` : "À vista"} · {parsed.items.length} lançamentos encontrados. Categorias sugeridas pelo que você já usa.
              {counts.pagamentos > 0 && ` ${counts.pagamentos} pagamento${counts.pagamentos > 1 ? "s" : ""} de fatura ignorado${counts.pagamentos > 1 ? "s" : ""}.`}
            </p>
            {desktop ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="w-10"><span className="sr-only">Importar</span></th>
                    <th scope="col" className={header}>Data</th>
                    <th scope="col" className={header}>Descrição</th>
                    <th scope="col" className={cx(header, "w-52")}>Categoria</th>
                    <th scope="col" className={header}>Situação</th>
                    <th scope="col" className={cx(header, "text-right")}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <ReviewRow key={item.id} item={item} categories={categories} onEdit={edit} layout="table" />
                  ))}
                </tbody>
              </table>
            ) : (
              <ul>
                {items.map((item) => (
                  <ReviewRow key={item.id} item={item} categories={categories} onEdit={edit} layout="list" />
                ))}
              </ul>
            )}
            <div className="flex flex-col gap-3 border-t border-border pt-4 lg:flex-row lg:items-center lg:justify-between">
              <span className="text-[13px] text-muted">
                Total a importar: {formatMoney(Math.abs(sumMoney(toImport.map((item) => (item.type === "expense" ? item.amount : -item.amount)))))}
              </span>
              <div className="flex flex-col gap-2 lg:flex-row-reverse">
                <Button size="lg" loading={saving} disabled={!toImport.length} onClick={submit}>
                  Importar {toImport.length} {toImport.length === 1 ? "lançamento" : "lançamentos"}
                </Button>
                <Button variant="link" onClick={() => input.current?.click()}>
                  Escolher outro arquivo
                </Button>
              </div>
            </div>
          </Card>
        ))}

      {!parsed && !cards.length && (
        <p className="text-center text-[13px] text-muted">
          Tem cartão de crédito? <ButtonLink to="/cartoes" variant="link">Cadastre o cartão</ButtonLink> para importar a fatura dele.
        </p>
      )}
    </>
  );
}

function ReviewRow({
  item,
  categories,
  onEdit,
  layout,
}: {
  item: ReviewItem;
  categories: Array<{ id: string; name: string; type: string; active?: boolean }>;
  onEdit: (id: string, change: Partial<ReviewItem>) => void;
  layout: "table" | "list";
}) {
  const options = categories.filter((category) => category.type === item.type && category.active !== false);
  const muted = item.status === "duplicada" || item.status === "pagamento";
  const statusBadge =
    item.status === "duplicada" ? (
      <Badge tone="neutral">Já lançada</Badge>
    ) : item.status === "pagamento" ? (
      <Badge tone="neutral">Pagamento da fatura</Badge>
    ) : !item.categoryId ? (
      <Badge tone="expense">Sem categoria</Badge>
    ) : item.type === "income" ? (
      <Badge tone="income">Crédito</Badge>
    ) : null;
  const checkbox = (
    <input
      type="checkbox"
      aria-label={`Importar ${item.description}`}
      checked={item.selected && !!item.categoryId}
      disabled={!item.categoryId}
      onChange={(event) => onEdit(item.id, { selected: event.target.checked })}
      className="size-5 accent-[var(--primary)]"
    />
  );
  const select = (
    <SelectInput
      aria-label={`Categoria de ${item.description}`}
      value={item.categoryId ?? ""}
      invalid={!item.categoryId && !muted}
      onChange={(event) => onEdit(item.id, { categoryId: event.target.value || null, selected: !!event.target.value })}
      className="!h-10 rounded-xl text-sm"
    >
      <option value="">Escolher categoria</option>
      {options.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </SelectInput>
  );
  const amount = <Money value={item.amount} kind={item.type} size="sm" className={muted ? "opacity-60" : undefined} />;

  if (layout === "table") {
    return (
      <tr className={cx("border-b border-border", muted && "text-muted")}>
        <td className="py-2 pl-1">{checkbox}</td>
        <td className="py-2 pr-3 text-[15px]">{formatShortDate(item.date)}</td>
        <td className="py-2 pr-3 text-[15px] font-semibold">{item.description}</td>
        <td className="py-2 pr-3">{item.status !== "pagamento" && select}</td>
        <td className="py-2 pr-3">{statusBadge}</td>
        <td className="py-2 text-right">{amount}</td>
      </tr>
    );
  }
  return (
    <li className={cx("flex items-start gap-3 border-t border-border py-3 first:border-t-0", muted && "opacity-70")}>
      <span className="pt-1">{checkbox}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold">{item.description}</span>
            <span className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
              {formatShortDate(item.date)}
              {statusBadge}
            </span>
          </span>
          {amount}
        </span>
        {item.status !== "pagamento" && select}
      </span>
    </li>
  );
}
