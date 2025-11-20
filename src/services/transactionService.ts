import api from './api';
import { Transaction, CompraParcelada } from '../context/FinanceContext';

// Tipos auxiliares para a resposta da API
type ApiTransaction = Omit<Transaction, 'type'> & { type: 'INCOME' | 'EXPENSE' };
type ApiCompraParcelada = Omit<CompraParcelada, 'parcelas'> & {
    parcelas: (Omit<ApiTransaction, 'id'> & { id: string })[];
};

export const getTransactions = async (): Promise<Transaction[]> => {
  const response = await api.get<ApiTransaction[]>('/transactions');
  // Converte o tipo para minúsculas para consistência no frontend
  return response.data.map(transaction => ({
    ...transaction,
    type: transaction.type.toLowerCase() as 'income' | 'expense',
  }));
};

export const addTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const transactionToSend = {
        ...transaction,
        type: transaction.type.toUpperCase(),
    };
    const response = await api.post<ApiTransaction>('/transactions', transactionToSend);
    // Converte o tipo de volta para minúsculas
    return {
        ...response.data,
        type: response.data.type.toLowerCase() as 'income' | 'expense',
    };
};

export const updateTransaction = async (id: string, transaction: Partial<Omit<Transaction, 'id'>>): Promise<Transaction> => {
    const transactionToSend = { ...transaction };
    if (transaction.type) {
        transactionToSend.type = transaction.type.toUpperCase() as 'INCOME' | 'EXPENSE';
    }
    const response = await api.put<ApiTransaction>(`/transactions/${id}`, transactionToSend);
    // Converte o tipo de volta para minúsculas
    return {
        ...response.data,
        type: response.data.type.toLowerCase() as 'income' | 'expense',
    };
};

export const deleteTransaction = async (id: string) => {
  const response = await api.delete(`/transactions/${id}`);
  return response.data;
};

export const addCompraParcelada = async (compra: Omit<CompraParcelada, 'id'>): Promise<CompraParcelada> => {
    // A compra parcelada em si não tem um tipo, mas suas parcelas sim.
    const compraToSend = {
        ...compra,
        parcelas: compra.parcelas.map(p => ({ ...p, type: 'EXPENSE' }))
    };

    const response = await api.post<ApiCompraParcelada>('/compras-parceladas', compraToSend);
    
    // Converte os tipos das parcelas de volta para minúsculas
    return {
        ...response.data,
        parcelas: response.data.parcelas.map(p => ({
            ...p,
            type: p.type.toLowerCase() as 'expense',
        }))
    };
};
