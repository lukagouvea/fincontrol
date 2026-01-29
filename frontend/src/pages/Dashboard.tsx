// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { PlusIcon } from 'lucide-react';
import { WeeklySpending } from '../components/Dashboard/WeeklySpending';
import { CategoryPieChart } from '../components/Dashboard/CategoryPieChart';
import { MonthlyHistogram } from '../components/Dashboard/MonthlyHistogram';
import { RecentTransactions } from '../components/Dashboard/RecentTransactions';
import { WeeklyFinancialCalendar } from '../components/Dashboard/WeeklyFinancialCalendar';
import { ExpensesValueHistogram } from '../components/Dashboard/ExpensesValueHistogram';
import { ExpenseModal, ExpenseFormData } from '../components/Expenses/ExpenseModal';
import { IncomeModal, IncomeFormData } from '../components/Income/IncomeModal';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableDashboardItem } from '../components/Dashboard/SortableDashboardItem';
import { formatDateToYYYYMMDD, parseDateInputToLocal, convertDateToUTCISOString } from '../utils/dateUtils';
import { UpcomingBills } from '../components/Dashboard/UpcomingBills';
import { VariableExpense } from '../types/FinanceTypes';
import { useAddTransaction, useAddCompraParcelada } from '../hooks/useTransactions';
import { Skeleton } from '../components/Shared/Skeleton';

import { MonthlyManagementCard } from '../components/Dashboard/MonthlyManagementCard';
import { useMonthlyInvestment } from '../hooks/useInvestmentSettings';
import { getActualFixedItemAmount, isItemActiveInMonth } from '../utils/financeUtils';

// IMPORTANTE: Importamos nosso novo hook aqui
import { useDashboardFinance } from '../hooks/useDashboardFinance';

const LOCAL_STORAGE_KEY = 'dashboardLayout';

type DashboardComponentConfig = {
  id: string;
  title: string;
  span: number;
};

const defaultDashboardLayout: DashboardComponentConfig[] = [
  { id: 'weekly-calendar', title: 'Calendário Financeiro Semanal', span: 4 },
  { id: 'upcoming-bills', title: 'Contas do Mês', span: 1 },
  { id: 'category-pie', title: 'Gastos por Categoria', span: 1 },
  { id: 'expenses-histogram', title: 'Distribuição de Gastos por Valor', span: 2 },
  { id: 'weekly-spending', title: 'Gastos nos Últimos 7 dias', span: 2 },
  { id: 'monthly-histogram', title: 'Histórico de Saldo Mensal', span: 2 },
  { id: 'recent-transactions', title: 'Transações Recentes', span: 4 },
];

