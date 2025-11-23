import React, { useMemo, useState } from 'react';
import { CategoryPieChart } from '../../components/Dashboard/CategoryPieChart';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableDashboardItem } from '../../components/Dashboard/SortableDashboardItem';
import { ExpensesValueHistogram } from '../../components/Dashboard/ExpensesValueHistogram';
import { formatUTCToDDMMAAAA, parseDateInputToLocal } from '../../utils/dateUtils';
import { getActualFixedItemAmount, isItemActiveInMonth } from '../../utils/financeUtils';
import { useTransactions, usePrefetchAdjacentMonths } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { useFixedExpenses } from '../../hooks/useFixedTransactions';
import { useMonthlyVariations } from '../../hooks/useMonthlyVariations';
import { Skeleton } from '../../components/Shared/Skeleton';

type DashboardComponentInfo = {
  id: string;
  title: string;
  span: number;
};

export const ExpenseHistory: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Busca dados (Idealmente o useTransactions deveria receber o mês/ano, mas mantemos o filtro client-side por segurança)
  const { data: transactions = [], isLoading: isLoadingTransactions } = useTransactions(selectedMonth, selectedYear);
  const { data: categories = [], isLoading: isLoadingCategories } = useCategories();
  const { data: fixedExpenses = [], isLoading: isLoadingFixedExpenses } = useFixedExpenses();
  const { data: monthlyVariations = [], isLoading: isLoadingMonthlyVariations } = useMonthlyVariations();

  usePrefetchAdjacentMonths(selectedMonth, selectedYear);
  const isLoading = isLoadingCategories || isLoadingFixedExpenses || isLoadingTransactions || isLoadingMonthlyVariations;

  

  const selectedDateObject = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 1);
  }, [selectedMonth, selectedYear]);

  const [dashboardOrder, setDashboardOrder] = useState<DashboardComponentInfo[]>([
    { id: 'category-pie', title: 'Gastos por Categoria', span: 1 },
    { id: 'expenses-histogram', title: 'Distribuição de Gastos por Valor', span: 1 },
  ]);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDashboardOrder(items => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const getFixedExpenseDate = (expense: { day: number }) => {
    const date = new Date(selectedYear, selectedMonth, expense.day);
    return date.toISOString().split('T')[0];
  }

  // --- 1. PROCESSAMENTO DE DESPESAS FIXAS ---
  const monthlyFixedExpense = useMemo(() => {
    return fixedExpenses
      .filter(expense => isItemActiveInMonth(expense, selectedDateObject))
      .map(expense => ({
        ...expense,
        date: getFixedExpenseDate(expense),
        // Busca o valor real (com variação se houver)
        actualAmount: getActualFixedItemAmount(expense.id, 'expense', selectedYear, selectedMonth, expense.amount, monthlyVariations)
      }));
  }, [fixedExpenses, selectedDateObject, selectedYear, selectedMonth, monthlyVariations]);

  // --- 2. PROCESSAMENTO DE DESPESAS VARIÁVEIS ---
  const monthlyVariableExpense = useMemo(() => {
    return transactions.filter(t => {
        // Filtra por Data
        const tDate = parseDateInputToLocal(t.date.split('T')[0]);
        const isSameMonth = tDate.getMonth() === selectedMonth && tDate.getFullYear() === selectedYear;
        
        // Filtra por Tipo (Despesa)
        const isExpense = t.type === 'expense';

        // Filtra Variações de Fixas (elas já estão na lista de fixas acima)
        const isNotFixedVariation = !t.recurringRuleId;

        return isSameMonth && isExpense && isNotFixedVariation;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedMonth, selectedYear]);

  // --- 3. LISTA UNIFICADA (Para Gráficos) ---
  const allExpensesForCharts = useMemo(() => {
      // Normaliza fixas para parecerem transações
      const fixedAsTrans = monthlyFixedExpense.map(f => ({
          id: f.id,
          description: f.description,
          amount: f.actualAmount,
          date: f.date,
          categoryId: f.categoryId,
          type: 'expense' as const
      }));
      return [...monthlyVariableExpense, ...fixedAsTrans];
  }, [monthlyFixedExpense, monthlyVariableExpense]);

  // Totais
  const variableTotal = monthlyVariableExpense.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const fixedTotal = monthlyFixedExpense.reduce((sum, expense) => sum + Number(expense.actualAmount), 0);
  const total = variableTotal + fixedTotal;

  // Agrupar por categoria
  const expensesByCategory = useMemo(() => {
    return categories.filter(cat => cat.type === 'expense').map(category => {
      // Variáveis desta categoria
      const categoryVarExpenses = monthlyVariableExpense.filter(exp => exp.categoryId === category.id);
      const varTotal = categoryVarExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
      
      // Fixas desta categoria
      const categoryFixExpenses = monthlyFixedExpense.filter(exp => exp.categoryId === category.id);
      const fixTotal = categoryFixExpenses.reduce((sum, exp) => sum + Number(exp.actualAmount), 0);
      
      const catTotal = varTotal + fixTotal;
      const count = categoryVarExpenses.length + categoryFixExpenses.length;

      return {
        category,
        total: catTotal,
        count,
        fixedCount: categoryFixExpenses.length,
        variableCount: categoryVarExpenses.length
      };
    }).filter(item => item.total > 0).sort((a, b) => b.total - a.total);
  }, [categories, monthlyVariableExpense, monthlyFixedExpense]);

  // Helpers
  const formatValue = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const getCategory = (categoryId: string) => categories.find(c => c.id === categoryId);
  
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const componentsMap: Record<string, React.ReactNode> = {
    'category-pie': (
      <CategoryPieChart
        transactions={allExpensesForCharts as any}
        categories={expensesByCategory.map(item => item.category)}
        date={selectedDateObject}
        monthlyVariations={monthlyVariations}
      />
    ),
    'expenses-histogram': (
      <ExpensesValueHistogram
        transactions={allExpensesForCharts as any}
        date={selectedDateObject}
        monthlyVariations={monthlyVariations}
      />
    ),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Histórico de Despesas</h1>
        <div className="flex space-x-2">
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            {months.map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. Resumo por Categoria */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Resumo por Categoria</h2>
        
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center w-full">
                  <Skeleton className="w-4 h-4 rounded-full mr-3 shrink-0" />
                  <div className="space-y-1 w-full">
                     <Skeleton className="w-32 h-4" />
                     <Skeleton className="w-20 h-3" />
                  </div>
                </div>
                <Skeleton className="w-20 h-4" />
              </div>
            ))}
          </div>
        ) : expensesByCategory.length > 0 ? (
          <div className="space-y-3">
            {expensesByCategory.map(({ category, total, count, fixedCount, variableCount }) => (
              <div key={category.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: category.color }}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{category.name}</p>
                    <p className="text-xs text-gray-500">
                      {count} transação(ões)
                      {fixedCount > 0 && variableCount > 0 && <span> ({fixedCount} fixa, {variableCount} var)</span>}
                      {fixedCount > 0 && variableCount === 0 && <span> (todas fixas)</span>}
                      {fixedCount === 0 && variableCount > 0 && <span> (todas variáveis)</span>}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-900">{formatValue(total)}</p>
              </div>
            ))}
            <div className="pt-3 border-t border-gray-200 flex justify-between">
              <p className="text-sm font-bold text-gray-900">Total</p>
              <p className="text-sm font-bold text-red-600">{formatValue(total)}</p>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Despesas Fixas:</span>
              <span>{formatValue(fixedTotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Despesas Variáveis:</span>
              <span>{formatValue(variableTotal)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nenhuma despesa neste período.</p>
        )}
      </div>

      {/* 2. Lista de Transações */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Transações</h2>
        </div>
        
        {isLoading ? (
           <div className="p-4">
             <Skeleton className="w-full h-40" />
           </div>
        ) : (monthlyVariableExpense.length > 0 || monthlyFixedExpense.length > 0) ? (
          <>
            {/* Tabela Fixas */}
            {monthlyFixedExpense.length > 0 && (
              <>
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700">Despesas Fixas</h3>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dia</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyFixedExpense.map(expense => {
                      const category = getCategory(expense.categoryId);
                      const hasVariation = expense.actualAmount !== expense.amount;
                      return (
                        <tr key={`fixed-${expense.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {expense.description}
                            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Fixa</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {category ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${category.color}20`, color: category.color }}>{category.name}</span> : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Dia {expense.day}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className={`${hasVariation ? 'text-blue-600' : 'text-red-600'}`}>{formatValue(expense.actualAmount)}</div>
                            {hasVariation && <div className="text-xs text-gray-500">Padrão: {formatValue(expense.amount)}</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

            {/* Tabela Variáveis */}
            {monthlyVariableExpense.length > 0 && (
              <>
                <div className="px-6 py-3 bg-gray-50 border-t border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700">Despesas Variáveis</h3>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyVariableExpense.map(expense => {
                      const category = getCategory(expense.categoryId);
                      return (
                        <tr key={expense.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatUTCToDDMMAAAA(expense.date)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {expense.description}
                            {/* Se for parcela, mostramos (X/Y) */}
                            {'installmentInfo' in expense && expense.installmentInfo && (
                                <span className="ml-2 text-xs text-gray-500">
                                    ({expense.installmentInfo.current}/{expense.installmentInfo.total})
                                </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {category ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${category.color}20`, color: category.color }}>{category.name}</span> : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">{formatValue(expense.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">Nenhuma despesa neste período.</div>
        )}
      </div>

      {/* 3. Gráficos com DnD */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={dashboardOrder.map(item => item.id)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dashboardOrder.map(item => (
              <SortableDashboardItem key={item.id} id={item.id} title={item.title} span={item.span}>
                {isLoading ? (
                   <div className="w-full h-full min-h-[200px] p-4 flex flex-col gap-4">
                      <div className="flex justify-between"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-6 w-16" /></div>
                      <Skeleton className="flex-1 w-full rounded-lg" />
                   </div>
                ) : (
                   componentsMap[item.id]
                )}
              </SortableDashboardItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};