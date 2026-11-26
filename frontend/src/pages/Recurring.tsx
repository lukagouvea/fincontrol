import { useSearchParams } from "react-router-dom";
import { FixedExpenses } from "./Expenses/FixedExpenses";
import { FixedIncome } from "./Income/FixedIncome";
import { PageHeader } from "../ui/PageHeader";
import { Segmented } from "../ui/Segmented";

/** Recorrentes (provisório): reaproveita as listas de fixas até o restyle da Fase 2. */
export function Recurring() {
  const [params, setParams] = useSearchParams();
  const type = params.get("tipo") === "receita" ? "receita" : "despesa";
  return (
    <>
      <PageHeader title="Recorrentes" />
      <Segmented
        label="Tipo"
        className="max-w-xs"
        value={type}
        onChange={(value) => setParams({ tipo: value }, { replace: true })}
        options={[
          { value: "despesa", label: "Despesas" },
          { value: "receita", label: "Receitas" },
        ]}
      />
      <div key={type}>{type === "receita" ? <FixedIncome /> : <FixedExpenses />}</div>
    </>
  );
}