export const Dashboard: React.FC = () => {
  // 1. Chamada do Hook Mágico (Toda a lógica vem daqui)
  const { 
    transactions, transactionsWithoutInstallments, fixedExpenses, fixedIncomes, monthlyVariations, 
    categories, isLoading, selectedDateObject, summary 
  } = useDashboardFinance();

  const { data: investmentEffective, isLoading: isLoadingInvestment } = useMonthlyInvestment(
    selectedDateObject.getMonth(),
    selectedDateObject.getFullYear(),
  );
  const investmentMonthlyAmount = investmentEffective?.effectiveMonthlyAmount ?? 0;
  const isDashboardLoading = isLoading;

  // Gerenciamento diário usado pelo calendário semanal
  // (mesma regra do card: renda do mês - comprometido(fixos+parcelas) - investimento) / dias do mês
  const managementDaily = React.useMemo(() => {
    const year = selectedDateObject.getFullYear();
    const month = selectedDateObject.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const committedFixed = fixedExpenses
      .filter((expense) => isItemActiveInMonth(expense, selectedDateObject))
      .reduce(
        (sum, expense) =>
          sum +
          getActualFixedItemAmount(
            expense.id,
            'expense',
            year,
            month,
            expense.amount,
            monthlyVariations,
          ),
        0,
      );

    const committedInstallments = transactions
      .filter((t) => ('installmentInfo' in t && !!t.installmentInfo))
      .filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const remainingAfterInvestment = summary.monthlyIncome - (committedFixed + committedInstallments) - investmentMonthlyAmount;
    const safeRemaining = isFinite(remainingAfterInvestment) ? remainingAfterInvestment : 0;

    return daysInMonth > 0 ? safeRemaining / daysInMonth : 0;
  }, [selectedDateObject, fixedExpenses, monthlyVariations, transactions, summary.monthlyIncome, investmentMonthlyAmount]);

  // 2. Lógica de UI e Mutações (Botões e Modais continuam aqui pois interagem com o usuário)
  const addTransactionMutation = useAddTransaction();
  const addCompraParceladaMutation = useAddCompraParcelada();
  const isSaving = addTransactionMutation.isPending || addCompraParceladaMutation.isPending;

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [initialDateForModal, setInitialDateForModal] = useState<string | undefined>(undefined);

  // Lógica do Drag and Drop (Layout)
  const [dashboardComponents, setDashboardComponents] = useState<DashboardComponentConfig[]>(() => {
    try {
      const savedLayout = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      return savedLayout ? JSON.parse(savedLayout) : defaultDashboardLayout;
    } catch (error) {
      return defaultDashboardLayout;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dashboardComponents));
    } catch (error) {
      console.error("Erro ao salvar layout", error);
    }
  }, [dashboardComponents]);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDashboardComponents(items => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Handlers de formulário
  const handleAddExpenseForDate = (date: Date) => {
    setInitialDateForModal(formatDateToYYYYMMDD(date));
    setIsExpenseModalOpen(true);
  };

  const handleExpenseSubmit = (formData: ExpenseFormData) => {
    const localDateObject = parseDateInputToLocal(formData.date);
    const utcTimestamp = convertDateToUTCISOString(localDateObject);
    const mutationOptions = { onSuccess: () => setIsExpenseModalOpen(false) };

    if (formData.isInstallment && formData.installmentCount > 1) {
      addCompraParceladaMutation.mutate({
        description: formData.description,
        amount: formData.amount,
        date: utcTimestamp,
        categoryId: formData.categoryId,
        numParcelas: formData.installmentCount,
      }, mutationOptions);
    } else {
      addTransactionMutation.mutate({
        description: formData.description,
        amount: formData.amount,
        date: utcTimestamp,
        categoryId: formData.categoryId,
        isInstallment: false,
        type: 'expense'
      } as Omit<VariableExpense, 'id'>, mutationOptions);
    }
  };

  const handleIncomeSubmit = (formData: IncomeFormData) => {
    const localDateObject = parseDateInputToLocal(formData.date);
    const utcTimestamp = convertDateToUTCISOString(localDateObject);
    addTransactionMutation.mutate({
      description: formData.description,
      amount: formData.amount,
      date: utcTimestamp,
      categoryId: formData.categoryId,
      type: 'income'
    }, { onSuccess: () => setIsIncomeModalOpen(false) });
  };

  // Renderização dos Widgets
  const getComponentById = (id: string) => {
    switch (id) {
      case 'weekly-calendar':
        return (
          <WeeklyFinancialCalendar
            onAddExpense={handleAddExpenseForDate}
            transactions={transactionsWithoutInstallments}
            categories={categories}
            managementDaily={managementDaily}
          />
        );
      case 'upcoming-bills':
        return <UpcomingBills fixedExpenses={fixedExpenses} transactions={transactions} monthlyVariations={monthlyVariations} date={selectedDateObject} />;
      case 'category-pie':
        return <CategoryPieChart transactions={transactionsWithoutInstallments} categories={categories} date={selectedDateObject} monthlyVariations={monthlyVariations} />;
      case 'expenses-histogram':
        return <ExpensesValueHistogram transactions={transactionsWithoutInstallments} date={selectedDateObject} monthlyVariations={monthlyVariations}/>;
      case 'weekly-spending':
        return <WeeklySpending transactions={transactionsWithoutInstallments} />;
      case 'monthly-histogram':
        return <MonthlyHistogram transactions={transactions} categories={categories} fixedExpenses={fixedExpenses} fixedIncomes={fixedIncomes} date={selectedDateObject} monthlyVariations={monthlyVariations}/>;
      case 'recent-transactions':
        return <RecentTransactions transactions={transactions} categories={categories} date={selectedDateObject} />;
      default:
        return null;
    }
  };

  const renderWidgetContent = (config: DashboardComponentConfig) => {
    if (isDashboardLoading) {
        return (
            <div className="w-full h-full min-h-[200px] p-4 flex flex-col gap-4">
                <div className="flex justify-between">
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="flex-1 w-full rounded-lg" />
            </div>
        );
    }
    return getComponentById(config.id);
  };

  // Renderização Principal (Agora usa o objeto 'summary' do hook)
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex space-x-2">
             <button onClick={() => setIsExpenseModalOpen(true)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md flex items-center text-sm">
                <PlusIcon className="w-4 h-4 mr-2" /> Nova Despesa
             </button>
             <button onClick={() => setIsIncomeModalOpen(true)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center text-sm">
                <PlusIcon className="w-4 h-4 mr-2" /> Nova Renda
             </button>
        </div>
      </div>
      
      {/* Cards de Resumo - Usando dados limpos do summary */}
  <div id="cards" className="grid grid-cols-1 md:grid-rows-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card Renda */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-500">Renda Total do Mês</h3>
          <hr></hr>
          {isDashboardLoading ? <Skeleton className="h-8 w-40 my-1" /> : <p className="text-2xl font-bold text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.monthlyIncome)}</p>}
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <div className="flex justify-between items-center">
              <span>Rendas Fixas:</span>
              {isDashboardLoading ? <Skeleton className="h-3 w-20" /> : <span className="text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.monthlyFixedIncome)}</span>}
            </div>
            <div className="flex justify-between items-center">
              <span>Rendas Variáveis:</span>
              {isDashboardLoading ? <Skeleton className="h-3 w-20" /> : <span className="text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.monthlyVariableIncome)}</span>}
            </div>
          </div>
        </div>

        {/* Card Gerenciamento do Mês */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-500">Gerenciamento do Mês</h3>
          {isDashboardLoading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <MonthlyManagementCard
              date={selectedDateObject}
              monthlyIncome={summary.monthlyIncome}
              fixedExpenses={fixedExpenses}
              monthlyVariations={monthlyVariations}
              transactions={transactions}
              investmentMonthlyAmount={investmentMonthlyAmount}
            />
          )}
          {!isDashboardLoading && isLoadingInvestment && (
            <p className="mt-2 text-xs text-gray-500">Atualizando investimento...</p>
          )}
        </div>

        {/* Card Gastos */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <h3 className="text-sm font-medium text-gray-500">Gasto Total do Mês</h3>
          <hr></hr>
          {isDashboardLoading ? <Skeleton className="h-8 w-40 my-1" /> : <p className="text-2xl font-bold text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.monthlyExpense)}</p>}
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <div className="flex justify-between items-center">
              <span>Despesas Comprometidas:</span>
              {isDashboardLoading ? <Skeleton className="h-3 w-20" /> : <span className="text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.monthlyCommittedExpense)}</span>}
            </div>
            <div className="flex justify-between items-center">
              <span>Despesas do Mês:</span>
              {isDashboardLoading ? <Skeleton className="h-3 w-20" /> : <span className="text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.monthlyMonthExpense)}</span>}
            </div>
          </div>
        </div>

        {/* Card Saldo */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-500">Saldo do Mês</h3>
          <hr></hr>
          {isDashboardLoading ? <Skeleton className="h-8 w-40 my-1" /> : <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.balance)}</p>}
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <div className="flex justify-between items-center">
              <span>Total de Rendas:</span>
              {isDashboardLoading ? <Skeleton className="h-3 w-20" /> : <span className="text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.monthlyIncome)}</span>}
            </div>
            <div className="flex justify-between items-center">
              <span>Total de Gastos:</span>
              {isDashboardLoading ? <Skeleton className="h-3 w-20" /> : <span className="text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.monthlyExpense)}</span>}
            </div>
          </div>
        </div>
      </div>
      
      {/* GRID COM DRAG AND DROP */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={dashboardComponents.map(item => item.id)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-4 gap-6">
            {dashboardComponents.map(config => (
              <SortableDashboardItem key={config.id} id={config.id} title={config.title} span={config.span}>
                {renderWidgetContent(config)}
              </SortableDashboardItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      {/* Modais */}
      <ExpenseModal 
        isOpen={isExpenseModalOpen} 
        onClose={() => {
          setIsExpenseModalOpen(false);
          setInitialDateForModal(undefined);
        }}
        onSubmit={handleExpenseSubmit}
        initialDate={initialDateForModal}
        isLoading={isSaving}
      />
      <IncomeModal 
        isOpen={isIncomeModalOpen} 
        onClose={() => setIsIncomeModalOpen(false)}
        onSubmit={handleIncomeSubmit}
        isLoading={isSaving}
      />
    </div>
  );
};