import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, Check } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useDashboardFinance } from "../hooks/useDashboardFinance";
import { useMonthlyInvestment } from "../hooks/useInvestmentSettings";
import {
  useTwelveMonthsTransactions,
  useAddTransaction,
  useAddCompraParcelada,
} from "../hooks/useTransactions";
import {
  getActualFixedItemAmount,
  isItemActiveInMonth,
} from "../utils/financeUtils";
import {
  restoreDashboardLayout,
  type DashboardWidget,
} from "../utils/dashboardLayout";
import {
  formatDateToYYYYMMDD,
  parseDateInputToLocal,
  convertDateToUTCISOString,
} from "../utils/dateUtils";
import { MonthlyOverview } from "../components/Dashboard/MonthlyOverview";
import { UpcomingBills } from "../components/Dashboard/UpcomingBills";
import { RecentTransactions } from "../components/Dashboard/RecentTransactions";
import { WeeklyFinancialCalendar } from "../components/Dashboard/WeeklyFinancialCalendar";
import { CategoryPieChart } from "../components/Dashboard/CategoryPieChart";
import { WeeklySpending } from "../components/Dashboard/WeeklySpending";
import { ExpensesValueHistogram } from "../components/Dashboard/ExpensesValueHistogram";
import { MonthlyHistogram } from "../components/Dashboard/MonthlyHistogram";
import { SortableDashboardItem } from "../components/Dashboard/SortableDashboardItem";
import {
  ExpenseModal,
  type ExpenseFormData,
} from "../components/Expenses/ExpenseModal";
import {
  Button,
  ErrorState,
  LoadingState,
  PageTitle,
} from "../components/Shared/UI";

