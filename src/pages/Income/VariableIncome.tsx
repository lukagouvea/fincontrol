import React, { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { useFinance, Transaction } from '../../context/FinanceContext';
export const VariableIncome: React.FC = () => {
  const {
    transactions,
    categories,
    addTransaction,
    updateTransaction,
    deleteTransaction
  } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Transaction | null>(null);
  // Estado para o formulário
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  // Filtrar apenas categorias de renda
  const incomeCategories = categories.filter(cat => cat.type === 'income');
  // Filtrar apenas transações de renda variável
  const variableIncomes = transactions.filter(t => !('isInstallment' in t));
  const openModal = (income?: Transaction) => {
    if (income && !('isInstallment' in income)) {
      setEditingIncome(income);
      setDescription(income.description);
      setAmount(income.amount.toString());
      setDate(income.date);
      setCategoryId(income.categoryId || '');
    } else {
      setEditingIncome(null);
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategoryId(incomeCategories[0]?.id || '');
    }
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingIncome(null);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date) return;
    const formattedAmount = parseFloat(amount.replace(',', '.'));
    if (editingIncome) {
      updateTransaction(editingIncome.id, {
        description,
        amount: formattedAmount,
        date,
        categoryId
      });
    } else {
      addTransaction({
        description,
        amount: formattedAmount,
        date,
        categoryId
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
  // Formatar data para exibição
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };
  // Obter categoria
  const getCategory = (categoryId?: string) => {
    return categories.find(c => c.id === categoryId);
  };
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Rendas Variáveis</h1>
        <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center text-sm">
          <PlusIcon className="w-4 h-4 mr-2" />
          Nova Renda Variável
        </button>
      </div>
      {/* Lista de rendas variáveis */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {variableIncomes.length > 0 ? <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
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
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {variableIncomes.map(income => {
            const category = getCategory('categoryId' in income ? income.categoryId : undefined);
            return <tr key={income.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(income.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {income.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{
                  backgroundColor: `${category.color}20`,
                  color: category.color
                }}>
                          {category.name}
                        </span> : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      {formatValue(income.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-3">
                        <button onClick={() => openModal(income)} className="text-blue-600 hover:text-blue-900">
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => deleteTransaction(income.id)} className="text-red-600 hover:text-red-900">
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>;
          })}
            </tbody>
          </table> : <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma renda variável cadastrada.
          </div>}
      </div>
      {/* Modal de renda variável */}
      {isModalOpen && <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {editingIncome ? 'Editar Renda Variável' : 'Nova Renda Variável'}
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