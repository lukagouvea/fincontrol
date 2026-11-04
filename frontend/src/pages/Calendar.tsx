import React, { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { Transaction, VariableExpense } from "../types/FinanceTypes";
import {
  ExpenseFormData,
  ExpenseModal,
} from "../components/Expenses/ExpenseModal";
import { IncomeFormData, IncomeModal } from "../components/Income/IncomeModal";
import {
  areSameDay,
  convertDateToUTCISOString,
  formatDateToYYYYMMDD,
  parseDateInputToLocal,
} from "../utils/dateUtils";
import { getActualFixedItemAmount } from "../utils/financeUtils";
import { useCategories } from "../hooks/useCategories";
import { useMonthlyVariations } from "../hooks/useMonthlyVariations";
import {
  useThreeMonthsTransactions,
  useAddTransaction,
  useAddCompraParcelada,
} from "../hooks/useTransactions";
import {
  useFixedIncomes,
  useFixedExpenses,
} from "../hooks/useFixedTransactions";
import {
  Button,
  CategoryLabel,
  EmptyState,
  ErrorState,
  LoadingState,
  Money,
  PageTitle,
} from "../components/Shared/UI";

type CalendarEventDisplay = {
  id: string;
  description: string;
  amount: number;
  isFixed?: boolean;
  hasVariation?: boolean;
  isExpense?: boolean;
  category?: string;
  categoryColor?: string;
  standardAmount?: number;
};

export const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);

  const transactionQuery = useThreeMonthsTransactions(
    selectedMonth,
    selectedYear,
  );
  const { data: transactions = [] } = transactionQuery;
  const categoryQuery = useCategories();
  const { data: categories = [], isLoading: isLoadingCategories } =
    categoryQuery;
  const expenseQuery = useFixedExpenses();
  const { data: fixedExpenses = [], isLoading: isLoadingFixedExpenses } =
    expenseQuery;
  const incomeQuery = useFixedIncomes();
  const { data: fixedIncomes = [], isLoading: isLoadingFixedIncomes } =
    incomeQuery;
  const variationQuery = useMonthlyVariations();
  const {
    data: monthlyVariations = [],
    isLoading: isLoadingMonthlyVariations,
  } = variationQuery;

  const isLoading =
    isLoadingCategories ||
    isLoadingFixedExpenses ||
    isLoadingFixedIncomes ||
    isLoadingMonthlyVariations;

  const addCompraParceladaMutation = useAddCompraParcelada();
  const addTransactionMutation = useAddTransaction();

  const isSaving =
    addTransactionMutation.isPending || addCompraParceladaMutation.isPending;

  const generateCalendarDays = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    // A Sunday start still needs the previous month's full week in the grid.
    const firstDayOfWeek = firstDayOfMonth.getDay() || 7;
    const totalDays = 42;
    const days: Date[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      const day = new Date(year, month, 1 - (firstDayOfWeek - i));
      days.push(day);
    }
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const day = new Date(year, month, i);
      days.push(day);
    }
    const remainingDays = totalDays - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const day = new Date(year, month + 1, i);
      days.push(day);
    }
    return days;
  };
  const calendarDays = generateCalendarDays(currentDate);

  const navigateTo = (date: Date) => {
    setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelectedMonth(date.getMonth());
    setSelectedYear(date.getFullYear());
    setSelectedDay(date);
  };
  const goToPreviousMonth = () =>
    navigateTo(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  const goToCurrentMonth = () => navigateTo(new Date());
  const goToNextMonth = () =>
    navigateTo(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  const formatDayOfMonth = (date: Date): string => {
    return date.getDate().toString();
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date): boolean => {
    return (
      date.getMonth() === currentDate.getMonth() &&
      date.getFullYear() === currentDate.getFullYear()
    );
  };

  const handleExpenseSubmit = async (formData: ExpenseFormData) => {
    const date = convertDateToUTCISOString(
      parseDateInputToLocal(formData.date),
    );
    if (formData.isInstallment && formData.installmentCount > 1)
      await addCompraParceladaMutation.mutateAsync({
        description: formData.description,
        amount: formData.amount,
        date,
        categoryId: formData.categoryId,
        numParcelas: formData.installmentCount,
      });
    else
      await addTransactionMutation.mutateAsync({
        description: formData.description,
        amount: formData.amount,
        date,
        categoryId: formData.categoryId,
        isInstallment: false,
        type: "expense",
      } as Omit<VariableExpense, "id">);
    setIsExpenseModalOpen(false);
  };
  const handleIncomeSubmit = async (formData: IncomeFormData) => {
    await addTransactionMutation.mutateAsync({
      description: formData.description,
      amount: formData.amount,
      date: convertDateToUTCISOString(parseDateInputToLocal(formData.date)),
      categoryId: formData.categoryId,
      type: "income",
    } as Omit<Transaction, "id">);
    setIsIncomeModalOpen(false);
  };

  const getTransactionsForDate = (date: Date) => {
    // 1. Filtra transações do dia
    return transactions
      .filter((t) => {
        // Exibe tanto Renda quanto Despesa, DESDE QUE não seja variação de fixa
        const isNotFixedVariation = !t.recurringRuleId;
        return isNotFixedVariation && areSameDay(t.date, date);
      })
      .map((t) => {
        const category = categories.find(
          (c) => "categoryId" in t && c.id === t.categoryId,
        );

        // FIX: Usa o campo 'type' do banco para decidir se é despesa
        const isExpense = t.type === "expense";

        return {
          id: t.id,
          description: t.description,
          amount: t.amount,
          isExpense,
          category: category?.name || "Sem categoria",
          categoryColor: category?.color || "#999",
        };
      });
  };

  const getFixedExpensesForDate = (date: Date) => {
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    return fixedExpenses
      .filter((expense) => {
        const startDate = new Date(expense.startDate);
        const endDate = expense.endDate ? new Date(expense.endDate) : null;
        if (endDate && date > endDate) return false;
        if (date < startDate) return false;
        return expense.day === day;
      })
      .map((expense) => {
        const category = categories.find((c) => c.id === expense.categoryId);
        const actualAmount = getActualFixedItemAmount(
          expense.id,
          "expense",
          year,
          month,
          expense.amount,
          monthlyVariations,
        );
        return {
          id: expense.id,
          description: expense.description,
          amount: actualAmount,
          isExpense: true,
          category: category?.name || "Sem categoria",
          categoryColor: category?.color || "#999",
          isFixed: true,
          hasVariation: actualAmount !== expense.amount,
          standardAmount: expense.amount,
        };
      });
  };

  const getFixedIncomesForDate = (date: Date) => {
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    return fixedIncomes
      .filter((income) => {
        const startDate = new Date(income.startDate);
        const endDate = income.endDate ? new Date(income.endDate) : null;
        if (endDate && date > endDate) return false;
        if (date < startDate) return false;
        return income.day === day;
      })
      .map((income) => {
        const actualAmount = getActualFixedItemAmount(
          income.id,
          "income",
          year,
          month,
          income.amount,
          monthlyVariations,
        );
        return {
          id: income.id,
          description: income.description,
          amount: actualAmount,
          isExpense: false,
          category: "Renda Fixa",
          categoryColor: "#4CAF50",
          isFixed: true,
          hasVariation: actualAmount !== income.amount,
          standardAmount: income.amount,
        };
      });
  };

  const getEventsForDate = (date: Date) => {
    const transactions = getTransactionsForDate(date);
    const fixedExpenses = getFixedExpensesForDate(date);
    const fixedIncomes = getFixedIncomesForDate(date);
    return [...transactions, ...fixedExpenses, ...fixedIncomes];
  };

  const getBalanceForDate = (date: Date): number => {
    const events = getEventsForDate(date);
    return events.reduce((total, event) => {
      return event.isExpense ? total - event.amount : total + event.amount;
    }, 0);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleAddExpense = (date: Date) => {
    setSelectedDay(date);
    setIsExpenseModalOpen(true);
  };

  const handleAddIncome = (date: Date) => {
    setSelectedDay(date);
    setIsIncomeModalOpen(true);
  };

  const queries = [categoryQuery, expenseQuery, incomeQuery, variationQuery];
  const isError = queries.some((q) => q.isError);
  const events = selectedDay
    ? (getEventsForDate(selectedDay) as CalendarEventDisplay[])
    : [];
  const selectedMonthState = selectedDay
    ? transactionQuery.getMonthState(selectedDay)
    : undefined;
  const selectDay = (day: Date) => {
    setSelectedDay(day);
    if (!isCurrentMonth(day)) navigateTo(day);
  };
  return (
    <div id="calendar-container" className="page-stack calendar-page">
      <PageTitle title="Calendário" />
      {isError ? (
        <ErrorState
          retry={() => {
            queries.forEach((q) => void q.refetch());
          }}
        />
      ) : (
        <div className="calendar-layout">
          <section
            className="panel calendar-panel"
            aria-label="Calendário mensal"
          >
            <div className="panel-body">
              <div className="calendar-toolbar">
                <h2 className="calendar-month">
                  {formatMonthYear(currentDate)}
                </h2>
                <div className="inline-actions">
                  <button
                    className="icon-button"
                    aria-label="Mês anterior"
                    onClick={goToPreviousMonth}
                  >
                    <ChevronLeftIcon size={18} />
                  </button>
                  <Button variant="secondary" onClick={goToCurrentMonth}>
                    Hoje
                  </Button>
                  <button
                    className="icon-button"
                    aria-label="Próximo mês"
                    onClick={goToNextMonth}
                  >
                    <ChevronRightIcon size={18} />
                  </button>
                </div>
              </div>
              {isLoading ? (
                <LoadingState />
              ) : (
                <div
                  className="calendar-grid"
                  role="group"
                  aria-label={formatMonthYear(currentDate)}
                >
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                    (day) => (
                      <div
                        className="calendar-weekday"
                        key={day}
                        aria-hidden="true"
                      >
                        {day}
                      </div>
                    ),
                  )}
                  {calendarDays.map((day) => {
                    const monthState = transactionQuery.getMonthState(day);
                    const dayEvents =
                      monthState.isLoading || monthState.isError
                        ? []
                        : getEventsForDate(day);
                    const selected =
                      selectedDay?.toDateString() === day.toDateString();
                    const balance = getBalanceForDate(day);
                    return (
                      <button
                        key={formatDateToYYYYMMDD(day)}
                        id={"calendar-day-" + formatDateToYYYYMMDD(day)}
                        type="button"
                        className={
                          "calendar-day " +
                          (!isCurrentMonth(day) ? "other-month" : "")
                        }
                        aria-pressed={selected}
                        aria-busy={monthState.isLoading}
                        aria-current={isToday(day) ? "date" : undefined}
                        aria-label={
                          day.toLocaleDateString("pt-BR", {
                            dateStyle: "full",
                          }) +
                          ", " +
                          (monthState.isLoading
                            ? "carregando movimentações"
                            : monthState.isError
                              ? "movimentações indisponíveis"
                              : dayEvents.length + " movimentações")
                        }
                        tabIndex={selected ? 0 : -1}
                        onClick={() => selectDay(day)}
                        onKeyDown={(event) => {
                          const offsets: Record<string, number> = {
                            ArrowLeft: -1,
                            ArrowRight: 1,
                            ArrowUp: -7,
                            ArrowDown: 7,
                            Home: -day.getDay(),
                            End: 6 - day.getDay(),
                          };
                          if (!(event.key in offsets)) return;
                          event.preventDefault();
                          const next = new Date(
                            day.getFullYear(),
                            day.getMonth(),
                            day.getDate() + offsets[event.key],
                          );
                          selectDay(next);
                          requestAnimationFrame(() =>
                            document
                              .getElementById(
                                "calendar-day-" + formatDateToYYYYMMDD(next),
                              )
                              ?.focus(),
                          );
                        }}
                      >
                        <span className="calendar-day-number">
                          {formatDayOfMonth(day)}
                        </span>
                        <span
                          className="calendar-indicators"
                          aria-hidden="true"
                        >
                          {(monthState.isLoading || monthState.isError) && (
                            <span className="calendar-data-status">
                              {monthState.isLoading ? "…" : "!"}
                            </span>
                          )}
                          {dayEvents.some((e) => e.isExpense) && (
                            <i className="expense-dot" />
                          )}
                          {dayEvents.some((e) => !e.isExpense) && (
                            <i className="income-dot" />
                          )}
                        </span>
                        <span
                          className={
                            "calendar-day-balance " +
                            (balance < 0 ? "negative" : "")
                          }
                        >
                          {dayEvents.length ? formatCurrency(balance) : ""}
                        </span>
                        <span className="calendar-event-count">
                          {dayEvents.length
                            ? dayEvents.length +
                              (dayEvents.length === 1
                                ? " lançamento"
                                : " lançamentos")
                            : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="calendar-legend">
                <span>
                  <i className="expense-dot" />
                  Despesas
                </span>
                <span>
                  <i className="income-dot" />
                  Receitas
                </span>
              </p>
            </div>
          </section>
          {selectedDay && (
            <section
              className="panel day-agenda"
              aria-label={
                "Agenda do dia " + selectedDay.toLocaleDateString("pt-BR")
              }
            >
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">AGENDA DO DIA</p>
                  <h2>
                    {selectedDay.toLocaleDateString("pt-BR", {
                      day: "numeric",
                      month: "long",
                    })}
                  </h2>
                </div>
              </div>
              <div className="panel-body">
                {isLoading || selectedMonthState?.isLoading ? (
                  <LoadingState />
                ) : selectedMonthState?.isError ? (
                  <ErrorState retry={() => void selectedMonthState.refetch()} />
                ) : (
                  <>
                    <div className="day-balance">
                      <span>Saldo do dia</span>
                      <Money value={getBalanceForDate(selectedDay)} />
                    </div>
                    {events.length ? (
                      events.map((event) => (
                        <div
                          className="agenda-item"
                          key={event.id + (event.isFixed ? "-fixed" : "")}
                        >
                          <div>
                            <strong>{event.description}</strong>
                            <div>
                              <CategoryLabel
                                name={event.category}
                                color={event.categoryColor}
                              />
                            </div>
                            {event.isFixed && (
                              <p className="small subtle">
                                Recorrente
                                {event.hasVariation ? " · variação mensal" : ""}
                              </p>
                            )}
                            {event.hasVariation && (
                              <p className="small subtle">
                                Padrão:{" "}
                                {formatCurrency(event.standardAmount || 0)}
                              </p>
                            )}
                          </div>
                          <Money
                            value={event.amount}
                            type={event.isExpense ? "expense" : "income"}
                          />
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        title="Dia livre de movimentações"
                        description="Adicione uma receita ou despesa para esta data."
                      />
                    )}
                    <div className="agenda-actions">
                      <Button
                        aria-label="Adicionar despesa"
                        onClick={() => handleAddExpense(selectedDay)}
                      >
                        <PlusIcon size={16} />
                        <span>
                          <span className="agenda-add-prefix">Adicionar </span>
                          despesa
                        </span>
                      </Button>
                      <Button
                        variant="secondary"
                        aria-label="Adicionar receita"
                        onClick={() => handleAddIncome(selectedDay)}
                      >
                        <PlusIcon size={16} />
                        <span>
                          <span className="agenda-add-prefix">Adicionar </span>
                          receita
                        </span>
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}
        </div>
      )}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSubmit={handleExpenseSubmit}
        initialDate={
          selectedDay ? formatDateToYYYYMMDD(selectedDay) : undefined
        }
        isLoading={isSaving}
      />
      <IncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onSubmit={handleIncomeSubmit}
        initialDate={
          selectedDay ? formatDateToYYYYMMDD(selectedDay) : undefined
        }
        isLoading={isSaving}
      />
    </div>
  );
};
