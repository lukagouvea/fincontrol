import React, { useState, createContext, useContext, useMemo } from 'react';
import {Category, FixedExpense, FixedIncome, Transaction, MonthlyVariation, CompraParcelada} from '../types/FinanceTypes'
import { categoryService } from '../services/categoryService';
import { fixedTransactionService } from '../services/fixedTransactionService';
import { transactionService } from '../services/transactionService';

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
  startDate: '2023-01-05T03:00:00.000Z',
  categoryId: '1'
}];

const initialMonthlyVariations: MonthlyVariation[] = [];

const initialCompraParcelada: CompraParcelada[] = [{
  id: '1',
  description: 'Celular',
  amount: 3500,
  date: '2025-10-05T03:00:00.000Z',
  categoryId: '6',
  numParcelas: 12,
  parcelas: [
    {
      idCompraParcelada: '1',
      description: 'Celular',
      amount: 291.63,
      date: '2025-10-05T03:00:00.000Z',
      categoryId: '6',
      isInstallment: true,
      installmentInfo: {
        total: 12,
        current: 1
      }
    },
    {
      idCompraParcelada: '1',
      description: 'Celular',
      amount: 291.67,
      date: '2025-11-05T03:00:00.000Z',
      categoryId: '6',
      isInstallment: true,
      installmentInfo: {
        total: 12,
        current: 2
      }
    },
    {
      idCompraParcelada: '1',
      description: 'Celular',
      amount: 291.67,
      date: '2025-12-05T03:00:00.000Z',
      categoryId: '6',
      isInstallment: true,
      installmentInfo: {
        total: 12,
        current: 3
      }
    },
    {
      idCompraParcelada: '1',
      description: 'Celular',
      amount: 291.67,
      date: '2026-01-05T03:00:00.000Z',
      categoryId: '6',
      isInstallment: true,
      installmentInfo: {
        total: 12,
        current: 4
      }
    },
    {
      idCompraParcelada: '1',
      description: 'Celular',
      amount: 291.67,
      date: '2026-02-05T03:00:00.000Z',
      categoryId: '6',
      isInstallment: true,
      installmentInfo: {
        total: 12,
        current: 5
      }
    },
    {
      idCompraParcelada: '1',
      description: 'Celular',
      amount: 291.67,
      date: '2026-03-05T03:00:00.000Z',
      categoryId: '6',
      isInstallment: true,
      installmentInfo: {
        total: 12,
        current: 6
      }
    },
    {
      idCompraParcelada: '1',
      description: 'Celular',
      amount: 291.67,
      date: '2026-04-05T03:00:00.000Z',
      categoryId: '6',
      isInstallment: true,
      installmentInfo: {
        total: 12,
        current: 7
      }
    },
    {
      idCompraParcelada: '1',
      description: 'Celular',
      amount: 291.67,
      date: '2026-05-05T03:00:00.000Z',
      categoryId: '6',
      isInstallment: true,
      installmentInfo: {
        total: 12,
        current: 8
      }
    },
    {
      idCompraParcelada: '1',
      description: 'Celular',
      amount: 291.67,
      date: '2026-06-05T03:00:00.000Z',
      categoryId: '6',
      isInstallment: true,
      installmentInfo: {
        total: 12,
        current: 9
      }
    },
    {
      idCompraParcelada: '1',
      description: 'Celular',
      amount: 291.67,
      date: '2026-07-05T03:00:00.000Z',
      categoryId: '6',
      isInstallment: true,
      installmentInfo: {
        total: 12,
        current: 10
      }
    },
    {
      idCompraParcelada: '1',
      description: 'Celular',
      amount: 291.67,
      date: '2026-08-05T03:00:00.000Z',
      categoryId: '6',
      isInstallment: true,
      installmentInfo: {
        total: 12,
        current: 11
      }
    },
    {
      idCompraParcelada: '1',
      description: 'Celular',
      amount: 291.67,
      date: '2026-09-05T03:00:00.000Z',
      categoryId: '6',
      isInstallment: true,
      installmentInfo: {
        total: 12,
        current: 12
      }
    },
  ]
}];

const initialFixedExpenses: FixedExpense[] = [{
  id: '1',
  description: 'Aluguel',
  amount: 1200,
  day: 10,
  categoryId: '3',
  startDate: '2023-01-10T03:00:00.000Z'
}, {
  id: '2',
  description: 'Internet',
  amount: 100,
  day: 15,
  categoryId: '3',
  startDate: '2023-01-15T03:00:00.000Z'
}];

