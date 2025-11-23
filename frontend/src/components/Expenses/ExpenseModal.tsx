import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Loader2, XIcon } from 'lucide-react';
import CurrencyInput from 'react-currency-input-field';
import { useCategories } from '../../hooks/useCategories';
import { formatDateToYYYYMMDD, getCurrentDateAsYYYYMMDD } from '../../utils/dateUtils';

// Tipagem para os dados que o modal devolve no submit
export type ExpenseFormData = {
  description: string;
  amount: number;
  date: string;
  categoryId: string;
  isInstallment: boolean;
  installmentCount: number;
};

type ExpenseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseFormData) => void;
  initialData?: any; 
  initialDate?: string;
  isLoading?: boolean
};

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, onSubmit, initialData, initialDate, isLoading = false }) => {
  const { data: categories = [] } = useCategories();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string | undefined>();
  const [numericAmount, setNumericAmount] = useState<number | null>(null);
  const [date, setDate] = useState(getCurrentDateAsYYYYMMDD());
  const [categoryId, setCategoryId] = useState('');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState('2');

  const expenseCategories = useMemo(() => categories.filter(cat => cat.type === 'expense' && cat.active !== false), [categories]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) { // Modo Edição
        setDescription(initialData.description || '');
        // Formata o valor numérico inicial para a string que o CurrencyInput espera
        setAmount(initialData.amount?.toString()); 
        setNumericAmount(initialData.amount || null);
        setDate(initialData.date ? formatDateToYYYYMMDD(new Date(initialData.date)) : getCurrentDateAsYYYYMMDD());
        setCategoryId(initialData.categoryId || '');
        setIsInstallment(initialData.isInstallment || false);
        setInstallmentCount(initialData.installmentInfo?.total?.toString() || '2');
      } else { // Modo Criação
        setDescription('');
        setAmount(undefined);
        setNumericAmount(null);
        setDate(initialDate || getCurrentDateAsYYYYMMDD());
        setCategoryId(expenseCategories.length > 0 ? expenseCategories[0].id : '');
        setIsInstallment(false);
        setInstallmentCount('2');
      }
    }
  }, [isOpen, initialData, expenseCategories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !numericAmount || numericAmount <= 0 || !date || !categoryId) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    onSubmit({
      description,
      amount: numericAmount,
      date,
      categoryId,
      isInstallment,
      installmentCount: parseInt(installmentCount)
    });
  };

  if (!isOpen) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return ReactDOM.createPortal(
    (<div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {initialData ? 'Editar Despesa' : 'Nova Despesa'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500"><XIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descrição</label>
              <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Valor (R$)</label>
              <CurrencyInput id="amount" name="amount" placeholder="R$ 0,00" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required value={amount} onValueChange={(value, name, values) => { setAmount(value); setNumericAmount(values?.float ?? null); }} prefix="R$ " intlConfig={{ locale: 'pt-BR', currency: 'BRL' }} decimalScale={2} allowNegativeValue={false} />
              
            </div>
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">Data</label>
              <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoria</label>
              <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required>
                <option value="" disabled>Selecione uma categoria</option>
                {expenseCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
            {!initialData && (
              <>
                <div className="flex items-center">
                  <input type="checkbox" id="isInstallment" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <label htmlFor="isInstallment" className="ml-2 block text-sm text-gray-900">Pagamento Parcelado</label>
                </div>
                {isInstallment && (
                  <div>
                    <label htmlFor="installmentCount" className="block text-sm font-medium text-gray-700">Número de Parcelas</label>
                    <input type="number" id="installmentCount" value={installmentCount} onChange={e => setInstallmentCount(e.target.value)} min="2" max="48" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
                  </div>
                )}
              </>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md mr-3 hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="bg-blue-600 py-2 px-4 border border-transparent rounded-md text-white hover:bg-blue-700 disabled:bg-blue-400 flex items-center" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {initialData ? 'Salvar' : 'Criar'}            
            </button>
          </div>
        </form>
      </div>
    </div>), modalRoot);
};

export default React.memo(ExpenseModal);