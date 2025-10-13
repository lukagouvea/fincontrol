import React, { useState, useMemo } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, ArchiveIcon } from 'lucide-react';
import { useFinance, FixedExpense as FixedExpenseType } from '../../context/FinanceContext';
import { ConfirmationModal } from '../../components/Shared/ConfirmationModal'; // Supondo que você tenha este componente

export const FixedExpenses: React.FC = () => {
  const {
    fixedExpenses,
    categories,
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense
  } = useFinance();
  
  // Estados do modal de formulário
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpenseType | null>(null);
  
  // NOVO: Estado para controlar o modal de despesas arquivadas
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  
  // NOVO: Estado para o modal de confirmação de exclusão
  const [expenseToDelete, setExpenseToDelete] = useState<FixedExpenseType | null>(null);

  // Estados do formulário (sem alteração)
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const expenseCategories = categories.filter(cat => cat.type === 'expense');

  // NOVO: Lógica para separar despesas ativas e arquivadas
  const { activeExpenses, archivedExpenses } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera a hora para comparações de data precisas

    const active: FixedExpenseType[] = [];
    const archived: FixedExpenseType[] = [];

    fixedExpenses.forEach(expense => {
      // Uma despesa é ativa se não tem data de fim OU se a data de fim é hoje ou no futuro.
      const isArchived = expense.endDate && new Date(expense.endDate + 'T00:00:00') <= today;
      
      if (isArchived) {
        archived.push(expense);
      } else {
        active.push(expense);
      }
    });

    return { activeExpenses: active, archivedExpenses: archived };
  }, [fixedExpenses]);


  // ... (Suas funções de formatação, open/close modal e handleSubmit permanecem as mesmas)
    const formatDateToDDMMAAAA = (dataString : string): string => {
    // Verifica se a entrada é uma string e corresponde ao formato esperado (usando uma expressão regular)
    if (typeof dataString !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dataString)) {
      return "Formato de data inválido. Use AAAA-MM-DD.";
    }

    // Divide a string da data em ano, mês e dia
    const [ano, mes, dia] = dataString.split('-');

    // Retorna a data no novo formato DD/MM/AAAA
    return `${dia}/${mes}/${ano}`;
  };

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
    setIsFormModalOpen(true);
  };
  const closeModal = () => {
    setIsFormModalOpen(false);
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

  const handleRequestDelete = (expense: FixedExpenseType) => {
    setExpenseToDelete(expense);
  };
  const handleConfirmDelete = () => {
    if (expenseToDelete) {
      deleteFixedExpense(expenseToDelete.id);
      setExpenseToDelete(null);
    }
  };
  const handleEditArchived = (expense: FixedExpenseType) => {
    // 1. Fecha o modal de despesas arquivadas
    setIsArchiveModalOpen(false);
    
    // 2. Abre o modal de formulário com os dados da despesa clicada
    openModal(expense);
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Despesas Fixas</h1>
        {/* ALTERADO: Botões agrupados */}
        <div className="flex items-center space-x-2">
          {archivedExpenses.length > 0 && (
            <button
              onClick={() => setIsArchiveModalOpen(true)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md flex items-center text-sm"
            >
              <ArchiveIcon className="w-4 h-4 mr-2" />
              Ver Arquivadas ({archivedExpenses.length})
            </button>
          )}
          <button
            onClick={() => openModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center text-sm"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Nova Despesa Fixa
          </button>
        </div>
      </div>
      
      {/* Lista de despesas fixas ATIVAS */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* ALTERADO: Usar a lista de despesas ativas */}
        {activeExpenses.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            {/* ... o thead da sua tabela permanece o mesmo ... */}
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
              {/* ALTERADO: Mapear sobre as despesas ativas */}
              {activeExpenses.map(expense => {
                const category = getCategory(expense.categoryId);
                return (
                  <tr key={expense.id}>
                    {/* ... O JSX da sua <tr> permanece o mesmo, mas agora com o botão de deletar correto ... */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {expense.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${category.color}20`, color: category.color }}>
                        {category.name}
                      </span> : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatValue(expense.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Dia {expense.day}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateToDDMMAAAA(expense.startDate)}
                      {expense.endDate ? ` até ${formatDateToDDMMAAAA(expense.endDate)}` : ' (contínua)'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-3">
                        <button onClick={() => openModal(expense)} className="text-blue-600 hover:text-blue-900">
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleRequestDelete(expense)} className="text-red-600 hover:text-red-900">
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma despesa fixa ativa cadastrada.
          </div>
        )}
      </div>

      {/* O seu modal de formulário permanece o mesmo */}
      {isFormModalOpen && (
        // ... seu JSX do modal de formulário
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
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
        </div>
      )}
      
      {/* NOVO: Modal para exibir despesas arquivadas */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Despesas Fixas Arquivadas
              </h3>
              <button onClick={() => setIsArchiveModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="p-6">
              {archivedExpenses.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {archivedExpenses.map(expense => {
                      const category = getCategory(expense.categoryId);
                      return (
                        <tr key={expense.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{expense.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {category ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${category.color}20`, color: category.color }}>{category.name}</span> : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatValue(expense.amount)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDateToDDMMAAAA(expense.startDate)} até {formatDateToDDMMAAAA(expense.endDate!)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-3">
                              <button onClick={() => handleEditArchived(expense)} className="text-blue-600 hover:text-blue-900">
                                <PencilIcon className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-gray-500">Nenhuma despesa arquivada.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Deseja encerrar esta despesa fixa?"
        message="A partir de hoje, esta despesa não será mais lançada. Os registros de pagamentos anteriores não serão afetados."
      />
    </div>
  );
};