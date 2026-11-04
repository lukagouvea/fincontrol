import React, { useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import {
  Transaction,
  VariableExpense,
  Category,
} from "../../types/FinanceTypes";
import {
  areSameDay,
  getEndOfWeek,
  getStartOfWeek,
} from "../../utils/dateUtils";
type WeeklyFinancialCalendarProps = {
  onAddExpense?: (date: Date) => void;
  transactions: Transaction[];
  categories: Category[];
  managementDaily?: number;
};
export const WeeklyFinancialCalendar: React.FC<
  WeeklyFinancialCalendarProps
> = ({ onAddExpense, transactions, categories, managementDaily }) => {
  // Mês real atual (de hoje) — o usuário não pode navegar para fora dele
  const currentMonthRef = new Date();
  const currentMonthStart = new Date(
    currentMonthRef.getFullYear(),
    currentMonthRef.getMonth(),
    1,
  );
  currentMonthStart.setHours(0, 0, 0, 0);
  const currentMonthEnd = new Date(
    currentMonthRef.getFullYear(),
    currentMonthRef.getMonth() + 1,
    0,
  );
  currentMonthEnd.setHours(23, 59, 59, 999);

  // State for tracking the current week and selected day
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getStartOfWeek(new Date()),
  );
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const clampWeekStartToCurrentMonth = (candidateStart: Date): Date => {
    // Se a semana candidata estiver totalmente antes do mês atual, pula para a 1ª semana do mês
    const candEnd = getEndOfWeek(candidateStart);
    if (candEnd < currentMonthStart) {
      return getStartOfWeek(currentMonthStart);
    }

    // Se a semana candidata estiver totalmente depois do mês atual, volta para a última semana do mês
    if (candidateStart > currentMonthEnd) {
      return getStartOfWeek(currentMonthEnd);
    }

    return candidateStart;
  };

  const canGoPrev =
    getEndOfWeek(
      new Date(
        weekStart.getFullYear(),
        weekStart.getMonth(),
        weekStart.getDate() - 7,
      ),
    ) >= currentMonthStart;
  const canGoNext =
    new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + 7,
    ) <= currentMonthEnd;

  // Generate the days for the current week whenever weekStart changes
  useEffect(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    setWeekDays(days);
  }, [weekStart]);

  // Garante que nunca ficamos fora do mês atual (ex: por qualquer efeito colateral)
  useEffect(() => {
    const clamped = clampWeekStartToCurrentMonth(weekStart);
    if (clamped.getTime() !== weekStart.getTime()) {
      setWeekStart(clamped);
      setSelectedDay(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigation functions
  const goToPreviousWeek = () => {
    if (!canGoPrev) return;
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() - 7);
    setWeekStart(clampWeekStartToCurrentMonth(newStart));
    setSelectedDay(null);
  };
  const goToCurrentWeek = () => {
    setWeekStart(getStartOfWeek(new Date()));
    setSelectedDay(null);
  };
  const goToNextWeek = () => {
    if (!canGoNext) return;
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + 7);
    setWeekStart(clampWeekStartToCurrentMonth(newStart));
    setSelectedDay(null);
  };

  // Date formatting functions
  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  };
  const formatDayOfWeek = (date: Date): string => {
    return date
      .toLocaleDateString("pt-BR", {
        weekday: "short",
      })
      .slice(0, 3);
  };
  const formatDayOfMonth = (date: Date): string => {
    return date.getDate().toString();
  };
  // Check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };
  // Handle day click
  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
  };

  const isInCurrentMonth = (date: Date): boolean => {
    return (
      date.getFullYear() === currentMonthRef.getFullYear() &&
      date.getMonth() === currentMonthRef.getMonth()
    );
  };
  // Get expenses for a specific date
  const getExpensesForDate = (date: Date) => {
    // Filter variable expenses for this date
    return transactions
      .filter((t) => t.type == "expense" && !t.recurringRuleId)
      .filter((t) => areSameDay(t.date, date))
      .map((t) => {
        const expense = t as VariableExpense;
        const category = categories.find((c) => c.id === expense.categoryId);
        return {
          id: expense.id,
          description: expense.description,
          amount: expense.amount,
          category: category?.name || "Sem categoria",
          categoryColor: category?.color || "#999",
        };
      });
  };
  // Get total expenses for a specific date
  const getTotalExpensesForDate = (date: Date): number => {
    return transactions
      .filter((t) => t.type == "expense" && !t.recurringRuleId)
      .filter((t) => areSameDay(t.date, date))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Função Type Guard para identificar VariableExpense de forma segura
  const isVariableExpense = (
    transaction: Transaction,
  ): transaction is VariableExpense => {
    // A propriedade 'isInstallment' só existe em VariableExpense no seu modelo
    return transaction.type == "expense" && !transaction.recurringRuleId;
  };

  const calculateWeeklyExpenses = (
    variableTransactions: Transaction[],
    dateInWeek: Date,
  ): number => {
    // --- 1. Definir o intervalo da semana usando suas funções ---
    const weekStart = getStartOfWeek(dateInWeek);
    const weekEnd = getEndOfWeek(dateInWeek);

    // --- 2. Encontrar as DESPESAS VARIÁVEIS da semana ---
    const variableExpensesInWeek = variableTransactions
      .filter(isVariableExpense) // Usa sua função Type Guard
      .filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= weekStart && expenseDate <= weekEnd;
      });

    // --- 3. Somar o total ---
    const weeklyTotal = variableExpensesInWeek.reduce(
      (total, expense) => total + expense.amount,
      0,
    );

    return weeklyTotal;
  };

  const weeklySpent = calculateWeeklyExpenses(transactions, weekStart);

  // Orçamento semanal: gerenciamento diário * quantidade de dias desta semana que pertencem ao mês atual
  const daysInCurrentMonthThisWeek = weekDays.filter((d) =>
    isInCurrentMonth(d),
  ).length;
  const weeklyBudget = (managementDaily ?? 0) * daysInCurrentMonthThisWeek;
  const weeklySaldo = weeklyBudget - weeklySpent;

  // Format currency values
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };
  return (
    <div className="weekly-calendar">
      <div className="calendar-toolbar">
        <p className="small subtle">{formatMonthYear(weekStart)}</p>
        <div className="inline-actions">
          <button
            className="icon-button"
            aria-label="Semana anterior"
            onClick={goToPreviousWeek}
            disabled={!canGoPrev}
          >
            <ChevronLeftIcon size={18} />
          </button>
          <button className="button button-ghost" onClick={goToCurrentWeek}>
            Hoje
          </button>
          <button
            className="icon-button"
            aria-label="Próxima semana"
            onClick={goToNextWeek}
            disabled={!canGoNext}
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>
      </div>
      <div className="week-grid">
        {weekDays.map((day) => {
          const selected = selectedDay?.getTime() === day.getTime();
          const spent = getTotalExpensesForDate(day);
          return (
            <button
              key={day.toISOString()}
              type="button"
              className="week-day"
              aria-pressed={selected}
              aria-current={isToday(day) ? "date" : undefined}
              disabled={!isInCurrentMonth(day)}
              onClick={() => handleDayClick(day)}
              aria-label={
                day.toLocaleDateString("pt-BR") +
                ", " +
                formatCurrency(spent) +
                " em despesas"
              }
            >
              <span>{formatDayOfWeek(day)}</span>
              <strong>{formatDayOfMonth(day)}</strong>
              <i className={spent > 0 ? "has-event" : ""} aria-hidden="true" />
              <small>{spent ? formatCurrency(spent) : "—"}</small>
            </button>
          );
        })}
      </div>
      <div className="week-totals">
        <div>
          <span>Total gasto na semana</span>
          <strong>{formatCurrency(weeklySpent)}</strong>
        </div>
        {typeof managementDaily === "number" && (
          <div>
            <span>Saldo da semana</span>
            <strong className={weeklySaldo < 0 ? "negative" : ""}>
              {formatCurrency(weeklySaldo)}
            </strong>
          </div>
        )}
      </div>
      {selectedDay && (
        <div className="selected-week-day">
          <div className="calendar-toolbar">
            <h3>
              {selectedDay.toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
              })}
            </h3>
            <button
              className="icon-button"
              aria-label="Fechar detalhes do dia"
              onClick={() => setSelectedDay(null)}
            >
              <XIcon size={18} />
            </button>
          </div>
          {getExpensesForDate(selectedDay).length ? (
            getExpensesForDate(selectedDay).map((expense) => (
              <div className="agenda-item" key={expense.id}>
                <div>
                  <strong>{expense.description}</strong>
                  <p className="small subtle">{expense.category}</p>
                </div>
                <span className="money money-negative">
                  {formatCurrency(expense.amount)}
                </span>
              </div>
            ))
          ) : (
            <p className="small subtle">Nenhuma despesa neste dia.</p>
          )}
          <button
            className="button button-secondary w-full mt-4"
            onClick={() => onAddExpense?.(selectedDay)}
          >
            Adicionar despesa neste dia
          </button>
        </div>
      )}
    </div>
  );
};
