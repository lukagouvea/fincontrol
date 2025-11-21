import React, { useMemo, useState } from 'react';
import { CategoryPieChart } from '../../components/Dashboard/CategoryPieChart';
import { useFinance } from '../../context/FinanceContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableDashboardItem } from '../../components/Dashboard/SortableDashboardItem';
import { ExpensesValueHistogram } from '../../components/Dashboard/ExpensesValueHistogram';
import { formatUTCToDDMMAAAA, parseDateInputToLocal } from '../../utils/dateUtils';
import { isItemActiveInMonth } from '../../utils/financeUtils';

type DashboardComponentInfo = {
  id: string;
  title: string;
  span: number;
};

export const MonthlyReport: React.FC = () => {
  const {
    transactions,
    fixedExpenses,
    fixedIncomes,
    categories,
    getActualFixedItemAmount
  } = useFinance();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Objeto de data base para o mês selecionado
  const selectedDateObject = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 1);
  }, [selectedMonth, selectedYear]);

  // Estado para ordenação dos gráficos de despesa
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

  // --- CÁLCULOS DE DADOS ---

  const { 
    monthlyIncomeData, 
    monthlyExpenseData, 
    totals,
    incomesByCategory,
    expensesByCategory 
  } = useMemo(() => {
    const anoAtual = selectedDateObject.getFullYear();
    const mesAtual = selectedDateObject.getMonth(); // 0-11
    
    // Helper para gerar string de data UTC para itens fixos naquele mês
    const getFixedItemDate = (day: number) => {
        const date = new Date(Date.UTC(anoAtual, mesAtual, day));
        return date.toISOString();
    };

    // --- 1. PROCESSAMENTO DE RENDAS ---
    const variableIncomes = transactions.filter(t => {
        if ('isInstallment' in t) return false; // Ignora despesas
        const tDate = parseDateInputToLocal(t.date.split('T')[0]);
        return tDate.getMonth() === mesAtual && tDate.getFullYear() === anoAtual;
    });

    const fixedIncomesList = fixedIncomes
        .filter(income => isItemActiveInMonth(income, selectedDateObject))
        .map(income => ({
            ...income,
            date: getFixedItemDate(income.day),
            actualAmount: getActualFixedItemAmount(income.id, 'income', anoAtual, mesAtual, income.amount)
        }));

    const totalVariableIncome = variableIncomes.reduce((sum, t) => sum + t.amount, 0);
    const totalFixedIncome = fixedIncomesList.reduce((sum, t) => sum + t.actualAmount, 0);
    const totalIncome = totalVariableIncome + totalFixedIncome;

    // Agrupamento de Rendas por Categoria
    const groupedIncomes = categories.filter(cat => cat.type === 'income').map(category => {
        const catVariable = variableIncomes.filter(t => t.categoryId === category.id);
        // Rendas fixas normalmente não têm categoria no modelo antigo, mas se tiverem:
        const catFixed = fixedIncomesList.filter(t => t.categoryId === category.id); 
        // Fallback: Se 'Salário' for uma categoria especial sem ID na fixa
        const isSalaryCat = category.name === 'Salário'; 
        
        const totalVar = catVariable.reduce((sum, t) => sum + t.amount, 0);
        const totalFix = catFixed.reduce((sum, t) => sum + t.actualAmount, 0) + (isSalaryCat && catFixed.length === 0 ? totalFixedIncome : 0); // Lógica simplificada

        return {
            category,
            total: totalVar + totalFix,
            count: catVariable.length + catFixed.length,
            fixedCount: catFixed.length,
            variableCount: catVariable.length
        };
    }).filter(item => item.total > 0).sort((a, b) => b.total - a.total);


    // --- 2. PROCESSAMENTO DE DESPESAS ---
    const variableExpenses = transactions.filter(t => {
        if (!('isInstallment' in t)) return false; // Ignora rendas
        const tDate = parseDateInputToLocal(t.date.split('T')[0]);
        return tDate.getMonth() === mesAtual && tDate.getFullYear() === anoAtual;
    });

    const fixedExpensesList = fixedExpenses
        .filter(expense => isItemActiveInMonth(expense, selectedDateObject))
        .map(expense => ({
            ...expense,
            date: getFixedItemDate(expense.day),
            actualAmount: getActualFixedItemAmount(expense.id, 'expense', anoAtual, mesAtual, expense.amount)
        }));

    const totalVariableExpense = variableExpenses.reduce((sum, t) => sum + t.amount, 0);
    const totalFixedExpense = fixedExpensesList.reduce((sum, t) => sum + t.actualAmount, 0);
    const totalExpense = totalVariableExpense + totalFixedExpense;

    // Lista unificada para gráficos
    const allExpensesForCharts = [...variableExpenses, ...fixedExpensesList.map(f => ({...f, amount: f.actualAmount, isInstallment: false}))];

    // Agrupamento de Despesas por Categoria
    const groupedExpenses = categories.filter(cat => cat.type === 'expense').map(category => {
        const catVariable = variableExpenses.filter(t => t.categoryId === category.id);
        const catFixed = fixedExpensesList.filter(t => t.categoryId === category.id);
        
        const totalVar = catVariable.reduce((sum, t) => sum + t.amount, 0);
        const totalFix = catFixed.reduce((sum, t) => sum + t.actualAmount, 0);

        return {
            category,
            total: totalVar + totalFix,
            count: catVariable.length + catFixed.length,
            fixedCount: catFixed.length,
            variableCount: catVariable.length
        };
    }).filter(item => item.total > 0).sort((a, b) => b.total - a.total);

    return {
        monthlyIncomeData: { variable: variableIncomes, fixed: fixedIncomesList, sorted: [...variableIncomes, ...fixedIncomesList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) },
        monthlyExpenseData: { variable: variableExpenses, fixed: fixedExpensesList, sorted: [...variableExpenses, ...fixedExpensesList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), allForCharts: allExpensesForCharts },
        totals: { income: totalIncome, expense: totalExpense, balance: totalIncome - totalExpense },
        incomesByCategory: groupedIncomes,
        expensesByCategory: groupedExpenses
    };

  }, [selectedDateObject, transactions, fixedIncomes, fixedExpenses, categories, getActualFixedItemAmount]);


  // Helpers de Formatação
  const formatValue = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const getCategory = (categoryId: string) => categories.find(c => c.id === categoryId);

  // Mapas de Componentes para o DnD
  const componentsMap: Record<string, React.ReactNode> = {
    'category-pie': (
      <CategoryPieChart
        transactions={monthlyExpenseData.allForCharts as any} // Ajuste de tipo se necessário, ou passar array unificado
        categories={categories}
        date={selectedDateObject}
      />
    ),
    'expenses-histogram': (
      <ExpensesValueHistogram
        transactions={monthlyExpenseData.allForCharts as any}
        date={selectedDateObject}
      />
    ),
  };

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-8">
      {/* Cabeçalho e Filtros */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Relatório Mensal Unificado</h1>
        <div className="flex space-x-2">
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500">
            {months.map((month, index) => <option key={index} value={index}>{month}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500">
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-500">Receitas do Mês</h3>
          <p className="text-2xl font-bold text-green-600">{formatValue(totals.income)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <h3 className="text-sm font-medium text-gray-500">Despesas do Mês</h3>
          <p className="text-2xl font-bold text-red-600">{formatValue(totals.expense)}</p>
        </div>
        <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${totals.balance >= 0 ? 'border-blue-500' : 'border-red-600'}`}>
          <h3 className="text-sm font-medium text-gray-500">Saldo Líquido</h3>
          <p className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatValue(totals.balance)}</p>
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* ================= SEÇÃO DE RECEITAS ================= */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-700 flex items-center">
            <span className="w-2 h-6 bg-green-500 rounded mr-2"></span>
            Detalhamento de Receitas
        </h2>
        
        {/* Resumo por Categoria de Receitas */}
        <div className="bg-white shadow rounded-lg p-6">
           <h3 className="text-md font-medium text-gray-600 mb-4">Por Categoria</h3>
           {incomesByCategory.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {incomesByCategory.map(({ category, total, count }) => (
                 <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: category.color || '#10B981' }}></div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">{category.name}</p>
                            <p className="text-xs text-gray-500">{count} transações</p>
                        </div>
                    </div>
                    <span className="text-sm font-bold text-green-600">{formatValue(total)}</span>
                 </div>
               ))}
             </div>
           ) : <p className="text-gray-500 text-sm">Nenhuma receita registrada.</p>}
        </div>

        {/* Tabela de Receitas (Fixas + Variáveis) */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700">Transações de Entrada</h3>
            </div>
            {monthlyIncomeData.sorted.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {monthlyIncomeData.sorted.map((t: any) => (
                            <tr key={t.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatUTCToDDMMAAAA(t.date)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold">{formatValue(t.actualAmount ?? t.amount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                    {t.day ? <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Fixa</span> : 'Variável'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : <div className="p-6 text-center text-gray-500 text-sm">Nenhuma transação encontrada.</div>}
        </div>
      </section>

      <hr className="border-gray-200" />

      {/* ================= SEÇÃO DE DESPESAS ================= */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-700 flex items-center">
            <span className="w-2 h-6 bg-red-500 rounded mr-2"></span>
            Detalhamento de Despesas
        </h2>

        {/* Gráficos de Despesas (Reutilizando o DnD) */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={dashboardOrder.map(item => item.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dashboardOrder.map(config => (
                <SortableDashboardItem key={config.id} id={config.id} title={config.title} span={config.span}>
                    {componentsMap[config.id]}
                </SortableDashboardItem>
                ))}
            </div>
            </SortableContext>
        </DndContext>

        {/* Resumo por Categoria de Despesas */}
        <div className="bg-white shadow rounded-lg p-6">
           <h3 className="text-md font-medium text-gray-600 mb-4">Por Categoria</h3>
           {expensesByCategory.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {expensesByCategory.map(({ category, total, count }) => (
                 <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border-l-4" style={{ borderLeftColor: category.color }}>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-700">{category.name}</span>
                        <span className="text-xs text-gray-500">{count} itens</span>
                    </div>
                    <span className="text-sm font-bold text-red-600">{formatValue(total)}</span>
                 </div>
               ))}
             </div>
           ) : <p className="text-gray-500 text-sm">Nenhuma despesa registrada.</p>}
        </div>

         {/* Tabela de Despesas (Fixas + Variáveis) */}
         <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700">Transações de Saída</h3>
            </div>
            {monthlyExpenseData.sorted.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {monthlyExpenseData.sorted.map((t: any) => {
                             const cat = getCategory(t.categoryId);
                             return (
                                <tr key={t.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatUTCToDDMMAAAA(t.date)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {t.description}
                                        {t.installmentInfo && <span className="text-xs text-gray-400 ml-1">({t.installmentInfo.current}/{t.installmentInfo.total})</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {cat ? <span className="px-2 py-0.5 rounded-full text-xs" style={{backgroundColor: `${cat.color}20`, color: cat.color}}>{cat.name}</span> : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">{formatValue(t.actualAmount ?? t.amount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                        {t.day ? <span className="bg-red-50 text-red-800 px-2 py-0.5 rounded-full">Fixa</span> : 'Variável'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : <div className="p-6 text-center text-gray-500 text-sm">Nenhuma transação encontrada.</div>}
        </div>

      </section>
    </div>
  );
};