
import api from './api';
import { VariableExpense } from '../context/FinanceContext';

// Converte a resposta da API de snake_case para camelCase
const toCamelCase = (expense: any): VariableExpense => ({
  id: expense.id,
  description: expense.description,
  amount: expense.amount,
  date: expense.expense_date, // Corrigido
  categoryId: expense.category_id,
  isInstallment: expense.is_installment,
});

// Converte o objeto do frontend de camelCase para snake_case antes de enviar para a API
const toSnakeCase = (expense: Partial<Omit<VariableExpense, 'id'>>) => ({
  description: expense.description,
  amount: expense.amount,
  expense_date: expense.date, // Corrigido
  category_id: expense.categoryId || null,
  is_installment: expense.isInstallment,
});

export const getVariableExpenses = async (): Promise<VariableExpense[]> => {
  const response = await api.get<any[]>('/variable-expenses');
  if (Array.isArray(response.data)) {
    return response.data.map(toCamelCase);
  }
  return [];
};

export const addVariableExpense = async (expense: Omit<VariableExpense, 'id'>): Promise<VariableExpense> => {
  const snakeCaseExpense = toSnakeCase(expense);
  const response = await api.post('/variable-expenses', snakeCaseExpense);
  return toCamelCase(response.data);
};

export const updateVariableExpense = async (id: string, expense: Partial<Omit<VariableExpense, 'id'>>): Promise<VariableExpense> => {
  const snakeCaseExpense = toSnakeCase(expense);
  const response = await api.put(`/variable-expenses/${id}`, snakeCaseExpense);
  return toCamelCase(response.data);
};

export const deleteVariableExpense = async (id: string) => {
  await api.delete(`/variable-expenses/${id}`);
};
