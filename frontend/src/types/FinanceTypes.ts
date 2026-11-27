export type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  description?: string;
  color: string;
  /** Chave do ícone; null/ausente = deduzido do nome. */
  icon?: string | null;
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
  /** Cartão usado; null/ausente = À vista. */
  cardId?: string | null;
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
  /** Forma de pagamento a partir deste mês (null = À vista). Ausente em respostas antigas. */
  cardId?: string | null;
}

export interface FixedTransaction extends TransactionBase {
  day: number;
  startDate: string; // ISO UTC
  endDate?: string | null;  // ISO UTC
  /** Pausa ('YYYY-MM', inclusive): não lança nesses meses. */
  pausedFrom?: string | null;
  pausedUntil?: string | null;
  /** Cartão em que a recorrência é cobrada; null = À vista. */
  cardId?: string | null;
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

export type CardColor = 'verde' | 'azul' | 'laranja' | 'grafite';

export type CardPayment = {
  id: string;
  /** 'YYYY-MM': a fatura que fecha naquele mês. */
  invoiceMonth: string;
  amount: number;
  paidAt: string;
};

export type Card = {
  id: string;
  name: string;
  last4: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: CardColor;
  archived: boolean;
  /** ISO. Faturas vencidas antes do cadastro são tratadas como pagas. */
  createdAt?: string;
  payments: CardPayment[];
};

/** Limite de uma categoria num mês. Com `repeat`, vale também nos meses seguintes. */
export type BudgetLimit = {
  /** null = limite "Geral" (parte do orçamento ainda não dividida). */
  categoryId: string | null;
  /** 'YYYY-MM' */
  month: string;
  /** null = sem limite */
  amount: number | null;
  repeat: boolean;
};

export type GoalContribution = {
  id: string;
  /** Positivo = guardou; negativo = retirou. */
  amount: number;
  date: string;
  sourceMonth: string | null;
};

export type Goal = {
  id: string;
  name: string;
  target: number;
  /** 'YYYY-MM' ou null */
  deadline: string | null;
  saved: number;
  createdAt: string;
  contributions: GoalContribution[];
};
