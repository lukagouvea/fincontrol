import { 
  FixedTransaction, 
  VariableTransaction, 
  TransactionBase, 
  VariableExpense 
} from '../types/FinanceTypes';

// Verifica se é uma transação fixa (tem dia de vencimento/recebimento)
export const isFixed = (item: TransactionBase): item is FixedTransaction => {
  return (item as FixedTransaction).day !== undefined;
};

// Verifica se é uma transação variável (tem data específica)
export const isVariable = (item: TransactionBase): item is VariableTransaction => {
  return (item as VariableTransaction).date !== undefined;
};

// Verifica se é uma despesa parcelada/variável
export const isVariableExpense = (item: TransactionBase): item is VariableExpense => {
  return (item as VariableExpense).isInstallment !== undefined;
};