import { api } from './api';
import { Transaction, CompraParcelada } from '../types/FinanceTypes';

export const transactionService = {
  // GET /transactions?month=11&year=2025
  // Agora filtramos direto no servidor para não pesar o app
  getAll: async (month?: number, year?: number): Promise<Transaction[]> => {
    // Se não passar data, pega o mês atual (fallback)
    const m = month !== undefined ? month + 1 : new Date().getMonth() + 1; // Front (0-11) -> API (1-12)
    const y = year || new Date().getFullYear();

    const { data } = await api.get<Transaction[]>('/transactions', {
      params: { month: m, year: y }
    });
    return data;
  },

  // A API não retorna mais a lista de grupos separada, ela vem embutida nas transações
  // Mas mantemos o método para compatibilidade se necessário, ou retornamos vazio
  getAllComprasParceladas: async (): Promise<CompraParcelada[]> => {
    // Por enquanto, não temos uma rota só de grupos, pois o dashboard usa as transações explodidas
    return []; 
  },

  // POST /transactions (Simples)
  create: async (data: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const { data: newTransaction } = await api.post<Transaction>('/transactions', data);
    return newTransaction;
  },

  // POST /transactions/installment (Complexa)
  // O Front só manda o cabeçalho, o Back cria as parcelas
  createCompraParcelada: async (compraData: any): Promise<any> => {
    const payload = {
      description: compraData.description,
      totalAmount: compraData.amount, // O front chama de 'amount', o back espera 'totalAmount'
      totalInstallments: compraData.numParcelas,
      date: compraData.date,
      categoryId: compraData.categoryId
    };

    const { data } = await api.post('/transactions/installment', payload);
    return data;
  },

  // PUT /transactions/:id
  update: async (id: string, data: Partial<Transaction>): Promise<Transaction> => {
    const { data: updated } = await api.put<Transaction>(`/transactions/${id}`, data);
    return updated;
  },

  // DELETE /transactions/:id
  delete: async (id: string): Promise<void> => {
    await api.delete(`/transactions/${id}`);
  }
};