
import React, { useState, createContext, useContext, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

import * as categoryService from '../services/categoryService';
import * as fixedIncomeService from '../services/fixedIncomeService';
import * as fixedExpenseService from '../services/fixedExpenseService';
import * as monthlyVariationService from '../services/monthlyVariationService';
import * as variableIncomeService from '../services/variableIncomeService';
import * as variableExpenseService from '../services/variableExpenseService';

// Tipos
export type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  description?: string;
  color?: string;
};
export type FixedIncome = {
  id: string;
  description: string;
  amount: number;
  day: number;
  categoryId: string;
  startDate: string;
  endDate?: string;
};
export type VariableIncome = {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryId: string;
};
export type FixedExpense = {
  id: string;
  description: string;
  amount: number;
  day: number;
  categoryId: string;
  startDate: string;
  endDate?: string;
};
export type VariableExpense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryId: string;
  isInstallment: boolean;
};

export type Parcela = {
  id: string;
  idCompraParcelada: string;
  description: string;
  amount: number;
  date: string;
  categoryId: string;
  isInstallment: boolean;
  installmentInfo: {
    total: number;
    current: number;
  };
}

export type CompraParcelada = {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryId: string;
  numParcelas: number;
  parcelas : Omit<Parcela, 'id'>[];
}

// Novo tipo para variações mensais de despesas/rendas fixas
export type MonthlyVariation = {
  id: string;
  fixedItemId: string; // ID da despesa ou renda fixa
  type: 'income' | 'expense'; // Tipo do item (renda ou despesa)
  year: number;
  month: number; // 0-11 (Janeiro-Dezembro)
  amount: number; // Valor específico para este mês
};

// Tipo unificado para exibição
export type Transaction = (VariableIncome & { type: 'income' }) | (VariableExpense & { type: 'expense' });

