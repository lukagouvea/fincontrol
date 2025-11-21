
import api from './api';
import { VariableIncome } from '../context/FinanceContext';

const toCamelCase = (income: any): VariableIncome => ({
  id: income.id,
  description: income.description,
  amount: income.amount,
  date: income.income_date,
  categoryId: income.category_id,
});

const toSnakeCase = (income: any) => ({
  description: income.description,
  amount: income.amount,
  income_date: income.date,
  category_id: income.categoryId || null,
});

export const getVariableIncomes = async (): Promise<VariableIncome[]> => {
  const response = await api.get('/variable-incomes');
  if (Array.isArray(response.data)) {
    return response.data.map(toCamelCase);
  }
  return [];
};

export const addVariableIncome = async (income: Omit<VariableIncome, 'id'>): Promise<VariableIncome> => {
  const snakeCaseIncome = toSnakeCase(income);
  const response = await api.post('/variable-incomes', snakeCaseIncome);
  return toCamelCase(response.data);
};
