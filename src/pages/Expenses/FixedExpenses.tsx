import React, { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { useFinance, FixedExpense as FixedExpenseType } from '../../context/FinanceContext';
export const FixedExpenses: React.FC = () => {
  const {
    fixedExpenses,
    categories,
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense
  } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpenseType | null>(null);
  // Estado para o formulário
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Filtrar apenas categorias de despesa
  const expenseCategories = categories.filter(cat => cat.type === 'expense');
  const openModal = (expense?: FixedExpenseType) => {
    if (expense) {
      setEditingExpense(expense);
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setDay(expense.day.toString());
      setCategoryId(expense.categoryId);
      setStartDate(expense.startDate);
      setEndDate(expense.endDate || '');
    } else {
      setEditingExpense(null);
      setDescription('');
      setAmount('');
      setDay('');
      setCategoryId(expenseCategories[0]?.id || '');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
    }
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !day || !categoryId || !startDate) return;
    const formattedAmount = parseFloat(amount.replace(',', '.'));
    const formattedDay = parseInt(day);
    // Validar dia do mês
    if (formattedDay < 1 || formattedDay > 31) {
      alert('O dia do mês deve estar entre 1 e 31.');
      return;
    }
    if (editingExpense) {
      updateFixedExpense(editingExpense.id, {
        description,
        amount: formattedAmount,
        day: formattedDay,
        categoryId,
        startDate,
        endDate: endDate || undefined
      });
    } else {
      addFixedExpense({
        description,
        amount: formattedAmount,
        day: formattedDay,
        categoryId,
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
  // Obter categoria
  const getCategory = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Despesas Fixas</h1>
        <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center text-sm">
          <PlusIcon className="w-4 h-4 mr-2" />
          Nova Despesa Fixa
        </button>
      </div>
      {/* Lista de despesas fixas */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {fixedExpenses.length > 0 ? <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dia do Vencimento
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
              {fixedExpenses.map(expense => {
            const category = getCategory(expense.categoryId);
            return <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {expense.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{
                  backgroundColor: `${category.color}20`,
                  color: category.color
                }}>
                          {category.name}
                        </span> : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatValue(expense.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Dia {expense.day}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(expense.startDate).toLocaleDateString('pt-BR')}
                      {expense.endDate ? ` até ${new Date(expense.endDate).toLocaleDateString('pt-BR')}` : ' (contínua)'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-3">
                        <button onClick={() => openModal(expense)} className="text-blue-600 hover:text-blue-900">
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => deleteFixedExpense(expense.id)} className="text-red-600 hover:text-red-900">
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>;
          })}
            </tbody>
          </table> : <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma despesa fixa cadastrada.
          </div>}
      </div>
      {/* Modal de despesa fixa */}
      {isModalOpen && <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {editingExpense ? 'Editar Despesa Fixa' : 'Nova Despesa Fixa'}
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
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Categoria
                  </label>
                  <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required>
                    {expenseCategories.map(category => <option key={category.id} value={category.id}>
                        {category.name}
                      </option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="day" className="block text-sm font-medium text-gray-700">
                    Dia do Vencimento
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
                    Se não for preenchido, a despesa será considerada contínua.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={closeModal} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Cancelar
                </button>
                <button type="submit" className="ml-3 bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  {editingExpense ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>}
    </div>;
};