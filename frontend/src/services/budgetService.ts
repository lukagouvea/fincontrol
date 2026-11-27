import { api } from './api';
import type { BudgetLimit } from '../types/FinanceTypes';

export const budgetService = {
  list: async (): Promise<BudgetLimit[]> => (await api.get<BudgetLimit[]>('/budgets')).data,
  /** Salva os limites de um mês ('YYYY-MM'); repeat = vale também nos seguintes. */
  save: async (month: string, repeat: boolean, limits: Array<{ categoryId: string | null; amount: number | null }>) =>
    (await api.put(`/budgets/${month}`, { repeat, limits })).data,
};
