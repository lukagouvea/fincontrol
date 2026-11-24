export type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  description?: string;
  color: string;
  active: boolean
};

// Interface Base
export interface TransactionBase {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
  recurringRuleId?: string | null;
  type: 'income' | 'expense';
}

export interface VariableTransaction extends TransactionBase {
  date: string; // ISO UTC
}

/** Valores de um item fixo com vigência a partir de um mês. */
export interface FixedVersion {
  id?: string;
  effectiveFrom: string; // 'YYYY-MM-01'
  amount: number;
  categoryId: string | null;
  day: number;
}

export interface FixedTransaction extends TransactionBase {
  day: number;
  startDate: string; // ISO UTC
  endDate?: string | null;  // ISO UTC
  /** Histórico de valores/categoria/dia, em ordem de vigência. */
  versions?: FixedVersion[];
}

export interface VariableIncome extends VariableTransaction {}

export interface VariableExpense extends VariableTransaction {
  isInstallment: boolean;
  installmentInfo?: {
    total: number;
    current: number;
    idCompraParcelada?: string;
  };
}

export interface Parcela extends VariableExpense {
  idCompraParcelada: string;
  installmentInfo: {
    total: number;
    current: number;
  };
}

export interface FixedIncome extends FixedTransaction {}
export interface FixedExpense extends FixedTransaction {}

export interface CompraParcelada {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryId: string;
  numParcelas: number;
  parcelas: Omit<Parcela, 'id'>[];
}

export type MonthlyVariation = {
  id: string;
  fixedItemId: string;
  type: 'income' | 'expense';
  year: number;
  month: number;
  amount: number;
};

export type Transaction = VariableIncome | VariableExpense | Parcela;