type FinanceContextType = {
  categories: Category[];
  fixedIncomes: FixedIncome[];
  fixedExpenses: FixedExpense[];
  variableIncomes: VariableIncome[];
  variableExpenses: VariableExpense[];
  transactions: Transaction[]; // Este será um array derivado
  monthlyVariations: MonthlyVariation[];
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, category: Partial<Omit<Category, 'id'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addFixedIncome: (income: Omit<FixedIncome, 'id'>) => Promise<void>;
  updateFixedIncome: (id: string, income: Partial<Omit<FixedIncome, 'id'>>) => Promise<void>;
  deleteFixedIncome: (id: string) => Promise<void>;
  addFixedExpense: (expense: Omit<FixedExpense, 'id'>) => Promise<void>;
  updateFixedExpense: (id: string, expense: Partial<Omit<FixedExpense, 'id'>>) => Promise<void>;
  deleteFixedExpense: (id: string) => Promise<void>;
  addMonthlyVariation: (variation: Omit<MonthlyVariation, 'id'>) => Promise<void>;
  updateMonthlyVariation: (id: string, variation: Partial<Omit<MonthlyVariation, 'id'>>) => Promise<void>;
  deleteMonthlyVariation: (id: string) => Promise<void>;
  getActualFixedItemAmount: (itemId: string, type: 'income' | 'expense', year: number, month: number, defaultAmount: number) => number;
  loading: boolean;
  error: string | null;
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance deve ser usado dentro de um FinanceProvider');
  }
  return context;
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [fixedIncomes, setFixedIncomes] = useState<FixedIncome[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [variableIncomes, setVariableIncomes] = useState<VariableIncome[]>([]);
  const [variableExpenses, setVariableExpenses] = useState<VariableExpense[]>([]);
  const [monthlyVariations, setMonthlyVariations] = useState<MonthlyVariation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        
        const [categoriesData, fixedIncomesData, fixedExpensesData, monthlyVariationsData, variableIncomesData, variableExpensesData] = await Promise.all([
          categoryService.getCategories(),
          fixedIncomeService.getFixedIncomes(),
          fixedExpenseService.getFixedExpenses(),
          monthlyVariationService.getMonthlyVariations(),
          variableIncomeService.getVariableIncomes(),
          variableExpenseService.getVariableExpenses(),
        ]);

        setCategories(categoriesData);
        setFixedIncomes(fixedIncomesData);
        setFixedExpenses(fixedExpensesData);
        setMonthlyVariations(monthlyVariationsData);
        setVariableIncomes(variableIncomesData);
        setVariableExpenses(variableExpensesData);

      } catch (err) {
        setError('Falha ao carregar os dados financeiros.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);
  
  // Deriva a lista de transações unificadas a partir de rendas e despesas variáveis
  const transactions = useMemo(() => {
    const incomes: Transaction[] = variableIncomes.map(item => ({ ...item, type: 'income' }));
    const expenses: Transaction[] = variableExpenses.map(item => ({ ...item, type: 'expense' }));

    return [...incomes, ...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [variableIncomes, variableExpenses]);

  const addCategory = useCallback(async (category: Omit<Category, 'id'>) => {
    try {
      const newCategory = await categoryService.addCategory(category);
      setCategories(prev => [...prev, newCategory]);
    } catch (err) {
      console.error("Erro ao adicionar categoria:", err);
      throw err;
    }
  }, []);

  const updateCategory = useCallback(async (id: string, category: Partial<Omit<Category, 'id'>>) => {
    try {
      const updatedCategory = await categoryService.updateCategory(id, category);
      setCategories(prev => prev.map(cat => cat.id === id ? updatedCategory : cat));
    } catch (err) {
      console.error("Erro ao atualizar categoria:", err);
      throw err;
    }
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      await categoryService.deleteCategory(id);
      setCategories(prev => prev.filter(cat => cat.id !== id));
    } catch (err) {
      console.error("Erro ao deletar categoria:", err);
      throw err;
    }
  }, []);

  const addFixedIncome = useCallback(async (income: Omit<FixedIncome, 'id'>) => {
    try {
      const newFixedIncome = await fixedIncomeService.addFixedIncome(income);
      setFixedIncomes(prev => [...prev, newFixedIncome]);
    } catch (err) {
      console.error("Erro ao adicionar renda fixa:", err);
      throw err;
    }
  }, []);

  const updateFixedIncome = useCallback(async (id: string, income: Partial<Omit<FixedIncome, 'id'>>) => {
    try {
      const updatedFixedIncome = await fixedIncomeService.updateFixedIncome(id, income);
      setFixedIncomes(prev => prev.map(inc => inc.id === id ? updatedFixedIncome : inc));
    } catch (err) {
      console.error("Erro ao atualizar renda fixa:", err);
      throw err;
    }
  }, []);

  const deleteFixedIncome = useCallback(async (id: string) => {
    try {
      await fixedIncomeService.deleteFixedIncome(id);
      setFixedIncomes(prev => prev.filter(inc => inc.id !== id));
    } catch (err) {
      console.error("Erro ao deletar renda fixa:", err);
      throw err;
    }
  }, []);

  const addFixedExpense = useCallback(async (expense: Omit<FixedExpense, 'id'>) => {
    try {
      const newFixedExpense = await fixedExpenseService.addFixedExpense(expense);
      setFixedExpenses(prev => [...prev, newFixedExpense]);
    } catch (err) {
      console.error("Erro ao adicionar despesa fixa:", err);
      throw err;
    }
  }, []);

  const updateFixedExpense = useCallback(async (id: string, expense: Partial<Omit<FixedExpense, 'id'>>) => {
    try {
      const updatedFixedExpense = await fixedExpenseService.updateFixedExpense(id, expense);
      setFixedExpenses(prev => prev.map(exp => exp.id === id ? updatedFixedExpense : exp));
    } catch (err) {
      console.error("Erro ao atualizar despesa fixa:", err);
      throw err;
    }
  }, []);

  const deleteFixedExpense = useCallback(async (id: string) => {
    try {
      await fixedExpenseService.deleteFixedExpense(id);
      setFixedExpenses(prev => prev.filter(exp => exp.id !== id));
    } catch (err) {
      console.error("Erro ao deletar despesa fixa:", err);
      throw err;
    }
  }, []);

  const addMonthlyVariation = useCallback(async (variation: Omit<MonthlyVariation, 'id'>) => {
    try {
      const newVariation = await monthlyVariationService.addMonthlyVariation(variation);
      setMonthlyVariations(prev => [...prev, newVariation]);
    } catch (err) {
      console.error("Erro ao adicionar variação mensal:", err);
      throw err;
    }
  }, []);

  const updateMonthlyVariation = useCallback(async (id: string, variation: Partial<Omit<MonthlyVariation, 'id'>>) => {
    try {
      const updatedVariation = await monthlyVariationService.updateMonthlyVariation(id, variation);
      setMonthlyVariations(prev => prev.map(var_ => var_.id === id ? updatedVariation : var_));
    } catch (err) {
      console.error("Erro ao atualizar variação mensal:", err);
      throw err;
    }
  }, []);

  const deleteMonthlyVariation = useCallback(async (id: string) => {
    try {
      await monthlyVariationService.deleteMonthlyVariation(id);
      setMonthlyVariations(prev => prev.filter(var_ => var_.id !== id));
    } catch (err) {
      console.error("Erro ao deletar variação mensal:", err);
      throw err;
    }
  }, []);

  const getActualFixedItemAmount = useCallback((itemId: string, type: 'income' | 'expense', year: number, month: number, defaultAmount: number): number => {
      const variation = monthlyVariations.find(v => v.fixedItemId === itemId && v.type === type && v.year === year && v.month === month);
      return variation ? variation.amount : defaultAmount;
  }, [monthlyVariations]);

  const value = useMemo(() => ({
    categories,
    transactions,
    fixedIncomes,
    fixedExpenses,
    variableIncomes,
    variableExpenses,
    monthlyVariations,
    addCategory,
    updateCategory,
    deleteCategory,
    addFixedIncome,
    updateFixedIncome,
    deleteFixedIncome,
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    addMonthlyVariation,
    updateMonthlyVariation,
    deleteMonthlyVariation,
    getActualFixedItemAmount,
    loading,
    error,
  }), [categories, transactions, fixedIncomes, fixedExpenses, variableIncomes, variableExpenses, monthlyVariations, addCategory, updateCategory, deleteCategory, addFixedIncome, updateFixedIncome, deleteFixedIncome, addFixedExpense, updateFixedExpense, deleteFixedExpense, addMonthlyVariation, updateMonthlyVariation, deleteMonthlyVariation, getActualFixedItemAmount, loading, error]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};
