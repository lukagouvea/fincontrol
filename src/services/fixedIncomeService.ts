import api from './api';
import { FixedIncome } from '../context/FinanceContext';

export const getFixedIncomes = async () => {
  const response = await api.get('/fixed-incomes');
  return response.data;
};

export const addFixedIncome = async (income: Omit<FixedIncome, 'id'>) => {
  const response = await api.post('/fixed-incomes', income);
  return response.data;
};

export const updateFixedIncome = async (id: string, income: Partial<Omit<FixedIncome, 'id'>>) => {
  const response = await api.put(`/fixed-incomes/${id}`, income);
  return response.data;
};

export const deleteFixedIncome = async (id: string) => {
  const response = await api.delete(`/fixed-incomes/${id}`);
  return response.data;
};
