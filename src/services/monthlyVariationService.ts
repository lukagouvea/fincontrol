import api from './api';
import { MonthlyVariation } from '../context/FinanceContext';

// Tipo auxiliar para a resposta da API
type ApiMonthlyVariation = Omit<MonthlyVariation, 'type'> & { type: 'INCOME' | 'EXPENSE' };

export const getMonthlyVariations = async (): Promise<MonthlyVariation[]> => {
  const response = await api.get<ApiMonthlyVariation[]>('/monthly-variations');
  // Converte o tipo para minúsculas para consistência no frontend
  return response.data.map(variation => ({
    ...variation,
    type: variation.type.toLowerCase() as 'income' | 'expense',
  }));
};

export const addMonthlyVariation = async (variation: Omit<MonthlyVariation, 'id'>): Promise<MonthlyVariation> => {
    const variationToSend = {
        ...variation,
        type: variation.type.toUpperCase(),
    };
    const response = await api.post<ApiMonthlyVariation>('/monthly-variations', variationToSend);
    // Converte o tipo de volta para minúsculas
    return {
        ...response.data,
        type: response.data.type.toLowerCase() as 'income' | 'expense',
    };
};

export const updateMonthlyVariation = async (id: string, variation: Partial<Omit<MonthlyVariation, 'id'>>): Promise<MonthlyVariation> => {
    const variationToSend = { ...variation };
    if (variation.type) {
        variationToSend.type = variation.type.toUpperCase() as 'INCOME' | 'EXPENSE';
    }
    const response = await api.put<ApiMonthlyVariation>(`/monthly-variations/${id}`, variationToSend);
    // Converte o tipo de volta para minúsculas
    return {
        ...response.data,
        type: response.data.type.toLowerCase() as 'income' | 'expense',
    };
};

export const deleteMonthlyVariation = async (id: string) => {
  const response = await api.delete(`/monthly-variations/${id}`);
  return response.data;
};
