import { api } from './api';
import { Category } from '../types/FinanceTypes';

export const categoryService = {
  // GET /categories
  // Inclui as arquivadas (active=false) para o histórico manter os nomes;
  // as telas de escolha filtram só as ativas.
  getAll: async (): Promise<Category[]> => {
    const { data } = await api.get<Category[]>('/categories', { params: { all: 1 } });
    return data;
  },

  // POST /categories/:id/merge — move tudo para o destino e arquiva a origem
  merge: async (id: string, targetId: string): Promise<{ moved: number }> => {
    const { data } = await api.post(`/categories/${id}/merge`, { targetId });
    return data;
  },

  // POST /categories
  create: async (categoryData: Omit<Category, 'id'>): Promise<Category> => {
    const { data } = await api.post<Category>('/categories', categoryData);
    return data;
  },

  // PUT /categories/:id
  update: async (id: string, categoryData: Partial<Category>): Promise<Category> => {
    const { data } = await api.put<Category>(`/categories/${id}`, categoryData);
    return data;
  },

  // DELETE /categories/:id
  delete: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
  }
};