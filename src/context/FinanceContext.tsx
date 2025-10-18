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
  categoryId: string;
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

export type Transaction = VariableIncome | VariableExpense | Parcela;
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

  /**
   * Pega a data atual na localidade do usuário e a formata para a string "YYYY-MM-DD".
   * @returns {string} A data formatada.
   */
  function getLocalDateString() {
    const date = new Date();

    const year = date.getFullYear();

    // getMonth() é 0-indexado (0 = Janeiro), então somamos 1.
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }


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
    // 1. Pega a data de hoje e formata para 'YYYY-MM-DD'
    const today = new Date().toISOString();

    // 2. Usa 'map' para encontrar e atualizar o item
    setFixedIncomes(fixedIncomes.map(inc => 
        inc.id === id 
        ? { ...inc, endDate: today } // Se encontrar, atualiza o endDate
        : inc // Senão, mantém o item como está
    ));
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
    const today = new Date().toISOString();

    setFixedExpenses(fixedExpenses.map(exp => 
        exp.id === id 
        ? { ...exp, endDate: today } 
        : exp
    ));
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
    const filteredTransaction = transactions.filter(t => t.id == id)
    if (filteredTransaction.length > 0 && 'idCompraParcelada' in filteredTransaction[0]) {
      const idCompraParcelada = filteredTransaction[0].idCompraParcelada;
      deleteCompraParcelada(idCompraParcelada);
      return
    }
    setTransactions(transactions.filter(trans => trans.id !== id));
  };

  const addCompraParcelada = (compra: Omit<CompraParcelada, 'id'>) => {
    const compraId = Date.now().toString();
    const newCompra = {
      ...compra,
      id: compraId
    };
    // 1. Crie um array com todas as novas parcelas
    const novasParcelasParaAdicionar = newCompra.parcelas.map(parcela => ({
      ...parcela, // Mantém os dados da parcela
      idCompraParcelada: compraId,
      id: `${Date.now()}-${Math.random()}` // Gera um ID único para cada
    }));

    // 2. Chame o setTransactions UMA VEZ com todas as novas parcelas
    setTransactions(prevTransactions => [...prevTransactions, ...novasParcelasParaAdicionar]);

    setComprasParceladas([...comprasParceladas, newCompra]);

  }
  // Funções para gerenciar variações mensais
  const addMonthlyVariation = (variation: Omit<MonthlyVariation, 'id'>) => {
    // Verificar se já existe uma variação para este item, mês e ano
    const existingVariation = monthlyVariations.find(v => v.fixedItemId === variation.fixedItemId && v.type === variation.type && v.year === variation.year && v.month === variation.month);
    if (existingVariation) {
      // Atualizar a variação existente em vez de criar uma nova
      updateMonthlyVariation(existingVariation.id, variation);
      return;
    }
    const newVariation = {
      ...variation,
      id: Date.now().toString()
    };
    setMonthlyVariations([...monthlyVariations, newVariation]);
  };
  const updateMonthlyVariation = (id: string, variation: Partial<Omit<MonthlyVariation, 'id'>>) => {
    setMonthlyVariations(monthlyVariations.map(var_ => var_.id === id ? {
      ...var_,
      ...variation
    } : var_));
  };
  const deleteMonthlyVariation = (id: string) => {
    setMonthlyVariations(monthlyVariations.filter(var_ => var_.id !== id));
  };

  const deleteCompraParcelada = (id: string) => {
    setTransactions(transactions.filter(t => t.idCompraParcelada !== id));
    setComprasParceladas(comprasParceladas.filter(t => t.id !== id))
  }
  const getActualFixedItemAmount = (itemId: string, type: 'income' | 'expense', year: number, month: number, defaultAmount: number): number => {
    const variation = monthlyVariations.find(v => v.fixedItemId === itemId && v.type === type && v.year === year && v.month === month);
    return variation ? variation.amount : defaultAmount;
  };

  const value = {
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
  };
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};