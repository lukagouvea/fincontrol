import React, { useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { XIcon } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { getCurrentDateAsYYYYMMDD } from '../../utils/dateUtils';
import CurrencyInput from 'react-currency-input-field';

// Tipagem para os dados que o modal devolve no submit
export type IncomeFormData = {
  description: string;
  amount: number;
  date: string; // Formato YYYY-MM-DD
  categoryId: string;
};

type IncomeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: IncomeFormData) => void;
  initialData?: any;
  initialDate?: string;
};

export const IncomeModal: React.FC<IncomeModalProps> = ({ isOpen, onClose, onSubmit, initialData, initialDate }) => {
  const { categories } = useFinance();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string | undefined>();
  const [numericAmount, setNumericAmount] = useState<number | null>(null);
  const [date, setDate] = useState(getCurrentDateAsYYYYMMDD());
  const [categoryId, setCategoryId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const incomeCategories = useMemo(() => {
    return categories.filter(cat => cat.type === 'income');
  }, [categories]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) { // Modo Edição
        setDescription(initialData.description || '');
        // Formata o número inicial para a string que o CurrencyInput espera
        setAmount(initialData.amount?.toString()); 
        setNumericAmount(initialData.amount || null);
        // A data vem do backend como UTC, pegamos apenas a parte YYYY-MM-DD
        setDate(initialData.date ? initialData.date.split('T')[0] : getCurrentDateAsYYYYMMDD());
        setCategoryId(initialData.categoryId || '');
      } else { // Modo Criação
        setDescription('');
        setAmount(undefined);
        setNumericAmount(null);
        setDate(initialDate || getCurrentDateAsYYYYMMDD());
        setCategoryId(incomeCategories.length > 0 ? incomeCategories[0].id : '');
      }
    }
  }, [isOpen, initialData, initialData, incomeCategories]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!description || !numericAmount || numericAmount <= 0 || !date || !categoryId) {
      setIsSubmitting(false);
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    try {
      onSubmit({
        description,
        amount: numericAmount,
        date,
        categoryId: categoryId,
      });
    } catch (error) {
      alert('Ocorreu um erro ao salvar a renda. Tente novamente.');
      console.error('Erro ao salvar renda:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 m-0">
            {initialData ? 'Editar Renda Variável' : 'Nova Renda Variável'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="income-description" className="block text-sm font-medium text-gray-700">Descrição</label>
              <input type="text" id="income-description" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
            </div>
            <div>
              <label htmlFor="income-amount" className="block text-sm font-medium text-gray-700">Valor (R$)</label>
              <CurrencyInput
                id="income-amount"
                name="amount"
                placeholder="R$ 0,00"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
                value={amount}
                onValueChange={(value, name, values) => {
                  setAmount(value);
                  setNumericAmount(values?.float ?? null);
                }}
                prefix="R$ "
                intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                decimalScale={2}
                allowNegativeValue={false}
              />
            </div>
            <div>
              <label htmlFor="income-date" className="block text-sm font-medium text-gray-700">Data</label>
              <input type="date" id="income-date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
            </div>
            <div>
              <label htmlFor="income-category" className="block text-sm font-medium text-gray-700">Categoria (Opcional)</label>
              <select id="income-category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <option value="">Sem categoria</option>
                {incomeCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="ml-3 bg-green-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-green-700" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : (initialData ? 'Salvar Alterações' : 'Criar Renda')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    modalRoot
  );
};

export default React.memo(IncomeModal);
