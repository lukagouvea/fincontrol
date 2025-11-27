// src/components/Income/FixedIncomeModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';import { Loader2, XIcon } from 'lucide-react';
import CurrencyInput from 'react-currency-input-field';
import { formatDateToYYYYMMDD, getCurrentDateAsYYYYMMDD } from '../../utils/dateUtils';
import { useCategories } from '../../hooks/useCategories';

// Tipos para as props e os dados do formulário
export type FixedIncomeFormData = {
  description: string;
  amount: number;
  day: number;
  categoryId: string; // Categoria é opcional para rendas
  startDate: string;
  endDate?: string;
};

type FixedIncomeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FixedIncomeFormData) => void;
  initialData?: any;
  isLoading?: boolean;
};

export const FixedIncomeModal: React.FC<FixedIncomeModalProps> = ({ isOpen, onClose, onSubmit, initialData, isLoading = false }) => {
  const { data : categories = [] } = useCategories();

  // O estado do formulário vive DENTRO do modal
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string | undefined>();
  const [numericAmount, setNumericAmount] = useState<number | null>(null);
  const [day, setDay] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const incomeCategories = useMemo(() => categories.filter(cat => cat.type === 'income' && cat.active !== false), [categories]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) { // Modo de edição
        setDescription(initialData.description || '');
        setAmount(initialData.amount?.toString());
        setNumericAmount(initialData.amount || null);
        setDay(initialData.day?.toString() || '');
        setCategoryId(initialData.categoryId || '');
        setStartDate(initialData.startDate ? formatDateToYYYYMMDD(new Date(initialData.startDate)) : '');
        setEndDate(initialData.endDate ? formatDateToYYYYMMDD(new Date(initialData.endDate)) : '');      } else { // Modo de criação
        setDescription('');
        setAmount(undefined);
        setNumericAmount(null);
        setDay('');
        setCategoryId(incomeCategories.length > 0 ? incomeCategories[0].id : '');
        setStartDate(getCurrentDateAsYYYYMMDD());
        setEndDate('');
      }
    }
  }, [isOpen, initialData, incomeCategories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !numericAmount || numericAmount <= 0 || !day || !startDate) {
      alert('Por favor, preencha os campos obrigatórios (Descrição, Valor, Dia e Data de Início).');
      return;
    }
    const formattedDay = parseInt(day);
    if (formattedDay < 1 || formattedDay > 31) {
      alert('O dia do mês deve estar entre 1 e 31.');
      return;
    }

    // Devolve os dados para o componente pai
    try {
      onSubmit({
        description,
        amount: numericAmount,
        day: formattedDay,
        categoryId: categoryId,
        startDate,
        endDate: endDate || undefined,
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  if (!isOpen) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 m-0">{initialData ? 'Editar Renda Fixa' : 'Nova Renda Fixa'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500"><XIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="income-description-fixed" className="block text-sm font-medium text-gray-700">Descrição</label>
              <input type="text" id="income-description-fixed" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
            </div>
            <div>
              <label htmlFor="income-amount-fixed" className="block text-sm font-medium text-gray-700">Valor (R$)</label>
              <CurrencyInput id="income-amount-fixed" name="amount" placeholder="R$ 0,00" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" 
                required value={amount} onValueChange={(value, name, values) => { 
                  setAmount(value); setNumericAmount(values?.float ?? null); }} 
                prefix="R$ " intlConfig={{ locale: 'pt-BR', currency: 'BRL' }} 
                decimalScale={2} allowNegativeValue={false} />
            </div>
            <div>
              <label htmlFor="income-category-fixed" className="block text-sm font-medium text-gray-700">Categoria (Opcional)</label>
              <select id="income-category-fixed" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                <option value="">Sem categoria</option>
                {incomeCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="income-day-fixed" className="block text-sm font-medium text-gray-700">Dia do Recebimento</label>
              <input type="number" id="income-day-fixed" value={day} onChange={e => setDay(e.target.value)} min="1" max="31" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
            </div>
            <div>
              <label htmlFor="income-startDate-fixed" className="block text-sm font-medium text-gray-700">Data de Início</label>
              <input type="date" id="income-startDate-fixed" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
            </div>
            <div>
              <label htmlFor="income-endDate-fixed" className="block text-sm font-medium text-gray-700">Data de Término (Opcional)</label>
              <input type="date" id="income-endDate-fixed" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
            </div>
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
    </div>,
    modalRoot
  );
};