const today = new Date();

const generateRecentTransactions = () => {
  const transactions: Transaction[] = [];
  // Últimas 2 semanas de transações
  for (let i = 13; i >= 0; i--) {
    const date = new Date("2025-10-03T02:08:59.956Z");
    date.setDate(today.getDate() - i);
    // Gera a string UTC diretamente a partir do objeto Date local
    const utcDateStr = date.toISOString();
    
    // Adicionar algumas despesas variáveis
    if (i % 2 === 0) {
      transactions.push({
        id: `exp-${i}`,
        description: i % 4 === 0 ? 'Supermercado' : i % 3 === 0 ? 'Combustível' : 'Restaurante',
        amount: Math.floor(Math.random() * 200) + 50,
        date: utcDateStr,
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
        date: utcDateStr,
        categoryId: '2'
      });
    }
  }

  // Adicionar as parcelas da compra parcelada ao array de transações
  initialCompraParcelada[0].parcelas.forEach(parcela =>
    transactions.push(
      {
        ...parcela,
        id: `${Date.now()}-${Math.random()}`,
      }
    )
  );

  return transactions;
};
const initialTransactions = generateRecentTransactions();
// Contexto
type FinanceContextType = {
  categories: Category[];
  fixedIncomes: FixedIncome[];
  fixedExpenses: FixedExpense[];
  comprasParceladas: CompraParcelada[];
  transactions: Transaction[];
  monthlyVariations: MonthlyVariation[];
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
  // Novas funções para gerenciar variações mensais
  addMonthlyVariation: (variation: Omit<MonthlyVariation, 'id'>) => void;
  updateMonthlyVariation: (id: string, variation: Partial<Omit<MonthlyVariation, 'id'>>) => void;
  deleteMonthlyVariation: (id: string) => void;
  getActualFixedItemAmount: (itemId: string, type: 'income' | 'expense', year: number, month: number, defaultAmount: number) => number;
  addCompraParcelada: (compra: Omit<CompraParcelada, 'id'>) => void;
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
  const [comprasParceladas, setComprasParceladas] = useState<CompraParcelada[]>(initialCompraParcelada);
  const [fixedIncomes, setFixedIncomes] = useState<FixedIncome[]>(initialFixedIncomes);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(initialFixedExpenses);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
    const [monthlyVariations, setMonthlyVariations] = useState<MonthlyVariation[]>(initialMonthlyVariations);

  
  // --- CATEGORIAS ---
  const addCategory = async (category: Omit<Category, 'id'>) => {
    try {
      const newItem = await categoryService.create(category);
      setCategories(prev => [...prev, newItem]);
    } catch (e) { console.error(e); }
  };

  const updateCategory = async (id: string, category: Partial<Omit<Category, 'id'>>) => {
    try {
      const updatedItem = await categoryService.update(id, category);
      setCategories(prev => prev.map(c => c.id === id ? updatedItem : c));
    } catch (e) { console.error(e); }
  };

  const deleteCategory = async (id: string) => {
    try {
      await categoryService.delete(id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error(e); }
  };

  // --- RENDAS FIXAS ---
  const addFixedIncome = async (income: Omit<FixedIncome, 'id'>) => {
    try {
      const newItem = await fixedTransactionService.createIncome(income);
      setFixedIncomes(prev => [...prev, newItem]);
    } catch (e) { console.error(e); }
  };

  const updateFixedIncome = async (id: string, income: Partial<Omit<FixedIncome, 'id'>>) => {
    try {
      const updatedItem = await fixedTransactionService.updateIncome(id, income);
      setFixedIncomes(prev => prev.map(i => i.id === id ? updatedItem : i));
    } catch (e) { console.error(e); }
  };

  const deleteFixedIncome = async (id: string) => {
    // Nota: Aqui assumimos a lógica de "encerrar" atualizando a data de fim
    // que já está implementada no componente. Se for um delete real:
    try {
        // Se for apenas update da data de fim, chamamos updateFixedIncome.
        // Se for delete físico do banco:
        await fixedTransactionService.deleteIncome(id);
        setFixedIncomes(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error(e); }
  };

  // --- DESPESAS FIXAS ---
  const addFixedExpense = async (expense: Omit<FixedExpense, 'id'>) => {
    try {
      const newItem = await fixedTransactionService.createExpense(expense);
      setFixedExpenses(prev => [...prev, newItem]);
    } catch (e) { console.error(e); }
  };

  const updateFixedExpense = async (id: string, expense: Partial<Omit<FixedExpense, 'id'>>) => {
    try {
      const updatedItem = await fixedTransactionService.updateExpense(id, expense);
      setFixedExpenses(prev => prev.map(e => e.id === id ? updatedItem : e));
    } catch (e) { console.error(e); }
  };

  const deleteFixedExpense = async (id: string) => {
    try {
        await fixedTransactionService.deleteExpense(id);
        setFixedExpenses(prev => prev.filter(e => e.id !== id));
    } catch (e) { console.error(e); }
  };

  // --- TRANSAÇÕES ---
  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      const newItem = await transactionService.create(transaction);
      setTransactions(prev => [...prev, newItem]);
    } catch (e) { console.error(e); }
  };

  const updateTransaction = async (id: string, transaction: Partial<Omit<Transaction, 'id'>>) => {
    try {
      const updatedItem = await transactionService.update(id, transaction);
      setTransactions(prev => prev.map(t => t.id === id ? updatedItem : t));
    } catch (e) { console.error(e); }
  };

  const deleteTransaction = async (id: string) => {
    try {
      // Verifica localmente para atualizar o estado corretamente
      const transaction = transactions.find(t => t.id === id);
      await transactionService.delete(id);
      
      if (transaction && 'idCompraParcelada' in transaction && transaction.idCompraParcelada) {
         // Se for parcela, remove todas relacionadas no estado local também
         const compraId = transaction.idCompraParcelada;
         setTransactions(prev => prev.filter(t => !('idCompraParcelada' in t) || t.idCompraParcelada !== compraId));
         setComprasParceladas(prev => prev.filter(c => c.id !== compraId));
      } else {
         setTransactions(prev => prev.filter(t => t.id !== id));
      }
    } catch (e) { console.error(e); }
  };

  const addCompraParcelada = async (compra: Omit<CompraParcelada, 'id'>) => {
    try {
      const { compra: newCompra, parcelas } = await transactionService.createCompraParcelada(compra);
      setComprasParceladas(prev => [...prev, newCompra]);
      setTransactions(prev => [...prev, ...parcelas]);
    } catch (e) { console.error(e); }
  };

  // --- VARIAÇÕES MENSAIS ---
  const addMonthlyVariation = async (variation: Omit<MonthlyVariation, 'id'>) => {
    try {
        // Lógica de verificar existência deve ser feita no backend idealmente,
        // ou mantida aqui temporariamente. Vamos assumir que o service cria uma nova.
        const newItem = await fixedTransactionService.createVariation(variation);
        setMonthlyVariations(prev => [...prev, newItem]);
    } catch (e) { console.error(e); }
  };

  const updateMonthlyVariation = async (id: string, variation: Partial<Omit<MonthlyVariation, 'id'>>) => {
    try {
        const updatedItem = await fixedTransactionService.updateVariation(id, variation);
        setMonthlyVariations(prev => prev.map(v => v.id === id ? updatedItem : v));
    } catch (e) { console.error(e); }
  };

  const deleteMonthlyVariation = async (id: string) => {
    try {
        await fixedTransactionService.deleteVariation(id);
        setMonthlyVariations(prev => prev.filter(v => v.id !== id));
    } catch (e) { console.error(e); }
  };

  // Função síncrona de leitura (não precisa ir ao backend)
  const getActualFixedItemAmount = (itemId: string, type: 'income' | 'expense', year: number, month: number, defaultAmount: number): number => {
    const variation = monthlyVariations.find(v => v.fixedItemId === itemId && v.type === type && v.year === year && v.month === month);
    return variation ? variation.amount : defaultAmount;
  };

  const value = useMemo(() => ({
    categories,
    fixedIncomes,
    fixedExpenses,
    comprasParceladas,
    transactions,
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
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addMonthlyVariation,
    updateMonthlyVariation,
    deleteMonthlyVariation,
    getActualFixedItemAmount,
    addCompraParcelada
  }), [
    categories,
    fixedIncomes,
    fixedExpenses,
    comprasParceladas,
    transactions,
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
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addMonthlyVariation,
    updateMonthlyVariation,
    deleteMonthlyVariation,
    getActualFixedItemAmount,
    addCompraParcelada
  ]);
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};