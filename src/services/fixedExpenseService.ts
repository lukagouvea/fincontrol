
import api from './api';
import { FixedExpense } from '../context/FinanceContext';

const toCamelCase = (expense: any): FixedExpense => ({
  id: expense.id,
  description: expense.description,
  amount: expense.amount,
  day: expense.day,
  categoryId: expense.category_id,
  startDate: expense.start_date,
  endDate: expense.end_date,
});

const toSnakeCase = (expense: any) => ({
  description: expense.description,
  amount: expense.amount,
  day: expense.day,
  category_id: expense.categoryId || null,
  start_date: expense.startDate,
  end_date: expense.endDate,
});

export const getFixedExpenses = async (): Promise<FixedExpense[]> => {
  const response = await api.get('/fixed-expenses');
  if (Array.isArray(response.data)) {
    return response.data.map(toCamelCase);
  }
  return [];
};

export const addFixedExpense = async (expense: Omit<FixedExpense, 'id'>): Promise<FixedExpense> => {
  const snakeCaseExpense = toSnakeCase(expense);
  const response = await api.post('/fixed-expenses', snakeCaseExpense);
  return toCamelCase(response.data);
};

export const updateFixedExpense = async (id: string, expense: Partial<Omit<FixedExpense, 'id'>>): Promise<FixedExpense> => {
  const snakeCaseExpense = toSnakeCase(expense);
  const response = await api.put(`/fixed-expenses/${id}`, snakeCaseExpense);
  return toCamelCase(response.data);
};

export const deleteFixedExpense = async (id: string) => {
  const response = await api.delete(`/fixed-expenses/${id}`);
  return response.data;
};
