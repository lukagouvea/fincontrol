import api from './api';
import { VariableExpense } from '../context/FinanceContext';

export const getVariableExpenses = async (): Promise<VariableExpense[]> => {
  const response = await api.get<VariableExpense[]>('/variable-expenses');
  return response.data;
};
