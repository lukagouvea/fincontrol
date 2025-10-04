import React, { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { useFinance, FixedIncome as FixedIncomeType } from '../context/FinanceContext';
export const FixedIncome: React.FC = () => {
  const {
    fixedIncomes,
    addFixedIncome,
    updateFixedIncome,
    deleteFixedIncome
  } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<FixedIncomeType | null>(null);
  // Estado para o formulário
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const openModal = (income?: FixedIncomeType) => {
    if (income) {
      setEditingIncome(income);
      setDescription(income.description);
      setAmount(income.amount.toString());
      setDay(income.day.toString());
      setStartDate(income.startDate);
      setEndDate(income.endDate || '');
    } else {
      setEditingIncome(null);
      setDescription('');
      setAmount('');
      setDay('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
    }
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingIncome(null);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !day || !startDate) return;
    const formattedAmount = parseFloat(amount.replace(',', '.'));
    const formattedDay = parseInt(day);
    // Validar dia do mês
    if (formattedDay < 1 || formattedDay > 31) {
      alert('O dia do mês deve estar entre 1 e 31.');
      return;
    }
    if (editingIncome) {
      updateFixedIncome(editingIncome.id, {
        description,
        amount: formattedAmount,
        day: formattedDay,
        startDate,
        endDate: endDate || undefined
      });
    } else {
      addFixedIncome({
        description,
        amount: formattedAmount,
        day: formattedDay,
        startDate,
        endDate: endDate || undefined
      });
    }
    closeModal();
  };
  // Formatar valor para exibição
  const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Rendas Fixas</h1>
        <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center text-sm">
          <PlusIcon className="w-4 h-4 mr-2" />
          Nova Renda Fixa
        </button>
      </div>
      {/* Lista de rendas fixas */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {fixedIncomes.length > 0 ? <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dia do Recebimento
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fixedIncomes.map(income => <tr key={income.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {income.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatValue(income.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Dia {income.day}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(income.startDate).toLocaleDateString('pt-BR')}
                    {income.endDate ? ` até ${new Date(income.endDate).toLocaleDateString('pt-BR')}` : ' (contínua)'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-3">
                      <button onClick={() => openModal(income)} className="text-blue-600 hover:text-blue-900">
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => deleteFixedIncome(income.id)} className="text-red-600 hover:text-red-900">
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>)}
            </tbody>
          </table> : <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma renda fixa cadastrada.
          </div>}
      </div>
      {/* Modal de renda fixa */}
      {isModalOpen && <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {editingIncome ? 'Editar Renda Fixa' : 'Nova Renda Fixa'}
              </h3>
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
                  <label htmlFor="day" className="block text-sm font-medium text-gray-700">
                    Dia do Recebimento
                  </label>
                  <input type="number" id="day" value={day} onChange={e => setDay(e.target.value)} min="1" max="31" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
                </div>
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                    Data de Início
                  </label>
                  <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                    Data de Término (Opcional)
                  </label>
                  <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                  <p className="mt-1 text-xs text-gray-500">
                    Se não for preenchido, a renda será considerada contínua.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={closeModal} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Cancelar
                </button>
                <button type="submit" className="ml-3 bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  {editingIncome ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>}
    </div>;
};