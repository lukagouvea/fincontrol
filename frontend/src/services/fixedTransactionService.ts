import { api } from './api';
import { FixedExpense, FixedIncome, MonthlyVariation } from '../types/FinanceTypes';

/**
 * Escopo de uma edição de fixa: 'from' aplica valor/categoria/dia a partir de
 * `effectiveFrom` ('YYYY-MM'); 'all' corrige todo o histórico.
 */
export type FixedUpdateScope = { scope?: 'from' | 'all'; effectiveFrom?: string };

export const fixedTransactionService = {
  // --- LEITURA ---
  getIncomes: async (): Promise<FixedIncome[]> => {
    const { data } = await api.get('/recurring?type=income');
    return data;
  },

  getExpenses: async (): Promise<FixedExpense[]> => {
    const { data } = await api.get('/recurring?type=expense');
    return data;
  },

  // AQUI: Busca do endpoint novo que criamos no backend
  getVariations: async (): Promise<MonthlyVariation[]> => {
    const { data } = await api.get('/recurring/variations');
    return data;
  },

  // --- CRIAÇÃO DE REGRAS ---
  createIncome: async (data: Omit<FixedIncome, 'id'>): Promise<FixedIncome> => {
    const { data: newItem } = await api.post('/recurring', { ...data, type: 'income' });
    return newItem;
  },

  createExpense: async (data: Omit<FixedExpense, 'id'>): Promise<FixedExpense> => {
    const { data: newItem } = await api.post('/recurring', { ...data, type: 'expense' });
    return newItem;
  },

  // --- VARIAÇÕES (Adapter) ---
  // Recebe o objeto completo do front e manda para a rota específica
  createVariation: async (data: { fixedItemId: string; amount: number; year: number; month: number; type: string }): Promise<any> => {
    await api.post(`/recurring/${data.fixedItemId}/variation`, {
      year: data.year,
      month: data.month,
      amount: data.amount,
      type: data.type
    });
  },

  // Update redireciona para create (Upsert no backend)
  updateVariation: async (data: { id: string; fixedItemId: string; amount: number; year: number; month: number; type: string }): Promise<any> => {
    // Nota: Precisamos garantir que 'fixedItemId' esteja presente. 
    // Se o 'data' vier incompleto, isso pode falhar. 
    // No seu caso, o modal VariationModal já tem o contexto.
    return fixedTransactionService.createVariation(data);
  },

  // Deletar variação = Deletar a transação "filha"
  deleteVariation: async (id: string): Promise<void> => {
    await api.delete(`/transactions/${id}`);
  },

  // --- UPDATE/DELETE REGRAS ---
  updateIncome: async (id: string, data: Partial<FixedIncome> & FixedUpdateScope): Promise<FixedIncome> => {
    const { data: updated } = await api.put(`/recurring/${id}`, data);
    return updated;
  },
  deleteIncome: async (id: string): Promise<void> => {
    await api.delete(`/recurring/${id}`);
  },
  updateExpense: async (id: string, data: Partial<FixedExpense> & FixedUpdateScope): Promise<FixedExpense> => {
    const { data: updated } = await api.put(`/recurring/${id}`, data);
    return updated;
  },
  deleteExpense: async (id: string): Promise<void> => {
    await api.delete(`/recurring/${id}`);
  },
};