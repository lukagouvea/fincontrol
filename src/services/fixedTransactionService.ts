import { FixedExpense, FixedIncome, MonthlyVariation } from '../types/FinanceTypes';
import { v4 as uuidv4 } from 'uuid';

// DBs simulados
let fixedIncomesDb: FixedIncome[] = [/* seus dados iniciais */];
let fixedExpensesDb: FixedExpense[] = [/* seus dados iniciais */];
let variationsDb: MonthlyVariation[] = [];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const SIMULATED_DELAY = 300;


export const fixedTransactionService = {
  // --- RENDAS FIXAS ---
  getIncomes: async (): Promise<FixedIncome[]> => {
    await delay(SIMULATED_DELAY);
    return [...fixedIncomesDb];
  },
  createIncome: async (data: Omit<FixedIncome, 'id'>): Promise<FixedIncome> => {
    await delay(SIMULATED_DELAY);
    const newItem = { ...data, id: uuidv4() };
    fixedIncomesDb.push(newItem);
    return newItem;
  },
  updateIncome: async (id: string, data: Partial<FixedIncome>): Promise<FixedIncome> => {
    await delay(SIMULATED_DELAY);
    const index = fixedIncomesDb.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Not found');
    fixedIncomesDb[index] = { ...fixedIncomesDb[index], ...data };
    return fixedIncomesDb[index];
  },
  deleteIncome: async (id: string): Promise<void> => {
    await delay(SIMULATED_DELAY);
    // Lógica de "soft delete" (atualizar endDate) deve ser feita no frontend antes de chamar update,
    // ou aqui se for um delete real. Vamos assumir delete real aqui para simplificar o CRUD.
    fixedIncomesDb = fixedIncomesDb.filter(i => i.id !== id);
  },

  // --- DESPESAS FIXAS ---
  getExpenses: async (): Promise<FixedExpense[]> => {
    await delay(SIMULATED_DELAY);
    return [...fixedExpensesDb];
  },
  createExpense: async (data: Omit<FixedExpense, 'id'>): Promise<FixedExpense> => {
    await delay(SIMULATED_DELAY);
    const newItem = { ...data, id: uuidv4() };
    fixedExpensesDb.push(newItem);
    return newItem;
  },
  updateExpense: async (id: string, data: Partial<FixedExpense>): Promise<FixedExpense> => {
    await delay(SIMULATED_DELAY);
    const index = fixedExpensesDb.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Not found');
    fixedExpensesDb[index] = { ...fixedExpensesDb[index], ...data };
    return fixedExpensesDb[index];
  },
  deleteExpense: async (id: string): Promise<void> => {
    await delay(SIMULATED_DELAY);
    fixedExpensesDb = fixedExpensesDb.filter(i => i.id !== id);
  },

  // --- VARIAÇÕES MENSAIS ---
  getVariations: async (): Promise<MonthlyVariation[]> => {
    await delay(SIMULATED_DELAY);
    return [...variationsDb];
  },
  createVariation: async (data: Omit<MonthlyVariation, 'id'>): Promise<MonthlyVariation> => {
    await delay(SIMULATED_DELAY);
    const newItem = { ...data, id: uuidv4() };
    variationsDb.push(newItem);
    return newItem;
  },
  updateVariation: async (id: string, data: Partial<MonthlyVariation>): Promise<MonthlyVariation> => {
    await delay(SIMULATED_DELAY);
    const index = variationsDb.findIndex(v => v.id === id);
    if (index === -1) throw new Error('Not found');
    variationsDb[index] = { ...variationsDb[index], ...data };
    return variationsDb[index];
  },
  deleteVariation: async (id: string): Promise<void> => {
    await delay(SIMULATED_DELAY);
    variationsDb = variationsDb.filter(v => v.id !== id);
  }
};