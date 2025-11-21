import { Transaction, CompraParcelada, Parcela } from '../types/FinanceTypes';
import { v4 as uuidv4 } from 'uuid';

// DBs simulados
let transactionsDb: Transaction[] = [/* dados iniciais de transações */];
let comprasParceladasDb: CompraParcelada[] = [/* dados iniciais */];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const SIMULATED_DELAY = 300;


export const transactionService = {
  getAll: async (): Promise<Transaction[]> => {
    await delay(SIMULATED_DELAY);
    return [...transactionsDb];
  },

  getAllComprasParceladas: async (): Promise<CompraParcelada[]> => {
    await delay(SIMULATED_DELAY);
    return [...comprasParceladasDb];
  },

  create: async (data: Omit<Transaction, 'id'>): Promise<Transaction> => {
    await delay(SIMULATED_DELAY);
    const newItem = { ...data, id: uuidv4() } as Transaction;
    transactionsDb.push(newItem);
    return newItem;
  },

  update: async (id: string, data: Partial<Transaction>): Promise<Transaction> => {
    await delay(SIMULATED_DELAY);
    const index = transactionsDb.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Not found');
    transactionsDb[index] = { ...transactionsDb[index], ...data } as Transaction;
    return transactionsDb[index];
  },

  delete: async (id: string): Promise<void> => {
    await delay(SIMULATED_DELAY);
    // Verifica se é parcela para deletar a compra inteira (simulando regra de cascade do banco)
    const transaction = transactionsDb.find(t => t.id === id);
    
    if (transaction && 'idCompraParcelada' in transaction && transaction.idCompraParcelada) {
       // Se for parcela, deleta a compra e todas as parcelas associadas
       const compraId = transaction.idCompraParcelada;
       comprasParceladasDb = comprasParceladasDb.filter(c => c.id !== compraId);
       transactionsDb = transactionsDb.filter(t => 
         !('idCompraParcelada' in t) || t.idCompraParcelada !== compraId
       );
    } else {
       transactionsDb = transactionsDb.filter(t => t.id !== id);
    }
  },

  // Lógica complexa simulada no backend
  createCompraParcelada: async (compraData: Omit<CompraParcelada, 'id'>): Promise<{ compra: CompraParcelada, parcelas: Transaction[] }> => {
    await delay(SIMULATED_DELAY); // Operação mais pesada
    
    const compraId = uuidv4();
    const newCompra: CompraParcelada = { ...compraData, id: compraId };
    
    // Gera as parcelas (backend logic)
    const novasParcelas: Transaction[] = compraData.parcelas.map(p => ({
      ...p,
      id: uuidv4(),
      idCompraParcelada: compraId,
      isInstallment: true,
    } as Parcela));

    comprasParceladasDb.push(newCompra);
    transactionsDb.push(...novasParcelas);

    return { compra: newCompra, parcelas: novasParcelas };
  }
};