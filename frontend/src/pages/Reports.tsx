import { useSearchParams } from "react-router-dom";
import { MonthlyReport } from "./History/MonthlyReport";
import { ExpenseHistory } from "./History/ExpenseHistory";
import { IncomeHistory } from "./History/IncomeHistory";
import { PageTitle } from "../components/Shared/UI";
import { Tabs } from "../components/Shared/Tabs";

export function Reports() {
  const [params, setParams] = useSearchParams();
  const tab =
    params.get("aba") === "despesas"
      ? "despesas"
      : params.get("aba") === "receitas"
        ? "receitas"
        : "resumo";
  return (
    <div className="page-stack">
      <PageTitle title="Relatórios" />
      <Tabs
        label="Relatórios"
        panelId="report-content"
        items={[
          { value: "resumo", label: "Resumo" },
          { value: "despesas", label: "Despesas" },
          { value: "receitas", label: "Receitas" },
        ]}
        value={tab}
        onChange={(value) => {
          const next = new URLSearchParams(params);
          next.set("aba", value);
          setParams(next);
        }}
      />
      <div
        className="reports-content"
        id="report-content"
        role="tabpanel"
        aria-labelledby={"report-content-tab-" + tab}
        key={tab}
      >
        {tab === "resumo" ? (
          <MonthlyReport />
        ) : tab === "despesas" ? (
          <ExpenseHistory />
        ) : (
          <IncomeHistory />
        )}
      </div>
    </div>
  );
}
