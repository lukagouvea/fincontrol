import { useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCards } from "../../hooks/useCards";
import { useBudgetLimits } from "../../hooks/useBudget";
import { useTransactionEditor } from "../../app/TransactionEditor";
import { cx } from "../../lib/cx";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";

/** Dias depois da configuração inicial em que o checklist ainda aparece. */
const SHOW_FOR_DAYS = 30;
const dismissKey = (userId: string) => `fincontrol:checklist-dismissed:${userId}`;

/**
 * "Comece por aqui" (DeskInicioVazio.html). Some quando tudo foi feito, depois
 * de 30 dias da configuração ou quando a pessoa dispensa.
 */
export function StartChecklist({ hasTransactions }: { hasTransactions: boolean }) {
  const { currentUser } = useAuth();
  const cards = useCards();
  const limits = useBudgetLimits();
  const editor = useTransactionEditor();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return !!currentUser && localStorage.getItem(dismissKey(currentUser.id)) === "1";
    } catch {
      return false;
    }
  });

  const completedAt = currentUser?.onboardingCompletedAt;
  if (!currentUser || !completedAt || dismissed || cards.isPending || limits.isPending) return null;
  if (Date.now() - new Date(completedAt).getTime() > SHOW_FOR_DAYS * 86_400_000) return null;

  const card = (cards.data ?? []).find((item) => !item.archived);
  const divided = (limits.data ?? []).some((limit) => limit.categoryId !== null && limit.amount);
  const items = [
    { done: true, title: "Conta criada", hint: "Você já está dentro" },
    { done: !!card, title: card ? "Cartão adicionado" : "Adicione um cartão", hint: card ? `${card.name} •••• ${card.last4}` : "Se usa cartão de crédito", to: "/cartoes" },
    { done: hasTransactions, title: "Lance sua primeira transação", hint: "Leva uns 5 segundos", action: () => editor.create() },
    { done: divided, title: "Divida o orçamento por categoria", hint: "Opcional, mas ajuda no limite semanal", to: "/orcamento" },
  ];
  const doneCount = items.filter((item) => item.done).length;
  if (doneCount === items.length) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(dismissKey(currentUser.id), "1");
    } catch {
      /* só conveniência */
    }
  };

  return (
    <Card aria-label="Comece por aqui">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Comece por aqui</h2>
        <span className="text-[13px] text-muted">
          {doneCount} de {items.length}
        </span>
      </div>
      <ul>
        {items.map((item) => {
          const content = (
            <>
              <span
                aria-hidden="true"
                className={cx(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                  item.done ? "border-primary bg-primary text-on-primary" : "border-border-strong",
                )}
              >
                {item.done && <Check size={16} strokeWidth={2.6} />}
              </span>
              <span className="min-w-0 text-left">
                <span className={cx("block text-[15px] font-semibold", item.done && "text-muted line-through")}>
                  {item.title}
                  <span className="sr-only">{item.done ? " (feito)" : " (a fazer)"}</span>
                </span>
                <span className="block text-[13px] text-muted">{item.hint}</span>
              </span>
            </>
          );
          const classes = "flex min-h-16 w-full items-center gap-3 border-t border-border first:border-t-0";
          if (item.done) return <li key={item.title} className={classes}>{content}</li>;
          return (
            <li key={item.title} className="border-t border-border first:border-t-0">
              {item.to ? (
                <Link to={item.to} className="flex min-h-16 items-center gap-3 rounded-tile hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
                  {content}
                </Link>
              ) : (
                <button type="button" onClick={item.action} className="flex min-h-16 w-full items-center gap-3 rounded-tile hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <Button variant="link" className="self-start !text-muted" onClick={dismiss}>
        Dispensar
      </Button>
    </Card>
  );
}
