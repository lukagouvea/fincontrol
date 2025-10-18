// src/components/Expenses/FixedExpenseModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useFinance } from '../../context/FinanceContext';
import { XIcon } from 'lucide-react';
import CurrencyInput from 'react-currency-input-field';
import { getCurrentDateAsYYYYMMDD } from '../../utils/dateUtils';

// Tipos para as props e os dados do formulário
export type FixedExpenseFormData = {
  description: string;
  amount: number;
  day: number;
  categoryId: string;
  startDate: string;
  endDate?: string;
};

type FixedExpenseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FixedExpenseFormData) => void;
  initialData?: any;
};

export const FixedExpenseModal: React.FC<FixedExpenseModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const { categories } = useFinance();

  // O estado do formulário agora vive DENTRO do modal
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string | undefined>();
  const [numericAmount, setNumericAmount] = useState<number | null>(null);
  const [day, setDay] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const expenseCategories = useMemo(() => categories.filter(cat => cat.type === 'expense'), [categories]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) { // Modo de edição
        setDescription(initialData.description || '');
        setAmount(initialData.amount?.toString());
        setNumericAmount(initialData.amount || null);
        setDay(initialData.day?.toString() || '');
        setCategoryId(initialData.categoryId || '');
        setStartDate(initialData.startDate ? initialData.startDate.split('T')[0] : '');
        setEndDate(initialData.endDate ? initialData.endDate.split('T')[0] : '');
      } else { // Modo de criação
        setDescription('');
        setAmount(undefined);
        setNumericAmount(null);
        setDay('');
        setCategoryId(expenseCategories.length > 0 ? expenseCategories[0].id : '');
        setStartDate(getCurrentDateAsYYYYMMDD());
        setEndDate('');
      }
    }
  }, [isOpen, initialData, expenseCategories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !numericAmount || numericAmount <= 0 || !day || !categoryId || !startDate) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    const formattedDay = Number.parseInt(day);
    if (formattedDay < 1 || formattedDay > 31) {
      alert('O dia do mês deve estar entre 1 e 31.');
      return;
    }

    setIsSubmitting(true);
    // Devolve os dados para o componente pai
    try {
      onSubmit({
        description,
        amount: numericAmount,
        day: formattedDay,
        categoryId,
      startDate,
      endDate: endDate || undefined,
    });
  } catch (error) {
    console.error('Error submitting form:', error);
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
          <h3 className="text-lg font-medium text-gray-900 m-0">{initialData ? 'Editar Despesa Fixa' : 'Nova Despesa Fixa'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500"><XIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* ... (todos os seus inputs: Descrição, Valor, Categoria, etc.) ... */}
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descrição</label>
                <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
            </div>
            <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                <CurrencyInput id="amount" name="amount" placeholder="R$ 0,00" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required value={amount} onValueChange={(value, name, values) => { setAmount(value); setNumericAmount(values?.float ?? null); }} prefix="R$ " intlConfig={{ locale: 'pt-BR', currency: 'BRL' }} decimalScale={2} allowNegativeValue={false} />
            </div>
            <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoria</label>
                <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required>
                    {expenseCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="day" className="block text-sm font-medium text-gray-700">Dia do Vencimento</label>
                <input type="number" id="day" value={day} onChange={e => setDay(e.target.value)} min="1" max="31" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
            </div>
            <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Data de Início</label>
                <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
            </div>
            <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Data de Término (Opcional)</label>
                <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md">Cancelar</button>
            <button type="submit" className="ml-3 bg-blue-600 text-white py-2 px-4 rounded-md" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : (initialData ? 'Salvar' : 'Criar')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    modalRoot
  );
};