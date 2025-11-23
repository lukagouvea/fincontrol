import React, { useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XIcon, PlusIcon } from 'lucide-react';
import { Transaction, VariableExpense } from '../types/FinanceTypes';
import { ExpenseFormData, ExpenseModal } from '../components/Expenses/ExpenseModal';
import { IncomeFormData, IncomeModal } from '../components/Income/IncomeModal';
import { areSameDay, convertDateToUTCISOString, formatDateToYYYYMMDD, parseDateInputToLocal } from '../utils/dateUtils';
import { getActualFixedItemAmount } from '../utils/financeUtils';
import { useCategories } from '../hooks/useCategories';
import { useMonthlyVariations } from '../hooks/useMonthlyVariations';
import { useThreeMonthsTransactions, useAddTransaction, useAddCompraParcelada } from '../hooks/useTransactions';
import { useFixedIncomes, useFixedExpenses } from '../hooks/useFixedTransactions';
import { Skeleton } from '../components/Shared/Skeleton';

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
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);

  const { data: transactions = [], isLoading: isLoadingTransactions } = useThreeMonthsTransactions(selectedMonth, selectedYear);
  const { data: categories = [], isLoading: isLoadingCategories } = useCategories();
  const { data: fixedExpenses = [], isLoading: isLoadingFixedExpenses } = useFixedExpenses();
  const { data: fixedIncomes = [], isLoading: isLoadingFixedIncomes } = useFixedIncomes();
  const { data: monthlyVariations = [], isLoading: isLoadingMonthlyVariations } = useMonthlyVariations();

  const isLoading = isLoadingCategories || isLoadingFixedExpenses || isLoadingTransactions || isLoadingFixedExpenses || isLoadingFixedIncomes || isLoadingMonthlyVariations;

  const addCompraParceladaMutation = useAddCompraParcelada();
  const addTransactionMutation = useAddTransaction();

  const isSaving = addTransactionMutation.isPending || addCompraParceladaMutation.isPending;

  

  useEffect(() => {
    const days = generateCalendarDays(currentDate);
    setCalendarDays(days);
  }, [currentDate]);

  const generateCalendarDays = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
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

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
    setSelectedMonth(newDate.getMonth());
    setSelectedYear(newDate.getFullYear());
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
    setSelectedMonth(newDate.getMonth());
    setSelectedYear(newDate.getFullYear());
    setSelectedDay(null);
  };

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const formatDayOfMonth = (date: Date): string => {
    return date.getDate().toString();
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
  };

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
  };

  const handleExpenseSubmit = (formData: ExpenseFormData) => {
    const localDateObject = parseDateInputToLocal(formData.date);
    const utcTimestamp = convertDateToUTCISOString(localDateObject);

    const mutationOptions = {
      onSuccess: () => setIsExpenseModalOpen(false)
    };

    if (formData.isInstallment && formData.installmentCount > 1) {
      const compraParcelada = {
        description: formData.description,
        amount: formData.amount,
        date: utcTimestamp,
        categoryId: formData.categoryId,
        numParcelas: formData.installmentCount,
      };
      addCompraParceladaMutation.mutate(compraParcelada, mutationOptions);
    } else {
      addTransactionMutation.mutate({
        description: formData.description,
        amount: formData.amount,
        date: utcTimestamp,
        categoryId: formData.categoryId,
        isInstallment: false,
        type: 'expense',
      } as Omit<VariableExpense, 'id'>, mutationOptions);
    }
  };

  const handleIncomeSubmit = (formData: IncomeFormData) => {
    const localDateObject = parseDateInputToLocal(formData.date);
    const utcTimestamp = convertDateToUTCISOString(localDateObject);

    const mutationOptions = {
      onSuccess: () => setIsIncomeModalOpen(false)
    };

    addTransactionMutation.mutate({
      description: formData.description,
      amount: formData.amount,
      date: utcTimestamp,
      categoryId: formData.categoryId,
      type: 'income' // FIX: Obrigatório para ser Renda
    } as Omit<Transaction, 'id'>, mutationOptions);
  };

  const getTransactionsForDate = (date: Date) => {
    // 1. Filtra transações do dia
    return transactions.filter(t => {
      // Exibe tanto Renda quanto Despesa, DESDE QUE não seja variação de fixa
      const isNotFixedVariation = !t.recurringRuleId;
      return isNotFixedVariation && areSameDay(t.date, date);
    }).map(t => {
      const category = categories.find(c => 'categoryId' in t && c.id === t.categoryId);
      
      // FIX: Usa o campo 'type' do banco para decidir se é despesa
      const isExpense = t.type === 'expense'; 

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

  const getFixedExpensesForDate = (date: Date) => {
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    return fixedExpenses.filter(expense => {
      const startDate = new Date(expense.startDate);
      const endDate = expense.endDate ? new Date(expense.endDate) : null;
      if (endDate && date > endDate) return false;
      if (date < startDate) return false;
      return expense.day === day;
    }).map(expense => {
      const category = categories.find(c => c.id === expense.categoryId);
      const actualAmount = getActualFixedItemAmount(expense.id, 'expense', year, month, expense.amount, monthlyVariations);
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

  const getFixedIncomesForDate = (date: Date) => {
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    return fixedIncomes.filter(income => {
      const startDate = new Date(income.startDate);
      const endDate = income.endDate ? new Date(income.endDate) : null;
      if (endDate && date > endDate) return false;
      if (date < startDate) return false;
      return income.day === day;
    }).map(income => {
      const actualAmount = getActualFixedItemAmount(income.id, 'income', year, month, income.amount, monthlyVariations);
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
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
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

  const dayOfWeekHeaders = () => {
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return weekDays.map((day, index) => (
      <div key={`header-${index}`} className="text-center text-sm font-medium text-gray-600">
        {day}
      </div>
    ));
  };

  return (
    <div className="space-y-6">
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
          {dayOfWeekHeaders()}
          
          {/* GRID DE DIAS */}
          {isLoading ? (
            // SKELETON
            Array.from({ length: 42 }).map((_, index) => (
              <div key={`skeleton-day-${index}`} className="border border-gray-100 rounded-lg p-2 h-[120px]">
                <div className="flex justify-between mb-2">
                  <Skeleton className="w-6 h-6 rounded-full" /> 
                  <Skeleton className="w-12 h-3" /> 
                </div>
                <div className="space-y-1 mt-2">
                   <Skeleton className="w-full h-4 rounded" />
                   <Skeleton className="w-3/4 h-4 rounded" />
                </div>
              </div>
            ))
          ) : (
            // DIAS REAIS
            calendarDays.map((day, index) => {
              // Se estiver carregando, não tenta calcular eventos para não quebrar
              const events = isLoading ? [] : getEventsForDate(day);
              const balance = isLoading ? 0 : getBalanceForDate(day);
              const isSelected = selectedDay && day.getTime() === selectedDay.getTime();

              return (
                <div 
                  key={`day-${index}`} 
                  className={`border rounded-lg p-2 h-[120px] overflow-hidden cursor-pointer transition-all
                    ${isToday(day) ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}
                    ${!isCurrentMonth(day) ? 'opacity-40' : ''}
                    ${isSelected ? 'ring-2 ring-blue-500 border-transparent' : ''}
                    hover:border-blue-300 hover:shadow-sm`} 
                  onClick={() => handleDayClick(day)}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${isToday(day) ? 'bg-blue-600 text-white' : isSelected ? 'bg-blue-200 text-blue-800' : 'text-gray-700'}`}>
                      {formatDayOfMonth(day)}
                    </span>
                    {events.length > 0 && (
                      <span className={`text-xs font-medium ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(balance)}
                      </span>
                    )}
                  </div>
                  
                  {events.length > 0 ? (
                    <div className="space-y-1 overflow-hidden max-h-[80px]">
                      {events.slice(0, 2).map((evt) => {
                        const event = evt as CalendarEventDisplay;
                        return (
                          <div key={`${event.id}-${event.isFixed ? 'fixed' : 'var'}`} className="bg-gray-50 p-1 rounded text-xs hover:bg-gray-100">
                            <div className="font-medium text-gray-800 truncate text-xs">
                              {event.description}
                              {'isFixed' in event && event.isFixed && <span className="text-[9px] ml-1 text-gray-500">(Fixo)</span>}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] rounded-full px-1 py-0.5 truncate max-w-[60px]" style={{
                                backgroundColor: `${event.categoryColor}20`,
                                color: event.categoryColor
                              }}>
                                {event.category}
                              </span>
                              <span className={`text-[10px] font-medium ${'hasVariation' in event && event.hasVariation ? 'text-blue-600' : event.isExpense ? 'text-red-600' : 'text-green-600'}`}>
                                {event.isExpense ? '-' : '+'} {formatCurrency(event.amount)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {events.length > 2 && (
                        <div className="text-[10px] font-medium text-gray-600 pt-1">
                          +{events.length - 2} mais
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-gray-400">
                      {isCurrentMonth(day) ? 'Sem transações' : ''}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DETALHES DO DIA */}
      {selectedDay && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-700">
              Detalhes do dia {selectedDay.toLocaleDateString('pt-BR')}
            </h3>
            <div className="flex items-center space-x-2">
              <button onClick={() => handleAddIncome(selectedDay)} className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                <PlusIcon size={14} /> <span>Renda</span>
              </button>
              <button onClick={() => handleAddExpense(selectedDay)} className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">
                <PlusIcon size={14} /> <span>Despesa</span>
              </button>
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-red-500">
                <XIcon size={20} />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
                <Skeleton className="w-full h-20" />
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Saldo do dia</span>
                  <span className={`font-bold ${getBalanceForDate(selectedDay) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(getBalanceForDate(selectedDay))}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                {getTransactionsForDate(selectedDay).length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Transações</h4>
                    <div className="space-y-2">
                      {getTransactionsForDate(selectedDay).map(event => (
                        <div key={event.id} className="p-3 border border-gray-200 rounded-lg">
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
                              {event.isExpense ? '-' : '+'} {formatCurrency(event.amount)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Seções de fixas mantidas */}
                {getFixedExpensesForDate(selectedDay).length > 0 && (
                    <div>
                        <h4 className="font-medium text-gray-700 mb-2">Despesas Fixas</h4>
                        {getFixedExpensesForDate(selectedDay).map(e => (
                            <div key={e.id} className="p-3 border border-gray-200 rounded-lg bg-red-50 mb-2">
                                <div className="flex justify-between">
                                    <span>{e.description}</span>
                                    <span className="text-red-600 font-bold">-{formatCurrency(e.amount)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {getFixedIncomesForDate(selectedDay).length > 0 && (
                    <div>
                        <h4 className="font-medium text-gray-700 mb-2">Rendas Fixas</h4>
                        {getFixedIncomesForDate(selectedDay).map(e => (
                            <div key={e.id} className="p-3 border border-gray-200 rounded-lg bg-green-50 mb-2">
                                <div className="flex justify-between">
                                    <span>{e.description}</span>
                                    <span className="text-green-600 font-bold">+{formatCurrency(e.amount)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {getEventsForDate(selectedDay).length === 0 && (
                  <div className="py-8 text-center text-gray-500">
                    Nenhuma transação registrada para este dia.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <ExpenseModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} onSubmit={handleExpenseSubmit} initialDate={selectedDay ? formatDateToYYYYMMDD(selectedDay) : undefined} isLoading={isSaving} />
      <IncomeModal isOpen={isIncomeModalOpen} onClose={() => setIsIncomeModalOpen(false)} onSubmit={handleIncomeSubmit} initialDate={selectedDay ? formatDateToYYYYMMDD(selectedDay) : undefined} isLoading={isSaving} />
    </div>
  );
};