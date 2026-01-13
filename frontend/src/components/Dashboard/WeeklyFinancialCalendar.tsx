import React, { useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react';
import { Transaction, VariableExpense, Category } from '../../types/FinanceTypes';
import { areSameDay, getEndOfWeek, getStartOfWeek } from '../../utils/dateUtils';
type WeeklyFinancialCalendarProps = {
  onAddExpense?: (date: Date) => void;
  transactions: Transaction[];
  categories: Category[];
  managementDaily?: number;
};
export const WeeklyFinancialCalendar: React.FC<WeeklyFinancialCalendarProps> = ({
  onAddExpense,
  transactions,
  categories,
  managementDaily
}) => {
  // Mês real atual (de hoje) — o usuário não pode navegar para fora dele
  const currentMonthRef = new Date();
  const currentMonthStart = new Date(currentMonthRef.getFullYear(), currentMonthRef.getMonth(), 1);
  currentMonthStart.setHours(0, 0, 0, 0);
  const currentMonthEnd = new Date(currentMonthRef.getFullYear(), currentMonthRef.getMonth() + 1, 0);
  currentMonthEnd.setHours(23, 59, 59, 999);

  // State for tracking the current week and selected day
  const [weekStart, setWeekStart] = useState<Date>(() => getStartOfWeek(new Date()));
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

  const canGoPrev = getEndOfWeek(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() - 7)) >= currentMonthStart;
  const canGoNext = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7) <= currentMonthEnd;

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
    return date.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric'
    });
  };
  const formatDayOfWeek = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short'
    }).slice(0, 3);
  };
  const formatDayOfMonth = (date: Date): string => {
    return date.getDate().toString();
  };
  // Check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
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
    return transactions.filter(t => t.type=='expense' && !t.recurringRuleId).filter(t => areSameDay(t.date, date)).map(t => {
      const expense = t as VariableExpense;
      const category = categories.find(c => c.id === expense.categoryId);
      return {
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        category: category?.name || 'Sem categoria',
        categoryColor: category?.color || '#999'
      };
    });
  };
  // Get total expenses for a specific date
  const getTotalExpensesForDate = (date: Date): number => {
    return transactions.filter(t => t.type=='expense' && !t.recurringRuleId).filter(t => areSameDay(t.date, date)).reduce((sum, t) => sum + t.amount, 0);
  };

  // Função Type Guard para identificar VariableExpense de forma segura
  const isVariableExpense = (transaction: Transaction): transaction is VariableExpense => {
    // A propriedade 'isInstallment' só existe em VariableExpense no seu modelo
    return transaction.type=='expense' && !transaction.recurringRuleId;
  }

  const calculateWeeklyExpenses = (
    variableTransactions: Transaction[],
    dateInWeek: Date
  ): number => {
    // --- 1. Definir o intervalo da semana usando suas funções ---
    const weekStart = getStartOfWeek(dateInWeek);
    const weekEnd = getEndOfWeek(dateInWeek);

    // --- 2. Encontrar as DESPESAS VARIÁVEIS da semana ---
    const variableExpensesInWeek = variableTransactions
      .filter(isVariableExpense) // Usa sua função Type Guard
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= weekStart && expenseDate <= weekEnd;
      });

    // --- 3. Somar o total ---
    const weeklyTotal = variableExpensesInWeek.reduce(
      (total, expense) => total + expense.amount, 
      0
    );

    return weeklyTotal;
  };

  const weeklySpent = calculateWeeklyExpenses(transactions, weekStart);

  // Orçamento semanal: gerenciamento diário * quantidade de dias desta semana que pertencem ao mês atual
  const daysInCurrentMonthThisWeek = weekDays.filter((d) => isInCurrentMonth(d)).length;
  const weeklyBudget = (managementDaily ?? 0) * daysInCurrentMonthThisWeek;
  const weeklySaldo = weeklyBudget - weeklySpent;

  // Format currency values
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  return <div className="bg-white p-6 rounded-lg mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="w-16"></div>
        <h2 className="text-md font-medium text-gray-600">
          {formatMonthYear(weekStart)}
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPreviousWeek}
            disabled={!canGoPrev}
            className={`p-2 rounded-full ${canGoPrev ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
          >
            <ChevronLeftIcon size={16} />
          </button>
          <button onClick={goToCurrentWeek} className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
            Hoje
          </button>
          <button
            onClick={goToNextWeek}
            disabled={!canGoNext}
            className={`p-2 rounded-full ${canGoNext ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {weekDays.map((day, index) => <div key={`header-${index}`} className="text-center text-sm font-medium text-gray-600 mb-2">
            {formatDayOfWeek(day)}
          </div>)}
        {/* Calendar days */}
        {weekDays.map((day, index) => {
        const expenses = getExpensesForDate(day);
        const totalExpenses = getTotalExpensesForDate(day);
        const isSelected = selectedDay && day.getTime() === selectedDay.getTime();
        const isOutOfMonth = !isInCurrentMonth(day);
        return <div
              key={`day-${index}`}
              className={`border rounded-lg p-2 h-[150px] overflow-hidden ${isOutOfMonth ? '' : 'cursor-pointer'} transition-all
                ${isToday(day) ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}
                ${isSelected ? 'ring-2 ring-blue-500 border-transparent' : ''}
                ${isOutOfMonth ? 'bg-gray-200 border-gray-300 opacity-90' : 'hover:border-blue-300 hover:shadow-sm'}`}
              onClick={isOutOfMonth ? undefined : () => handleDayClick(day)}
              role={isOutOfMonth ? undefined : 'button'}
            >
              <div className="text-center mb-2">
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm ${isToday(day) ? 'bg-blue-600 text-white' : isSelected ? 'bg-blue-200 text-blue-800' : 'text-gray-700'}`}>
                  {formatDayOfMonth(day)}
                </span>
              </div>
              {expenses.length > 0 ? <div className="space-y-2 overflow-hidden max-h-[100px]">
                  {expenses.slice(0, 2).map(expense => <div key={expense.id} className="bg-gray-50 p-2 rounded text-xs hover:bg-gray-100">
                      <div className="font-medium text-gray-800 truncate">
                        {expense.description}
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs rounded-full px-1.5 py-0.5 truncate max-w-[70px]" style={{
                  backgroundColor: `${expense.categoryColor}20`,
                  color: expense.categoryColor
                }}>
                          {expense.category}
                        </span>
                        <span className="text-xs font-medium text-red-600">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
                    </div>)}
                  {expenses.length > 2 && <div className="text-xs font-medium text-gray-600 pt-1 border-t border-gray-100">
                      +{expenses.length - 2}{' '}
                      {expenses.length - 2 === 1 ? 'despesa' : 'despesas'}
                    </div>}
                  {expenses.length > 1 && <div className="text-xs font-medium text-gray-600 pt-1 border-t border-gray-100">
                      Total:{' '}
                      <span className="text-red-600">
                        {formatCurrency(totalExpenses)}
                      </span>
                    </div>}
                </div> : <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  {isOutOfMonth ? '' : 'Sem despesas'}
                </div>}
            </div>;
      })}
      </div>
      <div className="mt-4 flex items-start justify-end gap-10">
        <div className="text-right">
          <h3 className="text-sm font-medium text-gray-500">Total gasto na semana</h3>
          <p>
            <span className="font-medium text-red-600">
              {formatCurrency(weeklySpent)}
            </span>
          </p>
        </div>

        {typeof managementDaily === 'number' && (
          <div className="text-right">
            <h3 className="text-sm font-medium text-gray-500">Saldo da semana</h3>
            <p>
              <span className={`font-medium ${weeklySaldo < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {formatCurrency(weeklySaldo)}
              </span>
            </p>
          </div>
        )}
      </div>


      {/* Selected day details */}
      {selectedDay && <div className="mt-6 p-4 border border-blue-200 bg-blue-50 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-blue-800">
              Detalhes do dia {selectedDay.toLocaleDateString('pt-BR')}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="text-blue-600 hover:text-blue-900">
              <XIcon size={20} />
            </button>
          </div>
          {getExpensesForDate(selectedDay).length > 0 ? <div className="space-y-3">
              {getExpensesForDate(selectedDay).map(expense => <div key={expense.id} className="bg-white p-3 rounded shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{expense.description}</div>
                      <div className="text-sm rounded px-2 py-0.5 inline-block mt-1" style={{
                backgroundColor: `${expense.categoryColor}20`,
                color: expense.categoryColor
              }}>
                        {expense.category}
                      </div>
                    </div>
                    <div className="font-medium text-red-600">
                      {formatCurrency(expense.amount)}
                    </div>
                  </div>
                </div>)}
            </div> : <p className="text-gray-500 text-center py-4">
              Nenhuma despesa registrada para este dia.
            </p>}
          <div className="mt-4">
            <button className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => onAddExpense?.(selectedDay)} >
              Adicionar nova despesa para este dia
            </button>
          </div>
        </div>}
    </div>;
};