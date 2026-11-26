import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Pencil, Repeat, Trash2 } from "lucide-react";
import type { Category } from "../../types/FinanceTypes";
import { formatLongDate, formatShortDate } from "../../lib/dates";
import { Button, buttonClass } from "../../ui/Button";
import { Money } from "../../ui/Money";
import { CategoryIcon } from "../../ui/CategoryIcon";
import { ConfirmSheet } from "../../ui/ConfirmSheet";
import { Badge } from "../../ui/Chip";
import type { LedgerEntry } from "../ledger";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-4 border-t border-border first:border-t-0">
      <dt className="text-[15px] text-muted">{label}</dt>
      <dd className="text-right text-[15px] font-semibold">{children}</dd>
    </div>
  );
}

/**
 * Detalhe de uma linha do livro. `layout="panel"` é o cartão lateral do
 * desktop; `layout="screen"` é a tela do mobile (Detalhe.html).
 */
export function TransactionDetail({
  entry,
  category,
  layout,
  onEdit,
  onDelete,
  onChangeMonthValue,
}: {
  entry: LedgerEntry;
  category?: Category;
  layout: "panel" | "screen";
  onEdit: () => void;
  onDelete: () => void;
  onChangeMonthValue: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const recurring = entry.source === "recurring";
  const installment = entry.installment;
  const rows = (
    <dl className="flex flex-col">
      <Row label="Categoria">{category?.name ?? "Sem categoria"}</Row>
      <Row label="Data">
        {formatLongDate(entry.date)}
        {entry.upcoming && (
          <Badge tone="neutral" className="ml-2">
            Previsto
          </Badge>
        )}
      </Row>
      {installment && (
        <Row label="Parcela">
          {installment.current} de {installment.total}
        </Row>
      )}
      <Row label="Repetição">
        {recurring ? `Todo dia ${entry.recurring!.day}` : installment ? "Compra parcelada" : "Não se repete"}
      </Row>
      {recurring && entry.recurring?.hasVariation && <Row label="Neste mês">Valor ajustado</Row>}
    </dl>
  );

  const actions = recurring ? (
    <>
      <Button variant={layout === "screen" ? "primary" : "secondary"} size={layout === "screen" ? "lg" : "md"} block={layout === "screen"} onClick={onChangeMonthValue}>
        Alterar valor deste mês
      </Button>
      <Link
        to={`/recorrentes?tipo=${entry.type === "income" ? "receita" : "despesa"}&editar=${entry.id}`}
        className={buttonClass({ variant: layout === "screen" ? "link" : "secondary", size: "md", className: layout === "screen" ? "self-center" : undefined })}
      >
        <Repeat size={16} aria-hidden="true" />
        Editar recorrência
      </Link>
    </>
  ) : (
    <>
      <Button
        variant={layout === "screen" ? "primary" : "secondary"}
        size={layout === "screen" ? "lg" : "md"}
        block={layout === "screen"}
        icon={layout === "panel" ? <Pencil size={16} aria-hidden="true" /> : undefined}
        onClick={onEdit}
      >
        {layout === "screen" ? "Editar transação" : "Editar"}
      </Button>
      <Button
        variant={layout === "screen" ? "link" : "secondary"}
        icon={layout === "panel" ? <Trash2 size={16} aria-hidden="true" /> : undefined}
        className={layout === "screen" ? "self-center !text-expense" : undefined}
        onClick={() => setConfirming(true)}
      >
        {layout === "screen" ? "Excluir transação" : "Excluir"}
      </Button>
    </>
  );

  const confirm = (
    <ConfirmSheet
      open={confirming}
      onClose={() => setConfirming(false)}
      title={installment ? "Excluir compra parcelada?" : "Excluir transação?"}
      description={
        installment ? (
          <>
            As {installment.total} parcelas de “{entry.description}” serão excluídas. Você pode desfazer logo em seguida.
          </>
        ) : (
          <>
            “{entry.description}”, de {formatShortDate(entry.date)}, sai da lista e dos totais. Você pode desfazer logo em
            seguida.
          </>
        )
      }
      confirmLabel={installment ? "Excluir parcelas" : "Excluir"}
      onConfirm={() => {
        setConfirming(false);
        onDelete();
      }}
    />
  );

  if (layout === "panel") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[17px] font-semibold">Detalhe</h2>
          <span className="text-[13px] text-muted">{formatShortDate(entry.date)} {entry.date.slice(0, 4)}</span>
        </div>
        <div>
          <p className="text-[15px] text-muted">{entry.description}</p>
          <Money value={entry.amount} kind={entry.type} size="lg" />
        </div>
        {rows}
        <div className="flex flex-wrap gap-2 pt-1">{actions}</div>
        {confirm}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <CategoryIcon category={category} size="lg" />
        <p className="text-[17px] font-semibold">{entry.description}</p>
        <Money value={entry.amount} kind={entry.type} size="hero" />
      </div>
      <div className="rounded-card border border-border bg-surface px-5 py-1">{rows}</div>
      <div className="flex flex-col gap-2">{actions}</div>
      {confirm}
    </div>
  );
}
