
import api from './api';
import { FixedIncome } from '../context/FinanceContext';

// Converte as chaves do objeto da API (snake_case) para o formato do frontend (camelCase)
const toCamelCase = (income: any): FixedIncome => ({
  id: income.id,
  description: income.description,
  amount: income.amount,
  day: income.day,
  categoryId: income.category_id,
  startDate: income.start_date,
  endDate: income.end_date,
});

// Converte as chaves do objeto do frontend (camelCase) para o formato da API (snake_case)
const toSnakeCase = (income: any) => {
  const snakeCaseIncome: any = {};
  if (income.description !== undefined) snakeCaseIncome.description = income.description;
  if (income.amount !== undefined) snakeCaseIncome.amount = income.amount;
  if (income.day !== undefined) snakeCaseIncome.day = income.day;
  // Trata o caso de 'Sem categoria' (categoryId pode ser '' ou undefined)
  if (income.categoryId !== undefined) snakeCaseIncome.category_id = income.categoryId || null;
  if (income.startDate !== undefined) snakeCaseIncome.start_date = income.startDate;
  // Trata o caso de endDate ser opcional
  if (income.endDate !== undefined) snakeCaseIncome.end_date = income.endDate;
  
  return snakeCaseIncome;
};

export const getFixedIncomes = async (): Promise<FixedIncome[]> => {
  const response = await api.get('/fixed-incomes');
  // Garante que a resposta seja um array antes de mapear
  if (Array.isArray(response.data)) {
    return response.data.map(toCamelCase);
  }
  return []; // Retorna um array vazio se a resposta não for o esperado
};

export const addFixedIncome = async (income: Partial<Omit<FixedIncome, 'id'>>): Promise<FixedIncome> => {
  const snakeCaseIncome = toSnakeCase(income);
  const response = await api.post('/fixed-incomes', snakeCaseIncome);
  return toCamelCase(response.data);
};

export const updateFixedIncome = async (id: string, income: Partial<Omit<FixedIncome, 'id'>>): Promise<FixedIncome> => {
  const snakeCaseIncome = toSnakeCase(income);
  const response = await api.put(`/fixed-incomes/${id}`, snakeCaseIncome);
  return toCamelCase(response.data);
};

export const deleteFixedIncome = async (id: string) => {
  const response = await api.delete(`/fixed-incomes/${id}`);
  return response.data;
};
