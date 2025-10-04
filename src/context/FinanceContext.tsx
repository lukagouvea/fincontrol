import React, { useState, createContext, useContext } from 'react';
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
  startDate: string;
  endDate?: string;
};
export type VariableIncome = {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryId?: string;
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
  installmentInfo?: {
    total: number;
    current: number;
  };
};
export type Transaction = VariableIncome | VariableExpense;
// Mock data inicial
const initialCategories: Category[] = [{
  id: '1',
  name: 'Salário',
  type: 'income',
  color: '#4CAF50'
}, {
  id: '2',
  name: 'Freelance',
  type: 'income',
  color: '#8BC34A'
}, {
  id: '3',
  name: 'Moradia',
  type: 'expense',
  color: '#F44336'
}, {
  id: '4',
  name: 'Alimentação',
  type: 'expense',
  color: '#FF9800'
}, {
  id: '5',
  name: 'Transporte',
  type: 'expense',
  color: '#2196F3'
}, {
  id: '6',
  name: 'Lazer',
  type: 'expense',
  color: '#9C27B0'
}, {
  id: '7',
  name: 'Saúde',
  type: 'expense',
  color: '#E91E63'
}, {
  id: '8',
  name: 'Educação',
  type: 'expense',
  color: '#009688'
}];
const initialFixedIncomes: FixedIncome[] = [{
  id: '1',
  description: 'Salário Empresa',
  amount: 5000,
  day: 5,
  startDate: '2023-01-05'
}];
const initialFixedExpenses: FixedExpense[] = [{
  id: '1',
  description: 'Aluguel',
  amount: 1200,
  day: 10,
  categoryId: '3',
  startDate: '2023-01-10'
}, {
  id: '2',
  description: 'Internet',
  amount: 100,
  day: 15,
  categoryId: '3',
  startDate: '2023-01-15'
}];
// Gerar algumas transações recentes para o dashboard
const today = new Date();
const generateRecentTransactions = () => {
  const transactions: Transaction[] = [];
  // Últimas 2 semanas de transações
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    // Adicionar algumas despesas variáveis
    if (i % 2 === 0) {
      transactions.push({
        id: `exp-${i}`,
        description: i % 4 === 0 ? 'Supermercado' : i % 3 === 0 ? 'Combustível' : 'Restaurante',
        amount: Math.floor(Math.random() * 200) + 50,
        date: dateStr,
        categoryId: i % 4 === 0 ? '4' : i % 3 === 0 ? '5' : '6',
        isInstallment: false
      });
    }
    // Adicionar uma renda variável
    if (i === 7) {
      transactions.push({
        id: `inc-${i}`,
        description: 'Projeto freelance',
        amount: 1200,
        date: dateStr,
        categoryId: '2'
      });
    }
  }
  // Adicionar uma compra parcelada
  const installmentDate = new Date();
  installmentDate.setDate(today.getDate() - 5);
  const installmentDateStr = installmentDate.toISOString().split('T')[0];
  transactions.push({
    id: 'inst-1',
    description: 'Smartphone novo',
    amount: 300,
    date: installmentDateStr,
    categoryId: '6',
    isInstallment: true,
    installmentInfo: {
      total: 10,
      current: 1
    }
  });
  return transactions;
};
const initialTransactions = generateRecentTransactions();
// Contexto
type FinanceContextType = {
  categories: Category[];
  fixedIncomes: FixedIncome[];
  fixedExpenses: FixedExpense[];
  transactions: Transaction[];
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, category: Partial<Omit<Category, 'id'>>) => void;
  deleteCategory: (id: string) => void;
  addFixedIncome: (income: Omit<FixedIncome, 'id'>) => void;
  updateFixedIncome: (id: string, income: Partial<Omit<FixedIncome, 'id'>>) => void;
  deleteFixedIncome: (id: string) => void;
  addFixedExpense: (expense: Omit<FixedExpense, 'id'>) => void;
  updateFixedExpense: (id: string, expense: Partial<Omit<FixedExpense, 'id'>>) => void;
  deleteFixedExpense: (id: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, transaction: Partial<Omit<Transaction, 'id'>>) => void;
  deleteTransaction: (id: string) => void;
};
const FinanceContext = createContext<FinanceContextType | undefined>(undefined);
export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance deve ser usado dentro de um FinanceProvider');
  }
  return context;
};
export const FinanceProvider: React.FC<{
  children: React.ReactNode;
}> = ({
  children
}) => {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [fixedIncomes, setFixedIncomes] = useState<FixedIncome[]>(initialFixedIncomes);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(initialFixedExpenses);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  // Funções para gerenciar categorias
  const addCategory = (category: Omit<Category, 'id'>) => {
    const newCategory = {
      ...category,
      id: Date.now().toString()
    };
    setCategories([...categories, newCategory]);
  };
  const updateCategory = (id: string, category: Partial<Omit<Category, 'id'>>) => {
    setCategories(categories.map(cat => cat.id === id ? {
      ...cat,
      ...category
    } : cat));
  };
  const deleteCategory = (id: string) => {
    setCategories(categories.filter(cat => cat.id !== id));
  };
  // Funções para gerenciar rendas fixas
  const addFixedIncome = (income: Omit<FixedIncome, 'id'>) => {
    const newIncome = {
      ...income,
      id: Date.now().toString()
    };
    setFixedIncomes([...fixedIncomes, newIncome]);
  };
  const updateFixedIncome = (id: string, income: Partial<Omit<FixedIncome, 'id'>>) => {
    setFixedIncomes(fixedIncomes.map(inc => inc.id === id ? {
      ...inc,
      ...income
    } : inc));
  };
  const deleteFixedIncome = (id: string) => {
    setFixedIncomes(fixedIncomes.filter(inc => inc.id !== id));
  };
  // Funções para gerenciar despesas fixas
  const addFixedExpense = (expense: Omit<FixedExpense, 'id'>) => {
    const newExpense = {
      ...expense,
      id: Date.now().toString()
    };
    setFixedExpenses([...fixedExpenses, newExpense]);
  };
  const updateFixedExpense = (id: string, expense: Partial<Omit<FixedExpense, 'id'>>) => {
    setFixedExpenses(fixedExpenses.map(exp => exp.id === id ? {
      ...exp,
      ...expense
    } : exp));
  };
  const deleteFixedExpense = (id: string) => {
    setFixedExpenses(fixedExpenses.filter(exp => exp.id !== id));
  };
  // Funções para gerenciar transações
  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction = {
      ...transaction,
      id: Date.now().toString()
    };
    setTransactions([...transactions, newTransaction]);
  };
  const updateTransaction = (id: string, transaction: Partial<Omit<Transaction, 'id'>>) => {
    setTransactions(transactions.map(trans => trans.id === id ? {
      ...trans,
      ...transaction
    } : trans));
  };
  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(trans => trans.id !== id));
  };
  const value = {
    categories,
    fixedIncomes,
    fixedExpenses,
    transactions,
    addCategory,
    updateCategory,
    deleteCategory,
    addFixedIncome,
    updateFixedIncome,
    deleteFixedIncome,
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    addTransaction,
    updateTransaction,
    deleteTransaction
  };
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};