import React, { useMemo, useState } from 'react';
import { formatUTCToDDMMAAAA, parseDateInputToLocal } from '../../utils/dateUtils';
import { isItemActiveInMonth, getActualFixedItemAmount } from '../../utils/financeUtils';
import { useTransactions, usePrefetchAdjacentMonths } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { useFixedIncomes } from '../../hooks/useFixedTransactions';
import { useMonthlyVariations } from '../../hooks/useMonthlyVariations';
import { Skeleton } from '../../components/Shared/Skeleton';

export const IncomeHistory: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: transactions = [], isLoading: isLoadingTransactions } = useTransactions(selectedMonth, selectedYear);
  const { data: categories = [], isLoading: isLoadingCategories } = useCategories();
  const { data: fixedIncomes = [], isLoading: isLoadingFixedIncomes } = useFixedIncomes();
  const { data: monthlyVariations = [], isLoading: isLoadingMonthlyVariations } = useMonthlyVariations();

  const isLoading = isLoadingCategories || isLoadingFixedIncomes || isLoadingTransactions || isLoadingMonthlyVariations;
  
  usePrefetchAdjacentMonths(selectedMonth, selectedYear);

  const selectedDateObject = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 1);
  }, [selectedMonth, selectedYear]);

  const getFixedExpenseDate = (expense: { day: number }) => {
    const date = new Date(selectedYear, selectedMonth, expense.day);
    return date.toISOString().split('T')[0];
  }

  // --- 1. PROCESSAMENTO DE RENDAS FIXAS ---
  const monthlyFixedIncome = useMemo(() => {
    return fixedIncomes
      .filter(income => isItemActiveInMonth(income, selectedDateObject))
      .map(income => ({
        ...income,
        date: getFixedExpenseDate(income),
        // Busca o valor real (com variação se houver)
        actualAmount: getActualFixedItemAmount(income.id, 'income', selectedYear, selectedMonth, income.amount, monthlyVariations)
      }));
  }, [fixedIncomes, selectedDateObject, selectedYear, selectedMonth, monthlyVariations]);

  // --- 2. PROCESSAMENTO DE RENDAS VARIÁVEIS ---
  const monthlyVariableIncome = useMemo(() => {
    return transactions.filter(t => {
        const tDate = parseDateInputToLocal(t.date.split('T')[0]);
        const isSameMonth = tDate.getMonth() === selectedMonth && tDate.getFullYear() === selectedYear;
        
        // Filtra apenas RENDAS
        const isIncome = t.type === 'income';

        // Filtra Variações de Fixas (para não duplicar com a lista acima)
        const isNotFixedVariation = !t.recurringRuleId;

        return isSameMonth && isIncome && isNotFixedVariation;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedMonth, selectedYear]);

  // Totais
  const variableTotal = monthlyVariableIncome.reduce((sum, income) => sum + Number(income.amount), 0);
  const fixedTotal = monthlyFixedIncome.reduce((sum, income) => sum + Number(income.actualAmount), 0);
  const total = variableTotal + fixedTotal;

  // Agrupar por categoria
  const incomesByCategory = useMemo(() => {
    return categories.filter(cat => cat.type === 'income').map(category => {
      // Rendas variáveis desta categoria
      const categoryVarIncomes = monthlyVariableIncome.filter(inc => inc.categoryId === category.id);
      const varTotal = categoryVarIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
      
      // Rendas fixas desta categoria (Agora usamos o ID real do banco)
      const categoryFixIncomes = monthlyFixedIncome.filter(inc => inc.categoryId === category.id);
      const fixTotal = categoryFixIncomes.reduce((sum, inc) => sum + Number(inc.actualAmount), 0);
      
      const catTotal = varTotal + fixTotal;
      const count = categoryVarIncomes.length + categoryFixIncomes.length;

      return {
        category,
        total: catTotal,
        count,
        fixedCount: categoryFixIncomes.length,
        variableCount: categoryVarIncomes.length
      };
    }).filter(item => item.total > 0).sort((a, b) => b.total - a.total);
  }, [categories, monthlyVariableIncome, monthlyFixedIncome]);

  // Helpers
  const formatValue = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const getCategory = (categoryId?: string) => categories.find(c => c.id === categoryId);
  
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear + 2 - i);

  return (
    <div className="space-y-6">
      {/* Header sempre visível */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Histórico de Rendas</h1>
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
            <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                <Skeleton className="w-16 h-4" />
                <Skeleton className="w-24 h-5" />
            </div>
          </div>
        ) : incomesByCategory.length > 0 ? (
          <div className="space-y-3">
            {incomesByCategory.map(({ category, total, count, fixedCount, variableCount }) => (
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
              <p className="text-sm font-bold text-green-600">{formatValue(total)}</p>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Rendas Fixas:</span>
              <span>{formatValue(fixedTotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Rendas Variáveis:</span>
              <span>{formatValue(variableTotal)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nenhuma renda neste período.</p>
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
        ) : (monthlyVariableIncome.length > 0 || monthlyFixedIncome.length > 0) ? (
          <>
            {/* Seção de Rendas Fixas */}
            {monthlyFixedIncome.length > 0 && (
              <>
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700">Rendas Fixas</h3>
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
                    {monthlyFixedIncome.map(income => {
                      const category = getCategory(income.categoryId);
                      const hasVariation = income.actualAmount !== income.amount;
                      return (
                        <tr key={`fixed-${income.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {income.description}
                            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Fixa</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {category ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${category.color}20`, color: category.color }}>{category.name}</span> : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Dia {income.day}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className={`${hasVariation ? 'text-blue-600' : 'text-green-600'}`}>{formatValue(income.actualAmount)}</div>
                            {hasVariation && <div className="text-xs text-gray-500">Padrão: {formatValue(income.amount)}</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

            {/* Seção de Rendas Variáveis */}
            {monthlyVariableIncome.length > 0 && (
              <>
                <div className="px-6 py-3 bg-gray-50 border-t border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700">Rendas Variáveis</h3>
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
                    {monthlyVariableIncome.map(income => {
                      const category = getCategory(income.categoryId);
                      return (
                        <tr key={income.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatUTCToDDMMAAAA(income.date)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{income.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {category ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${category.color}20`, color: category.color }}>{category.name}</span> : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{formatValue(income.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">Nenhuma renda neste período.</div>
        )}
      </div>
    </div>
  );
};