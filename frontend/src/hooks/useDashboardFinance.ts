import { useMemo } from 'react';
import { useTransactions } from './useTransactions';
import { useFixedExpenses, useFixedIncomes } from './useFixedTransactions';
import { useMonthlyVariations } from './useMonthlyVariations';
import { useCategories } from './useCategories';
import { parseDateInputToLocal } from '../utils/dateUtils';
import { isItemActiveInMonth, getActualFixedItemAmount } from '../utils/financeUtils';
import { Transaction, FixedExpense, FixedIncome, MonthlyVariation, Category } from '../types/FinanceTypes';

export const useDashboardFinance = () => {
  // 1. Busca de Dados
  const { data: transactions = [], isLoading: isLoadingTransactions } = useTransactions();
  const { data: fixedExpenses = [], isLoading: isLoadingFixedExpenses } = useFixedExpenses();
  const { data: fixedIncomes = [], isLoading: isLoadingFixedIncomes } = useFixedIncomes();
  const { data: monthlyVariations = [], isLoading: isLoadingMonthlyVariations } = useMonthlyVariations();
  const { data: categories = [], isLoading: isLoadingCategories } = useCategories();

  // 2. Estado de Carregamento Geral
  const isLoading = isLoadingCategories || isLoadingFixedExpenses || isLoadingTransactions || isLoadingFixedIncomes || isLoadingMonthlyVariations;

  // 3. Definição da Data (Mês Atual)
  const selectedMonth = new Date().getMonth();
  const selectedYear = new Date().getFullYear();
  const selectedDateObject = useMemo(() => new Date(selectedYear, selectedMonth, 1), [selectedMonth, selectedYear]);

  // 4. A Grande Lógica de Cálculo (Movida do componente para cá)
  const summary = useMemo(() => {
    const anoAtual = selectedDateObject.getFullYear();
    const mesAtual = selectedDateObject.getMonth();

    const getVariableTransactions = (type: 'income' | 'expense') => {
      return (transactions as Transaction[]).filter((t: Transaction) => {
        const transactionDate = parseDateInputToLocal(t.date.split('T')[0]);
        const isCorrectType = t.type === type;
        const isSameMonth = transactionDate.getFullYear() === anoAtual && transactionDate.getMonth() === mesAtual;
        const isNotFixedVariation = !t.recurringRuleId;
        return isCorrectType && isSameMonth && isNotFixedVariation;
      });
    };

    const variableIncomes = getVariableTransactions('income');
    const variableExpenses = getVariableTransactions('expense');

  const monthlyVariableIncome = variableIncomes.reduce((sum: number, t: Transaction) => sum + t.amount, 0);
  const monthlyVariableExpense = variableExpenses.reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    const monthlyFixedIncome = (fixedIncomes as FixedIncome[])
      .filter((income: FixedIncome) => isItemActiveInMonth(income, selectedDateObject))
      .reduce((sum: number, income: FixedIncome) => sum + getActualFixedItemAmount(income.id, 'income', anoAtual, mesAtual, income.amount, monthlyVariations as MonthlyVariation[]), 0);

    const monthlyFixedExpense = (fixedExpenses as FixedExpense[])
      .filter((expense: FixedExpense) => isItemActiveInMonth(expense, selectedDateObject))
      .reduce((sum: number, expense: FixedExpense) => sum + getActualFixedItemAmount(expense.id, 'expense', anoAtual, mesAtual, expense.amount, monthlyVariations as MonthlyVariation[]), 0);

    const monthlyInstallmentExpense = (transactions as Transaction[])
      .filter((t: Transaction) => t.type === 'expense' && ('installmentInfo' in t && !!t.installmentInfo))
      .filter((t: Transaction) => {
        const transactionDate = parseDateInputToLocal(t.date.split('T')[0]);
        return transactionDate.getFullYear() === anoAtual && transactionDate.getMonth() === mesAtual;
      })
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    const totalIncome = monthlyVariableIncome + monthlyFixedIncome;
    const totalExpense = monthlyVariableExpense + monthlyFixedExpense;
    const balance = totalIncome - totalExpense;
    const monthlyCommittedExpense = monthlyFixedExpense + monthlyInstallmentExpense;
    const monthlyMonthExpense = totalExpense - monthlyCommittedExpense;

    return {
      monthlyIncome: totalIncome,
      monthlyFixedIncome,
      monthlyVariableIncome,
      monthlyExpense: totalExpense,
      monthlyFixedExpense,
      monthlyVariableExpense,
      monthlyInstallmentExpense,
      monthlyCommittedExpense,
      monthlyMonthExpense,
      balance
    };
  }, [selectedDateObject, transactions, fixedIncomes, fixedExpenses, monthlyVariations]);

  // --- Regras de exibição na Dashboard ---
  // Parceladas (installments) não devem aparecer em nenhum widget,
  // exceto "Contas do Mês" (UpcomingBills) e "Transações Recentes".
  // Então expomos duas listas:
  // - transactions: original (com parceladas) -> usado por widgets permitidos
  // - transactionsWithoutInstallments: filtrado -> usado pelos demais widgets
  const transactionsWithoutInstallments = useMemo(() => {
    return (transactions as Transaction[]).filter((t: Transaction) => !('installmentInfo' in t && !!t.installmentInfo));
  }, [transactions]);

  // Retorna tudo o que o componente precisa
  return {
    transactions: transactions as Transaction[],
    transactionsWithoutInstallments,
    fixedExpenses: fixedExpenses as FixedExpense[],
    fixedIncomes: fixedIncomes as FixedIncome[],
    monthlyVariations: monthlyVariations as MonthlyVariation[],
    categories: categories as Category[],
    isLoading,
    selectedDateObject,
    summary // Contém income, expense, balance, etc.
  };
};