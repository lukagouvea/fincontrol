import api from './api';
import { VariableIncome } from '../context/FinanceContext';

export const getVariableIncomes = async (): Promise<VariableIncome[]> => {
  const response = await api.get<VariableIncome[]>('/variable-incomes');
  return response.data;
};
