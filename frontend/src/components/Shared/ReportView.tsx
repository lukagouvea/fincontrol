import { useMemo, useState, useEffect, useId, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import CurrencyInput from "react-currency-input-field";
import {
  useTransactions,
  usePrefetchAdjacentMonths,
} from "../../hooks/useTransactions";
import {
  useFixedIncomes,
  useFixedExpenses,
} from "../../hooks/useFixedTransactions";
import { useCategories } from "../../hooks/useCategories";
import { useMonthlyVariations } from "../../hooks/useMonthlyVariations";
import { useMonthlyInvestment } from "../../hooks/useInvestmentSettings";
import { buildMonthlyReport } from "../../utils/reportData";
import { formatUTCToDDMMAAAA } from "../../utils/dateUtils";
import type {
  Category,
  Transaction,
  VariableExpense,
} from "../../types/FinanceTypes";
import { CategoryPieChart } from "../Dashboard/CategoryPieChart";
import { ExpensesValueHistogram } from "../Dashboard/ExpensesValueHistogram";
import { MonthlyManagementCard } from "../Dashboard/MonthlyManagementCard";
import { SortableDashboardItem } from "../Dashboard/SortableDashboardItem";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import {
  Button,
  CategoryLabel,
  EmptyState,
  ErrorState,
  LoadingState,
  Money,
  MonthPicker,
  Panel,
  formatMoney,
} from "./UI";

type ReportRow = Transaction & { actualAmount?: number; day?: number };
type CategoryTotal = {
  category: Category;
  total: number;
  count: number;
  fixedCount: number;
  variableCount: number;
};

function CategoryBreakdown({ groups }: { groups: CategoryTotal[] }) {
  if (!groups.length)
    return <EmptyState title="Sem movimentações por categoria" />;
  const total = groups.reduce((sum, g) => sum + g.total, 0);
  return (
    <div className="category-breakdown">
      {groups.map((group) => (
        <div key={group.category.id}>
          <div className="category-breakdown-heading">
            <CategoryLabel
              name={group.category.name}
              color={group.category.color}
            />
            <strong>{formatMoney(group.total)}</strong>
          </div>
          <div
            className="category-bar"
            role="img"
            aria-label={
              group.category.name +
              ": " +
              Math.round((group.total / total) * 100) +
              "% do total"
            }
          >
            <span
              style={{
                width: (group.total / total) * 100 + "%",
                backgroundColor: group.category.color,
              }}
            />
          </div>
          <p>
            {group.count} lançamentos · {group.fixedCount} fixos ·{" "}
            {group.variableCount} variáveis
          </p>
        </div>
      ))}
    </div>
  );
}
function ReportTable({
  rows,
  categories,
  type,
}: {
  rows: ReportRow[];
  categories: Category[];
  type: "income" | "expense";
}) {
  return rows.length ? (
    <div className="table-panel">
      <table className="data-table report-table">
        <caption className="sr-only">
          {type === "income" ? "Receitas do período" : "Despesas do período"}
        </caption>
        <thead>
          <tr>
            {["Descrição", "Data", "Categoria", "Tipo", "Valor"].map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const category = categories.find((c) => c.id === row.categoryId);
            const installment = (row as VariableExpense).installmentInfo;
            return (
              <tr key={row.id}>
                <td className="row-title">
                  {row.description}
                  {installment && (
                    <p className="small subtle">
                      Parcela {installment.current} de {installment.total}
                    </p>
                  )}
                </td>
                <td data-label="Data">{formatUTCToDDMMAAAA(row.date)}</td>
                <td>
                  <CategoryLabel
                    name={category?.name}
                    color={category?.color}
                  />
                </td>
                <td data-label="Tipo">{row.day ? "Fixa" : "Variável"}</td>
                <td data-label="Valor">
                  <Money value={row.actualAmount ?? row.amount} type={type} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : (
    <EmptyState
      title="Nenhum lançamento neste período"
      description="Escolha outro mês para consultar seu histórico."
    />
  );
}
export function ReportView({ detail }: { detail?: "income" | "expense" }) {
  const [params, setParams] = useSearchParams();
  const rawMonth = Number(params.get("mes")),
    rawYear = Number(params.get("ano")),
    now = new Date();
  const month =
    Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12
      ? rawMonth - 1
      : now.getMonth();
  const year =
    Number.isInteger(rawYear) && rawYear >= 1900 && rawYear <= 2200
      ? rawYear
      : now.getFullYear();
  const date = useMemo(() => new Date(year, month, 1), [month, year]);
  const transactions = useTransactions(month, year),
    fixedIncomes = useFixedIncomes(),
    fixedExpenses = useFixedExpenses();
  const categories = useCategories(),
    variations = useMonthlyVariations();
  const investment = useMonthlyInvestment(month, year);
  usePrefetchAdjacentMonths(month, year);
  const report = useMemo(
    () =>
      buildMonthlyReport(
        date,
        transactions.data || [],
        fixedIncomes.data || [],
        fixedExpenses.data || [],
        categories.data || [],
        variations.data || [],
      ),
    [
      date,
      transactions.data,
      fixedIncomes.data,
      fixedExpenses.data,
      categories.data,
      variations.data,
    ],
  );
  const queries = [
    transactions,
    fixedIncomes,
    fixedExpenses,
    categories,
    variations,
  ];
  const error = queries.some((q) => q.isError);
  const loading =
    queries.some((q) => q.isLoading) || transactions.isPlaceholderData;
  const [chartOrder, setChartOrder] = useState(["category", "distribution"]);
  const [organizing, setOrganizing] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const drag = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id)
      setChartOrder((items) =>
        arrayMove(
          items,
          items.indexOf(String(active.id)),
          items.indexOf(String(over.id)),
        ),
      );
  };
  const [amount, setAmount] = useState<string>();
  const [numeric, setNumeric] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [investmentError, setInvestmentError] = useState("");
  const [saving, setSaving] = useState(false);
  const draftPeriod = useRef("");
  const dirty = useRef(false);
  const id = useId();
  useEffect(() => {
    const period = String(year) + "-" + String(month);
    if (draftPeriod.current !== period) {
      draftPeriod.current = period;
      dirty.current = false;
      setAmount(undefined);
      setNumeric(null);
      setMessage("");
      setInvestmentError("");
    }
    if (!dirty.current && investment.data && !investment.isPlaceholderData) {
      const value = investment.data.overrideMonthlyAmount;
      setAmount(value === null ? undefined : String(value));
      setNumeric(value);
    }
  }, [month, year, investment.data, investment.isPlaceholderData]);
  const override =
    investment.data?.overrideMonthlyAmount !== null &&
    investment.data?.overrideMonthlyAmount !== undefined;
  const saveInvestment = async (clear: boolean) => {
    if (saving || (!clear && numeric === null)) return;
    setSaving(true);
    setMessage("");
    setInvestmentError("");
    try {
      if (clear) {
        await investment.removeMonthlyInvestment();
        dirty.current = false;
        setAmount(undefined);
        setNumeric(null);
      } else await investment.saveMonthlyInvestment(numeric!);
      setMessage(
        clear
          ? "O mês voltou a usar o investimento padrão."
          : "Investimento deste mês salvo.",
      );
    } catch {
      setInvestmentError(
        "Não foi possível salvar. Seu preenchimento foi mantido.",
      );
    } finally {
      setSaving(false);
    }
  };
  const totalIncome = report.totals.income,
    totalExpense = report.totals.expense;
  const rows =
    detail === "income"
      ? report.monthlyIncomeData.sorted
      : report.monthlyExpenseData.sorted;
  return (
    <div className="page-stack">
      <div className="list-toolbar">
        <p className="subtle small">Consulta por período</p>
        <MonthPicker
          month={month}
          year={year}
          onChange={(m, y) => {
            const next = new URLSearchParams(params);
            next.set("mes", String(m + 1));
            next.set("ano", String(y));
            setParams(next);
          }}
        />
      </div>
      {error ? (
        <ErrorState
          retry={() => {
            queries.forEach((q) => void q.refetch());
          }}
        />
      ) : loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="report-metrics">
            {(!detail || detail === "income") && (
              <section className="report-metric" aria-label="Receitas do mês">
                <h2>Receitas do mês</h2>
                <strong>{formatMoney(totalIncome)}</strong>
                <p>Fixas e variáveis</p>
              </section>
            )}
            {(!detail || detail === "expense") && (
              <section className="report-metric" aria-label="Despesas do mês">
                <h2>Despesas do mês</h2>
                <strong>{formatMoney(totalExpense)}</strong>
                <p>Fixas, variáveis e parcelas</p>
              </section>
            )}
            {!detail && (
              <section
                className="report-metric report-metric-featured"
                aria-label="Saldo líquido"
              >
                <h2>Saldo líquido</h2>
                <strong className={report.totals.balance < 0 ? "negative" : ""}>
                  {formatMoney(report.totals.balance)}
                </strong>
                <p>Receitas menos despesas</p>
              </section>
            )}
          </div>
          {!detail && (
            <Panel title="Planejamento do mês" className="report-planning">
              {investment.isError ? (
                <ErrorState
                  message="Não foi possível carregar o investimento deste mês."
                  retry={() => void investment.refetch()}
                />
              ) : investment.isLoading || investment.isPlaceholderData ? (
                <LoadingState />
              ) : (
                <>
                  <p className="small subtle mb-4">
                    Orçamento para despesas variáveis, antes dos gastos do dia a
                    dia.
                  </p>
                  <MonthlyManagementCard
                    date={date}
                    monthlyIncome={totalIncome}
                    fixedExpenses={fixedExpenses.data || []}
                    monthlyVariations={variations.data || []}
                    transactions={transactions.data || []}
                    investmentMonthlyAmount={
                      investment.data?.effectiveMonthlyAmount ?? 0
                    }
                    compact
                  />
                  <div className="report-investment">
                    <div>
                      <h3>Investimento deste mês</h3>
                      <p>
                        {override
                          ? "Valor específico: " +
                            formatMoney(
                              investment.data?.overrideMonthlyAmount ?? 0,
                            )
                          : "Usando o padrão: " +
                            formatMoney(
                              investment.data?.defaultMonthlyAmount ?? 0,
                            )}
                      </p>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void saveInvestment(false);
                      }}
                      className="investment-controls"
                    >
                      <label className="sr-only" htmlFor={id}>
                        Investimento deste mês
                      </label>
                      <CurrencyInput
                        id={id}
                        value={amount}
                        placeholder={formatMoney(
                          investment.data?.overrideMonthlyAmount ??
                            investment.data?.defaultMonthlyAmount ??
                            0,
                        )}
                        prefix="R$ "
                        intlConfig={{ locale: "pt-BR", currency: "BRL" }}
                        decimalsLimit={2}
                        inputMode="decimal"
                        allowNegativeValue={false}
                        onValueChange={(value, _name, values) => {
                          dirty.current = true;
                          setAmount(value);
                          setNumeric(values?.float ?? null);
                          setMessage("");
                        }}
                      />
                      <Button
                        type="submit"
                        disabled={saving || numeric === null}
                      >
                        {saving ? "Salvando…" : "Salvar"}
                      </Button>
                      {override && (
                        <Button
                          variant="secondary"
                          disabled={saving}
                          onClick={() => void saveInvestment(true)}
                        >
                          Voltar ao padrão
                        </Button>
                      )}
                    </form>
                  </div>
                  {message && (
                    <p role="status" className="notice notice-success">
                      {message}
                    </p>
                  )}
                  {investmentError && <ErrorState message={investmentError} />}
                </>
              )}
            </Panel>
          )}
          {detail === "income" ? (
            <>
              <Panel title="Receitas por categoria">
                <CategoryBreakdown groups={report.incomesByCategory} />
              </Panel>
              <ReportTable
                rows={rows}
                categories={categories.data || []}
                type="income"
              />
            </>
          ) : (
            <>
              <div className="section-toolbar">
                <h2>
                  {detail
                    ? "Análise de despesas"
                    : "Para onde foi seu dinheiro"}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => setOrganizing((v) => !v)}
                >
                  {organizing ? "Concluir organização" : "Organizar gráficos"}
                </Button>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={drag}
              >
                <SortableContext
                  items={chartOrder}
                  strategy={rectSortingStrategy}
                >
                  <div className="report-charts">
                    {chartOrder.map((key, index) => (
                      <SortableDashboardItem
                        key={key}
                        id={key}
                        title={
                          key === "category"
                            ? "Gastos por categoria"
                            : "Distribuição dos gastos"
                        }
                        span={1}
                        organizing={organizing}
                        first={index === 0}
                        last={index === chartOrder.length - 1}
                        onMove={(direction) =>
                          setChartOrder((items) =>
                            arrayMove(items, index, index + direction),
                          )
                        }
                      >
                        {key === "category" ? (
                          <CategoryPieChart
                            transactions={
                              report.monthlyExpenseData.allForCharts
                            }
                            categories={categories.data || []}
                            date={date}
                            monthlyVariations={variations.data || []}
                          />
                        ) : (
                          <ExpensesValueHistogram
                            transactions={
                              report.monthlyExpenseData.allForCharts
                            }
                            date={date}
                            monthlyVariations={variations.data || []}
                          />
                        )}
                      </SortableDashboardItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <Panel title="Despesas por categoria">
                <CategoryBreakdown groups={report.expensesByCategory} />
              </Panel>
              {detail === "expense" ? (
                <ReportTable
                  rows={rows}
                  categories={categories.data || []}
                  type="expense"
                />
              ) : (
                <Panel title="Receitas por categoria">
                  <CategoryBreakdown groups={report.incomesByCategory} />
                </Panel>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
