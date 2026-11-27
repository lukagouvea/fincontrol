import { api } from './api';
import type { RecurringPayment } from '../features/bills';

/** Contas a pagar: pagamentos de recorrentes À vista (por mês) e de parcelas À vista. */
export const billService = {
  getRecurringPayments: async (): Promise<RecurringPayment[]> => (await api.get('/recurring/payments')).data,
  /** `month` = 'YYYY-MM'; `paidAt` null desmarca. */
  setRecurringPaid: async (ruleId: string, month: string, paidAt: string | null) =>
    (await api.put(`/recurring/${ruleId}/payments/${month}`, { paidAt })).data,
  setInstallmentPaid: async (transactionId: string, paidAt: string | null) =>
    (await api.put(`/transactions/${transactionId}/paid`, { paidAt })).data,
};
