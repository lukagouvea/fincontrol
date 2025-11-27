import { api } from './api';
import { Category } from '../types/FinanceTypes';

export const categoryService = {
  // GET /categories
  getAll: async (): Promise<Category[]> => {
    const { data } = await api.get<Category[]>('/categories');
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