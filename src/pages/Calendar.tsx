import React, { useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XIcon, PlusIcon } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { Transaction } from '../types/FinanceTypes';
import { ExpenseFormData, ExpenseModal } from '../components/Expenses/ExpenseModal';
import { IncomeFormData, IncomeModal } from '../components/Income/IncomeModal';
import { areSameDay, convertDateToUTCISOString, formatDateToYYYYMMDD, parseDateInputToLocal } from '../utils/dateUtils';
import { generateParcelas } from '../utils/financeUtils';

type CalendarEventDisplay = {
  id: string;
  description: string;
  amount: number;
  // Propriedades opcionais visuais
  isFixed?: boolean;
  hasVariation?: boolean;
  isExpense?: boolean;
  category?: string;
  categoryColor?: string;
};

export const Calendar: React.FC = () => {
  const {
    transactions,
    categories,
    fixedExpenses,
    fixedIncomes,
    getActualFixedItemAmount,
    addCompraParcelada,
    addTransaction
  } = useFinance();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  // Generate the days for the current month whenever currentDate changes
  useEffect(() => {
    const days = generateCalendarDays(currentDate);
    setCalendarDays(days);
  }, [currentDate]);
  // Generate calendar days including days from previous/next months to fill the grid
  const generateCalendarDays = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    // First day of the month
    const firstDayOfMonth = new Date(year, month, 1);
    // Last day of the month
    const lastDayOfMonth = new Date(year, month + 1, 0);
    // Day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDayOfMonth.getDay();
    // Total number of days to display (including days from previous/next months)
    // We need to fill a grid with complete weeks
    const totalDays = 42; // 6 rows of 7 days
    const days: Date[] = [];
    // Add days from previous month to fill the first row
    for (let i = 0; i < firstDayOfWeek; i++) {
      const day = new Date(year, month, 1 - (firstDayOfWeek - i));
      days.push(day);
    }
    // Add all days of the current month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const day = new Date(year, month, i);
      days.push(day);
    }
    // Add days from next month to complete the grid
    const remainingDays = totalDays - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const day = new Date(year, month + 1, i);
      days.push(day);
    }
    return days;
  };
  // Navigation functions
  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
    setSelectedDay(null);
  };
  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };
  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
    setSelectedDay(null);
  };
  // Date formatting functions
  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric'
    });
  };
  
  const formatDayOfMonth = (date: Date): string => {
    return date.getDate().toString();
  };
  
  // Check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };
  // Check if a date is in the current month
  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
  };
  // Handle day click
  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
  };


  const handleExpenseSubmit = (formData: ExpenseFormData) => {
      const localDateObject = parseDateInputToLocal(formData.date);
      const utcTimestamp = convertDateToUTCISOString(localDateObject);
  
      if (formData.isInstallment && formData.installmentCount > 1) {
        const compraParcelada = {
          description: formData.description,
          amount: formData.amount,
          date: utcTimestamp,
          categoryId: formData.categoryId,
          numParcelas: formData.installmentCount,
          parcelas: generateParcelas(formData.amount, formData.installmentCount, formData.description, utcTimestamp, formData.categoryId)
        };
        addCompraParcelada(compraParcelada);
      } else {
        addTransaction({
          description: formData.description,
          amount: formData.amount,
          date: utcTimestamp,
          categoryId: formData.categoryId,
          isInstallment: false,
        } as Omit<Transaction, 'id'>);
      }
      setIsExpenseModalOpen(false);
    };
  
    const handleIncomeSubmit = (formData: IncomeFormData) => {
      const localDateObject = parseDateInputToLocal(formData.date);
      const utcTimestamp = convertDateToUTCISOString(localDateObject);
  
      addTransaction({
        description: formData.description,
        amount: formData.amount,
        date: utcTimestamp,
        categoryId: formData.categoryId,
      } as Omit<Transaction, 'id'>);
      setIsIncomeModalOpen(false);
    };

  // Get transactions for a specific date
  const getTransactionsForDate = (date: Date) => {
    // Filter transactions for this date
    return transactions.filter(t => areSameDay(t.date, date)).map(t => {
      const isExpense = 'isInstallment' in t;
      const category = categories.find(c => 'categoryId' in t && c.id === t.categoryId);
      return {
        id: t.id,
        description: t.description,
        amount: t.amount,
        isExpense,
        category: category?.name || 'Sem categoria',
        categoryColor: category?.color || '#999'
      };
    });
  };
  // Get fixed expenses for a specific date
  const getFixedExpensesForDate = (date: Date) => {
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    return fixedExpenses.filter(expense => {
      const startDate = new Date(expense.startDate);
      const endDate = expense.endDate ? new Date(expense.endDate) : null;
      // Check if date is within the valid period
      if (endDate && date > endDate) return false;
      if (date < startDate) return false;
      return expense.day === day;
    }).map(expense => {
      const category = categories.find(c => c.id === expense.categoryId);
      const actualAmount = getActualFixedItemAmount(expense.id, 'expense', year, month, expense.amount);
      return {
        id: expense.id,
        description: expense.description,
        amount: actualAmount,
        isExpense: true,
        category: category?.name || 'Sem categoria',
        categoryColor: category?.color || '#999',
        isFixed: true,
        hasVariation: actualAmount !== expense.amount,
        standardAmount: expense.amount
      };
    });
  };
  // Get fixed incomes for a specific date
  const getFixedIncomesForDate = (date: Date) => {
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    return fixedIncomes.filter(income => {
      const startDate = new Date(income.startDate);
      const endDate = income.endDate ? new Date(income.endDate) : null;
      // Check if date is within the valid period
      if (endDate && date > endDate) return false;
      if (date < startDate) return false;
      return income.day === day;
    }).map(income => {
      const actualAmount = getActualFixedItemAmount(income.id, 'income', year, month, income.amount);
      return {
        id: income.id,
        description: income.description,
        amount: actualAmount,
        isExpense: false,
        category: 'Renda Fixa',
        categoryColor: '#4CAF50',
        isFixed: true,
        hasVariation: actualAmount !== income.amount,
        standardAmount: income.amount
      };
    });
  };
  // Get all financial events for a date
  const getEventsForDate = (date: Date) => {
    const transactions = getTransactionsForDate(date);
    const fixedExpenses = getFixedExpensesForDate(date);
    const fixedIncomes = getFixedIncomesForDate(date);
    return [...transactions, ...fixedExpenses, ...fixedIncomes];
  };
  // Get total balance for a specific date
  const getBalanceForDate = (date: Date): number => {
    const events = getEventsForDate(date);
    return events.reduce((total, event) => {
      return event.isExpense ? total - event.amount : total + event.amount;
    }, 0);
  };
  // Format currency values
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  // Handle add expense
  const handleAddExpense = (date: Date) => {
    setSelectedDay(date);
    setIsExpenseModalOpen(true);
  };
  // Handle add income
  const handleAddIncome = (date: Date) => {
    setSelectedDay(date);
    setIsIncomeModalOpen(true);
  };
  // Generate day of week headers
  const dayOfWeekHeaders = () => {
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return weekDays.map((day, index) => <div key={`header-${index}`} className="text-center text-sm font-medium text-gray-600">
        {day}
      </div>);
  };
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          Calendário Financeiro
        </h1>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-700">Visão Mensal</h2>
          <div className="flex items-center space-x-2">
            <button onClick={goToPreviousMonth} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
              <ChevronLeftIcon size={16} />
            </button>
            <button onClick={goToCurrentMonth} className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
              Hoje
            </button>
            <button onClick={goToNextMonth} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
              <ChevronRightIcon size={16} />
            </button>
          </div>
        </div>
        <div className="mb-4 text-center">
          <h3 className="text-md font-medium text-gray-600">
            {formatMonthYear(currentDate)}
          </h3>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {/* Day of week headers */}
          {dayOfWeekHeaders()}
          {/* Calendar days */}
          {calendarDays.map((day, index) => {
          const events = getEventsForDate(day);
          const balance = getBalanceForDate(day);
          const isSelected = selectedDay && day.getTime() === selectedDay.getTime();
          return <div key={`day-${index}`} className={`border rounded-lg p-2 h-[120px] overflow-hidden cursor-pointer transition-all
                  ${isToday(day) ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}
                  ${!isCurrentMonth(day) ? 'opacity-40' : ''}
                  ${isSelected ? 'ring-2 ring-blue-500 border-transparent' : ''}
                  hover:border-blue-300 hover:shadow-sm`} onClick={() => handleDayClick(day)}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${isToday(day) ? 'bg-blue-600 text-white' : isSelected ? 'bg-blue-200 text-blue-800' : 'text-gray-700'}`}>
                    {formatDayOfMonth(day)}
                  </span>
                  {events.length > 0 && <span className={`text-xs font-medium ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(balance)}
                    </span>}
                </div>
                {events.length > 0 ? <div className="space-y-1 overflow-hidden max-h-[80px]">
                    {events.slice(0, 2).map((evt) => {
                      const event = evt as CalendarEventDisplay;
                      return (<div key={`${event.id}-${event.isFixed ? 'fixed' : 'var'}`} className="bg-gray-50 p-1 rounded text-xs hover:bg-gray-100">
                        <div className="font-medium text-gray-800 truncate text-xs">
                          {event.description}
                          {'isFixed' in event && event.isFixed && <span className="text-[9px] ml-1 text-gray-500">
                              (Fixo)
                            </span>}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] rounded-full px-1 py-0.5 truncate max-w-[60px]" style={{
                    backgroundColor: `${event.categoryColor}20`,
                    color: event.categoryColor
                  }}>
                            {event.category}
                          </span>
                          <span className={`text-[10px] font-medium ${'hasVariation' in event && event.hasVariation ? 'text-blue-600' : event.isExpense ? 'text-red-600' : 'text-green-600'}`}>
                            {event.isExpense ? '-' : '+'}{' '}
                            {formatCurrency(event.amount)}
                          </span>
                        </div>
                      </div>)})}
                    {events.length > 2 && <div className="text-[10px] font-medium text-gray-600 pt-1">
                        +{events.length - 2}{' '}
                        {events.length - 2 === 1 ? 'transação' : 'transações'}
                      </div>}
                  </div> : <div className="h-full flex items-center justify-center text-xs text-gray-400">
                    {isCurrentMonth(day) ? 'Sem transações' : ''}
                  </div>}
              </div>;
        })}
        </div>
      </div>
      {/* Selected day details */}
      {selectedDay && <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-700">
              Detalhes do dia {selectedDay.toLocaleDateString('pt-BR')}
            </h3>
            <div className="flex items-center space-x-2">
              <button onClick={() => handleAddIncome(selectedDay)} className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                <PlusIcon size={14} />
                <span>Renda</span>
              </button>
              <button onClick={() => handleAddExpense(selectedDay)} className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">
                <PlusIcon size={14} />
                <span>Despesa</span>
              </button>
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-500">
                <XIcon size={20} />
              </button>
            </div>
          </div>
          <div className="mb-6">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">Saldo do dia</span>
              <span className={`font-bold ${getBalanceForDate(selectedDay) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(getBalanceForDate(selectedDay))}
              </span>
            </div>
          </div>
          <div className="space-y-4">
            {/* Transactions Section */}
            {getTransactionsForDate(selectedDay).length > 0 && <div>
                <h4 className="font-medium text-gray-700 mb-2">Transações</h4>
                <div className="space-y-2">
                  {getTransactionsForDate(selectedDay).map(event => <div key={event.id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{event.description}</div>
                          <div className="text-sm rounded px-2 py-0.5 inline-block mt-1" style={{
                    backgroundColor: `${event.categoryColor}20`,
                    color: event.categoryColor
                  }}>
                            {event.category}
                          </div>
                        </div>
                        <div className={`font-medium ${event.isExpense ? 'text-red-600' : 'text-green-600'}`}>
                          {event.isExpense ? '-' : '+'}{' '}
                          {formatCurrency(event.amount)}
                        </div>
                      </div>
                    </div>)}
                </div>
              </div>}
            {/* Fixed Expenses Section */}
            {getFixedExpensesForDate(selectedDay).length > 0 && <div>
                <h4 className="font-medium text-gray-700 mb-2">
                  Despesas Fixas
                </h4>
                <div className="space-y-2">
                  {getFixedExpensesForDate(selectedDay).map(event => <div key={event.id} className="p-3 border border-gray-200 rounded-lg bg-red-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{event.description}</div>
                          <div className="text-sm rounded px-2 py-0.5 inline-block mt-1" style={{
                    backgroundColor: `${event.categoryColor}20`,
                    color: event.categoryColor
                  }}>
                            {event.category}
                          </div>
                        </div>
                        <div>
                          <div className={`font-medium ${event.hasVariation ? 'text-blue-600' : 'text-red-600'}`}>
                            - {formatCurrency(event.amount)}
                          </div>
                          {event.hasVariation && <div className="text-xs text-gray-500 text-right">
                              Padrão: {formatCurrency(event.standardAmount)}
                            </div>}
                        </div>
                      </div>
                    </div>)}
                </div>
              </div>}
            {/* Fixed Incomes Section */}
            {getFixedIncomesForDate(selectedDay).length > 0 && <div>
                <h4 className="font-medium text-gray-700 mb-2">Rendas Fixas</h4>
                <div className="space-y-2">
                  {getFixedIncomesForDate(selectedDay).map(event => <div key={event.id} className="p-3 border border-gray-200 rounded-lg bg-green-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{event.description}</div>
                          <div className="text-sm rounded px-2 py-0.5 inline-block mt-1" style={{
                    backgroundColor: `${event.categoryColor}20`,
                    color: event.categoryColor
                  }}>
                            {event.category}
                          </div>
                        </div>
                        <div>
                          <div className={`font-medium ${event.hasVariation ? 'text-blue-600' : 'text-green-600'}`}>
                            + {formatCurrency(event.amount)}
                          </div>
                          {event.hasVariation && <div className="text-xs text-gray-500 text-right">
                              Padrão: {formatCurrency(event.standardAmount)}
                            </div>}
                        </div>
                      </div>
                    </div>)}
                </div>
              </div>}
            {getEventsForDate(selectedDay).length === 0 && <div className="py-8 text-center text-gray-500">
                Nenhuma transação registrada para este dia.
              </div>}
          </div>
        </div>}
      {/* Modals */}
      <ExpenseModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} onSubmit={handleExpenseSubmit} initialDate={selectedDay ? formatDateToYYYYMMDD(selectedDay) : undefined} />
      <IncomeModal isOpen={isIncomeModalOpen} onClose={() => setIsIncomeModalOpen(false)} onSubmit={handleIncomeSubmit} initialDate={selectedDay ? formatDateToYYYYMMDD(selectedDay) : undefined} />
    </div>;
};