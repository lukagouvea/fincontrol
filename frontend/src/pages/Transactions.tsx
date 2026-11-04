import { useSearchParams } from "react-router-dom";
import { FixedIncome } from "./Income/FixedIncome";
import { VariableIncome } from "./Income/VariableIncome";
import { FixedExpenses } from "./Expenses/FixedExpenses";
import { VariableExpenses } from "./Expenses/VariableExpenses";
import { PageTitle } from "../components/Shared/UI";

export function Transactions() {
  const [params, setParams] = useSearchParams();
  const income = params.get("tipo") === "receita";
  const fixed = params.get("grupo") === "fixas";
  const select = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set("tipo", income ? "receita" : "despesa");
    next.set("grupo", fixed ? "fixas" : "variaveis");
    next.set(key, value);
    setParams(next);
  };
  return (
    <div className="page-stack">
      <PageTitle title="Lançamentos" />
      <div className="transaction-filters">
        <div role="group" className="segmented" aria-label="Tipo de lançamento">
          <button
            aria-pressed={!income}
            onClick={() => select("tipo", "despesa")}
          >
            Despesas
          </button>
          <button
            aria-pressed={income}
            onClick={() => select("tipo", "receita")}
          >
            Receitas
          </button>
        </div>
        <div
          role="group"
          className="segmented segmented-subtle"
          aria-label="Frequência"
        >
          <button
            aria-pressed={!fixed}
            onClick={() => select("grupo", "variaveis")}
          >
            Variáveis
          </button>
          <button aria-pressed={fixed} onClick={() => select("grupo", "fixas")}>
            Fixas
          </button>
        </div>
      </div>
      <div
        className="transactions-content"
        key={(income ? "income" : "expense") + fixed}
      >
        {income ? (
          fixed ? (
            <FixedIncome />
          ) : (
            <VariableIncome />
          )
        ) : fixed ? (
          <FixedExpenses />
        ) : (
          <VariableExpenses />
        )}
      </div>
    </div>
  );
}
