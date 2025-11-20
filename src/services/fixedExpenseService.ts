import api from './api';
import { FixedExpense } from '../context/FinanceContext';

export const getFixedExpenses = async () => {
  const response = await api.get('/fixed-expenses');
  return response.data;
};

export const addFixedExpense = async (expense: Omit<FixedExpense, 'id'>) => {
  const response = await api.post('/fixed-expenses', expense);
  return response.data;
};

export const updateFixedExpense = async (id: string, expense: Partial<Omit<FixedExpense, 'id'>>) => {
  const response = await api.put(`/fixed-expenses/${id}`, expense);
  return response.data;
};

export const deleteFixedExpense = async (id: string) => {
  const response = await api.delete(`/fixed-expenses/${id}`);
  return response.data;
};
