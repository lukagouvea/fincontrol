import api from './api';
import { Category } from '../context/FinanceContext';

// Tipo auxiliar para a resposta da API, para evitar conflitos com os tipos do frontend
type ApiCategory = Omit<Category, 'type'> & { type: 'INCOME' | 'EXPENSE' };

export const getCategories = async (): Promise<Category[]> => {
  const response = await api.get<ApiCategory[]>('/categories');
  // Converte o tipo para minúsculas para consistência no frontend
  const categories: Category[] = response.data.map(category => ({
    ...category,
    type: category.type.toLowerCase() as 'income' | 'expense',
  }));
  return categories;
};

export const addCategory = async (category: Omit<Category, 'id'>): Promise<Category> => {
    const categoryToSend = {
        ...category,
        type: category.type.toUpperCase(),
    };
    const response = await api.post<ApiCategory>('/categories', categoryToSend);
    // Converte o tipo de volta para minúsculas ao receber da API
    return {
        ...response.data,
        type: response.data.type.toLowerCase() as 'income' | 'expense',
    };
};

export const updateCategory = async (id: string, category: Partial<Omit<Category, 'id'>>): Promise<Category> => {
    const categoryToSend = { ...category };
    if (category.type) {
        categoryToSend.type = category.type.toUpperCase() as 'INCOME' | 'EXPENSE';
    }
    const response = await api.put<ApiCategory>(`/categories/${id}`, categoryToSend);
    // Converte o tipo de volta para minúsculas ao receber da API
    return {
        ...response.data,
        type: response.data.type.toLowerCase() as 'income' | 'expense',
    };
};

export const deleteCategory = async (id: string) => {
  const response = await api.delete(`/categories/${id}`);
  return response.data;
};
