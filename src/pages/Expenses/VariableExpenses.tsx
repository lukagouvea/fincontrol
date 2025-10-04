import React, { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { useFinance, Transaction, VariableExpense } from '../../context/FinanceContext';
export const VariableExpenses: React.FC = () => {
  const {
    transactions,
    categories,
    addTransaction,
    updateTransaction,
    deleteTransaction
  } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<VariableExpense | null>(null);
  // Estado para o formulário
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState('1');
  // Filtrar apenas categorias de despesa
  const expenseCategories = categories.filter(cat => cat.type === 'expense');
  // Filtrar apenas transações de despesa variável
  const variableExpenses = transactions.filter(t => 'isInstallment' in t) as VariableExpense[];
  
  const formatDateToYYYYMMDD = (dataString : string): string => {
    // Verifica se a entrada é uma string e corresponde ao formato esperado (usando uma expressão regular)
    if (typeof dataString !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dataString)) {
      return "Formato de data inválido. Use AAAA-MM-DD.";
    }

    // Divide a string da data em ano, mês e dia
    const [ano, mes, dia] = dataString.split('-');

    // Retorna a data no novo formato DD/MM/AAAA
    return `${dia}/${mes}/${ano}`;
  };
  
  const openModal = (expense?: VariableExpense) => {
    if (expense) {
      setEditingExpense(expense);
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setDate(expense.date);
      setCategoryId(expense.categoryId);
      setIsInstallment(expense.isInstallment);
      setInstallmentCount(expense.installmentInfo?.total.toString() || '1');
    } else {
      setEditingExpense(null);
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategoryId(expenseCategories[0]?.id || '');
      setIsInstallment(false);
      setInstallmentCount('1');
    }
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date || !categoryId) return;
    const formattedAmount = parseFloat(amount.replace(',', '.'));
    if (editingExpense) {
      updateTransaction(editingExpense.id, {
        description,
        amount: formattedAmount,
        date,
        categoryId,
        isInstallment,
        installmentInfo: isInstallment ? {
          total: parseInt(installmentCount),
          current: editingExpense.installmentInfo?.current || 1
        } : undefined
      });
    } else {
      if (isInstallment && parseInt(installmentCount) > 1) {
        // Criar despesa parcelada
        const totalInstallments = parseInt(installmentCount);
        const baseDate = new Date(date);
        for (let i = 0; i < totalInstallments; i++) {
          const installmentDate = new Date(baseDate);
          installmentDate.setMonth(baseDate.getMonth() + i);
          addTransaction({
            description,
            amount: formattedAmount,
            date: installmentDate.toISOString().split('T')[0],
            categoryId,
            isInstallment: true,
            installmentInfo: {
              total: totalInstallments,
              current: i + 1
            }
          });
        }
      } else {
        // Criar despesa única
        addTransaction({
          description,
          amount: formattedAmount,
          date,
          categoryId,
          isInstallment: false
        });
      }
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
    return formatDateToYYYYMMDD(dateStr);
  };
  // Obter categoria
  const getCategory = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Despesas Variáveis</h1>
        <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center text-sm">
          <PlusIcon className="w-4 h-4 mr-2" />
          Nova Despesa Variável
        </button>
      </div>
      {/* Lista de despesas variáveis */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {variableExpenses.length > 0 ? <table className="min-w-full divide-y divide-gray-200">
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
              {variableExpenses.map(expense => {
            const category = getCategory(expense.categoryId);
            return <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {expense.description}
                      {expense.isInstallment && expense.installmentInfo && <span className="ml-2 text-xs text-gray-500">
                          ({expense.installmentInfo.current}/
                          {expense.installmentInfo.total})
                        </span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{
                  backgroundColor: `${category.color}20`,
                  color: category.color
                }}>
                          {category.name}
                        </span> : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                      {formatValue(expense.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-3">
                        <button onClick={() => openModal(expense)} className="text-blue-600 hover:text-blue-900">
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => deleteTransaction(expense.id)} className="text-red-600 hover:text-red-900">
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>;
          })}
            </tbody>
          </table> : <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma despesa variável cadastrada.
          </div>}
      </div>
      {/* Modal de despesa variável */}
      {isModalOpen && <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {editingExpense ? 'Editar Despesa Variável' : 'Nova Despesa Variável'}
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
                  <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required>
                    {expenseCategories.map(category => <option key={category.id} value={category.id}>
                        {category.name}
                      </option>)}
                  </select>
                </div>
                {!editingExpense && <>
                    <div className="flex items-center">
                      <input type="checkbox" id="isInstallment" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                      <label htmlFor="isInstallment" className="ml-2 block text-sm text-gray-900">
                        Pagamento Parcelado
                      </label>
                    </div>
                    {isInstallment && <div>
                        <label htmlFor="installmentCount" className="block text-sm font-medium text-gray-700">
                          Número de Parcelas
                        </label>
                        <input type="number" id="installmentCount" value={installmentCount} onChange={e => setInstallmentCount(e.target.value)} min="2" max="48" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
                      </div>}
                  </>}
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