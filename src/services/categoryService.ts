import { Category } from '../types/FinanceTypes';
import { v4 as uuidv4 } from 'uuid';

// Simulação de Banco de Dados
let categoriesDb: Category[] = [
  // ... seus dados iniciais de categorias aqui
  { id: '1', name: 'Salário', type: 'income', color: '#4caf50' },
  { id: '2', name: 'Freelance', type: 'income', color: '#8bc34a' },
  { id: '3', name: 'Moradia', type: 'expense', color: '#f44336' },
  // ...
];

const SIMULATED_DELAY = 300;

export const categoryService = {
  getAll: async (): Promise<Category[]> => {
    return new Promise(resolve => setTimeout(() => resolve([...categoriesDb]), SIMULATED_DELAY));
  },

  create: async (data: Omit<Category, 'id'>): Promise<Category> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const newItem: Category = { ...data, id: uuidv4() };
        categoriesDb.push(newItem);
        resolve(newItem);
      }, SIMULATED_DELAY);
    });
  },

  update: async (id: string, data: Partial<Category>): Promise<Category> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = categoriesDb.findIndex(c => c.id === id);
        if (index === -1) return reject('Categoria não encontrada');
        
        categoriesDb[index] = { ...categoriesDb[index], ...data };
        resolve(categoriesDb[index]);
      }, SIMULATED_DELAY);
    });
  },

  delete: async (id: string): Promise<void> => {
    return new Promise(resolve => {
      setTimeout(() => {
        categoriesDb = categoriesDb.filter(c => c.id !== id);
        resolve();
      }, SIMULATED_DELAY);
    });
  }
};