export function Dashboard() {
  const finance = useDashboardFinance();
  const {
    transactions,
    transactionsWithoutInstallments,
    fixedExpenses,
    fixedIncomes,
    monthlyVariations,
    categories,
    selectedDateObject,
    summary,
  } = finance;
  const investment = useMonthlyInvestment(
    selectedDateObject.getMonth(),
    selectedDateObject.getFullYear(),
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const history = useTwelveMonthsTransactions(
    selectedDateObject.getMonth(),
    selectedDateObject.getFullYear(),
    detailsOpen,
  );
  const investmentAmount = investment.data?.effectiveMonthlyAmount ?? 0;
  const budget = useMemo(() => {
    const year = selectedDateObject.getFullYear(),
      month = selectedDateObject.getMonth();
    const fixed = fixedExpenses
      .filter((item) => isItemActiveInMonth(item, selectedDateObject))
      .reduce(
        (sum, item) =>
          sum +
          getActualFixedItemAmount(
            item.id,
            "expense",
            year,
            month,
            item.amount,
            monthlyVariations,
          ),
        0,
      );
    const installments = transactions
      .filter((t) => "installmentInfo" in t && !!t.installmentInfo)
      .filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    const committed = fixed + installments;
    const remaining = summary.monthlyIncome - committed - investmentAmount;
    const safe = Number.isFinite(remaining) ? remaining : 0;
    const days = new Date(year, month + 1, 0).getDate();
    return {
      committed,
      remaining: safe,
      daily: safe / days,
      weekly: safe / (days / 7),
    };
  }, [
    selectedDateObject,
    fixedExpenses,
    transactions,
    monthlyVariations,
    summary.monthlyIncome,
    investmentAmount,
  ]);
  const [widgets, setWidgets] = useState(() => {
    try {
      return restoreDashboardLayout(localStorage.getItem("dashboardLayout"));
    } catch {
      return restoreDashboardLayout(null);
    }
  });
  const [organizing, setOrganizing] = useState(false);
  const [expenseDate, setExpenseDate] = useState<string | null>(null);
  const create = useAddTransaction(),
    installments = useAddCompraParcelada();
  useEffect(() => {
    try {
      localStorage.setItem("dashboardLayout", JSON.stringify(widgets));
    } catch {
      /* Layout remains usable when storage is unavailable. */
    }
  }, [widgets]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const move = (id: string, direction: -1 | 1) =>
    setWidgets((items) => {
      const current = items.find((item) => item.id === id);
      if (!current) return items;
      const group = items.filter((item) => item.group === current.group);
      const target =
        group[group.findIndex((item) => item.id === id) + direction];
      return target
        ? arrayMove(
            items,
            items.findIndex((item) => item.id === id),
            items.findIndex((item) => item.id === target.id),
          )
        : items;
    });
  const drag = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setWidgets((items) => {
      const a = items.findIndex((i) => i.id === active.id),
        b = items.findIndex((i) => i.id === over.id);
      return a >= 0 && b >= 0 && items[a].group === items[b].group
        ? arrayMove(items, a, b)
        : items;
    });
  };
  const addExpense = async (data: ExpenseFormData) => {
    const date = convertDateToUTCISOString(parseDateInputToLocal(data.date));
    if (data.isInstallment && data.installmentCount > 1)
      await installments.mutateAsync({
        ...data,
        date,
        numParcelas: data.installmentCount,
      });
    else
      await create.mutateAsync({
        description: data.description,
        amount: data.amount,
        date,
        categoryId: data.categoryId,
        type: "expense",
      });
    setExpenseDate(null);
  };
  const content = (id: string) => {
    switch (id) {
      case "upcoming-bills":
        return (
          <UpcomingBills
            fixedExpenses={fixedExpenses}
            transactions={transactions}
            monthlyVariations={monthlyVariations}
            date={selectedDateObject}
          />
        );
      case "recent-transactions":
        return (
          <RecentTransactions
            transactions={transactions}
            categories={categories}
            date={selectedDateObject}
          />
        );
      case "weekly-calendar":
        return (
          <WeeklyFinancialCalendar
            transactions={transactionsWithoutInstallments}
            categories={categories}
            managementDaily={
              investment.data &&
              !investment.isError &&
              !investment.isLoading &&
              !investment.isPlaceholderData
                ? budget.daily
                : undefined
            }
            onAddExpense={(date) => setExpenseDate(formatDateToYYYYMMDD(date))}
          />
        );
      case "category-pie":
        return (
          <CategoryPieChart
            transactions={transactionsWithoutInstallments}
            categories={categories}
            date={selectedDateObject}
            monthlyVariations={monthlyVariations}
          />
        );
      case "weekly-spending":
        return (
          <WeeklySpending transactions={transactionsWithoutInstallments} />
        );
      case "expenses-histogram":
        return (
          <ExpensesValueHistogram
            transactions={transactionsWithoutInstallments}
            date={selectedDateObject}
            monthlyVariations={monthlyVariations}
          />
        );
      case "monthly-histogram":
        return history.isError ? (
          <ErrorState message="Não foi possível carregar o histórico." />
        ) : history.isLoading ? (
          <LoadingState />
        ) : (
          <MonthlyHistogram
            transactions={history.data}
            categories={categories}
            fixedExpenses={fixedExpenses}
            fixedIncomes={fixedIncomes}
            date={selectedDateObject}
            monthlyVariations={monthlyVariations}
          />
        );
      default:
        return null;
    }
  };
  const renderGroup = (group: string) => {
    const list = widgets.filter((item) => item.group === group);
    return (
      <div className="dashboard-grid">
        {list.map((widget: DashboardWidget, index) => (
          <SortableDashboardItem
            key={widget.id}
            {...widget}
            span={group === "details" ? 1 : widget.span}
            organizing={organizing}
            first={index === 0}
            last={index === list.length - 1}
            onMove={(direction) => move(widget.id, direction)}
          >
            {content(widget.id)}
          </SortableDashboardItem>
        ))}
      </div>
    );
  };
  return (
    <div id="dashboard-overview" className="page-stack dashboard-page">
      <PageTitle
        title="Início"
        description={selectedDateObject.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        })}
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              setOrganizing((v) => !v);
              if (!organizing) setDetailsOpen(true);
            }}
          >
            {organizing ? <Check /> : <SlidersHorizontal />}
            {organizing ? "Concluir" : "Organizar"}
          </Button>
        }
      />
      {finance.isError ? (
        <ErrorState retry={() => void finance.refetch()} />
      ) : finance.isLoading ? (
        <LoadingState />
      ) : (
        <>
          <MonthlyOverview
            summary={summary}
            budget={
              investment.isError
                ? { status: "error", retry: () => void investment.refetch() }
                : investment.isLoading ||
                    investment.isPlaceholderData ||
                    !investment.data
                  ? { status: "loading" }
                  : { status: "ready", ...budget, investment: investmentAmount }
            }
          />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={drag}
          >
            <SortableContext
              items={widgets.map((item) => item.id)}
              strategy={rectSortingStrategy}
            >
              {renderGroup("overview")}
              <details
                className="dashboard-details"
                open={detailsOpen}
                onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
              >
                <summary>
                  <span>Detalhes do mês</span>
                  <span className="small subtle">Gastos e evolução</span>
                </summary>
                <div className="details-body">
                  {detailsOpen && renderGroup("details")}
                </div>
              </details>
            </SortableContext>
          </DndContext>
        </>
      )}
      <ExpenseModal
        isOpen={expenseDate !== null}
        onClose={() => setExpenseDate(null)}
        initialDate={expenseDate || undefined}
        onSubmit={addExpense}
        isLoading={create.isPending || installments.isPending}
      />
    </div>
  );
}
