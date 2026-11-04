import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import type { useDashboardFinance } from "../../hooks/useDashboardFinance";
import { Button, formatMoney } from "../Shared/UI";

type BudgetState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | {
      status: "ready";
      remaining: number;
      committed: number;
      investment: number;
      daily: number;
      weekly: number;
    };

export function MonthlyOverview({
  summary,
  budget,
}: {
  summary: ReturnType<typeof useDashboardFinance>["summary"];
  budget: BudgetState;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return (
    <section
      className="month-summary"
      id="budget-overview"
      aria-label="Resumo do mês"
    >
      <div className="month-summary-values">
        <div role="group" aria-labelledby={id + "-balance"}>
          <h2 id={id + "-balance"}>Saldo do mês</h2>
          <strong className={summary.balance < 0 ? "negative" : ""}>
            {formatMoney(summary.balance)}
          </strong>
          <p>Receitas − despesas</p>
        </div>
        <div role="group" aria-labelledby={id + "-budget"}>
          <h2 id={id + "-budget"}>Orçamento planejado</h2>
          {budget.status === "ready" ? (
            <>
              <strong className={budget.remaining < 0 ? "negative" : ""}>
                {formatMoney(budget.remaining)}
              </strong>
              <p>Para gastos variáveis</p>
            </>
          ) : budget.status === "loading" ? (
            <p role="status">Carregando…</p>
          ) : (
            <div role="alert" className="summary-error">
              <p>Indisponível</p>
              <span className="sr-only">
                Não foi possível carregar seu investimento.
              </span>
              <Button variant="ghost" onClick={budget.retry}>
                Tentar novamente
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="month-summary-totals">
        <div>
          <span>Receitas</span>
          <strong>{formatMoney(summary.monthlyIncome)}</strong>
        </div>
        <div>
          <span>Despesas</span>
          <strong>{formatMoney(summary.monthlyExpense)}</strong>
        </div>
      </div>
      <button
        className="summary-disclosure"
        type="button"
        aria-expanded={expanded}
        aria-controls={id + "-details"}
        onClick={() => setExpanded(!expanded)}
      >
        Composição e limites <ChevronDown size={16} aria-hidden="true" />
      </button>
      <div
        className="month-summary-details"
        id={id + "-details"}
        hidden={!expanded}
      >
        <dl className="summary-composition">
          <div>
            <dt>Receitas fixas</dt>
            <dd>{formatMoney(summary.monthlyFixedIncome)}</dd>
          </div>
          <div>
            <dt>Receitas variáveis</dt>
            <dd>{formatMoney(summary.monthlyVariableIncome)}</dd>
          </div>
          <div>
            <dt>Despesas comprometidas</dt>
            <dd>{formatMoney(summary.monthlyCommittedExpense)}</dd>
          </div>
          <div>
            <dt>Despesas do mês</dt>
            <dd>{formatMoney(summary.monthlyMonthExpense)}</dd>
          </div>
        </dl>
        {budget.status === "ready" && (
          <div>
            <p className="small subtle">
              Orçamento planejado: receitas menos compromissos, parcelas e
              investimento, antes dos gastos variáveis.
            </p>
            <dl className="summary-composition">
              <div>
                <dt>Compromissos e parcelas</dt>
                <dd>{formatMoney(budget.committed)}</dd>
              </div>
              <div>
                <dt>Investimento reservado</dt>
                <dd>{formatMoney(budget.investment)}</dd>
              </div>
              <div>
                <dt>Referência por dia</dt>
                <dd>{formatMoney(budget.daily)}</dd>
              </div>
              <div>
                <dt>Referência por semana</dt>
                <dd>{formatMoney(budget.weekly)}</dd>
              </div>
            </dl>
          </div>
        )}
        <Link className="text-link" to="/relatorio-mensal">
          Ver relatório do mês <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}
