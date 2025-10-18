// src/components/Shared/VariationModal.tsx

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { XIcon } from 'lucide-react';
import CurrencyInput from 'react-currency-input-field';

type VariationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { year: number, month: number, amount: number }) => void;
  itemDescription: string;
  defaultAmount: number;
  existingVariations: any[];
  formatValue: (value: number) => string;
  formatMonthYear: (month: number, year: number) => string;
};

export const VariationModal: React.FC<VariationModalProps> = ({ isOpen, onClose, onSubmit, itemDescription, defaultAmount, existingVariations, formatValue, formatMonthYear }) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [amount, setAmount] = useState<string | undefined>();
  const [numericAmount, setNumericAmount] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const currentVariation = existingVariations.find(v => v.year === currentYear && v.month === currentMonth);
      const initialAmount = currentVariation ? currentVariation.amount : defaultAmount;
      
      setYear(currentYear);
      setMonth(currentMonth);
      setNumericAmount(initialAmount);
      setAmount(initialAmount.toString());
    }
  }, [isOpen, defaultAmount, existingVariations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount === null) return;
    onSubmit({ year, month, amount: numericAmount });
  };

  if (!isOpen) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-60 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 m-0">Variação Mensal para {itemDescription}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div className="flex space-x-4">
              <div className="flex-1">
                <label htmlFor="variationMonth" className="block text-sm font-medium text-gray-700">Mês</label>
                <select id="variationMonth" value={month} onChange={e => setMonth(parseInt(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required>
                  {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label htmlFor="variationYear" className="block text-sm font-medium text-gray-700">Ano</label>
                <select id="variationYear" value={year} onChange={e => setYear(parseInt(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div className="flex justify-between">
                <label htmlFor="variationAmount" className="block text-sm font-medium text-gray-700">Valor para este mês (R$)</label>
                <span className="text-xs text-gray-500">Padrão: {formatValue(defaultAmount)}</span>
              </div>
              <CurrencyInput id="variationAmount" name="variationAmount" placeholder="R$ 0,00" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required value={amount} onValueChange={(value, name, values) => { setAmount(value); setNumericAmount(values?.float ?? null); }} prefix="R$ " intlConfig={{ locale: 'pt-BR', currency: 'BRL' }} decimalScale={2} allowNegativeValue={false} />
              <p className="mt-1 text-xs text-gray-500">Se o valor for igual ao padrão, a variação será removida.</p>
            </div>
            {existingVariations.length > 0 && <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Variações Existentes</h4>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Período</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {existingVariations.map((v: any) => <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-xs">{formatMonthYear(v.month, v.year)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-blue-600">{formatValue(v.amount)}</td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            </div>}
          </div>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="ml-3 bg-blue-600 text-white py-2 px-4 rounded-md">Salvar Variação</button>
          </div>
        </form>
      </div>
    </div>,
    modalRoot
  );
};