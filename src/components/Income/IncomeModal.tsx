import React, { useEffect, useState } from 'react';
import { XIcon } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
type IncomeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
};
export const IncomeModal: React.FC<IncomeModalProps> = ({
  isOpen,
  onClose,
  initialDate
}) => {
  const {
    categories,
    addTransaction
  } = useFinance();
  // Estado para o formulário
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  // Filtrar apenas categorias de renda
  const incomeCategories = categories.filter(cat => cat.type === 'income');
  // Resetar o formulário quando o modal é aberto
  useEffect(() => {
    if (isOpen) {
      setDescription('');
      setAmount('');
      setDate(initialDate || new Date().toISOString().split('T')[0]);
      setCategoryId(incomeCategories.length > 0 ? incomeCategories[0].id : '');
    }
  }, [isOpen, initialDate, incomeCategories]);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date) return;
    const formattedAmount = parseFloat(amount.replace(',', '.'));
    addTransaction({
      description,
      amount: formattedAmount,
      date,
      categoryId: categoryId || undefined
    });
    onClose();
  };
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Nova Renda</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Descrição
              </label>
              <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Valor (R$)
              </label>
              <input type="text" id="amount" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
            </div>
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                Data
              </label>
              <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Categoria
              </label>
              <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <option value="">Sem categoria</option>
                {incomeCategories.map(category => <option key={category.id} value={category.id}>
                    {category.name}
                  </option>)}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Cancelar
            </button>
            <button type="submit" className="ml-3 bg-green-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>;
};