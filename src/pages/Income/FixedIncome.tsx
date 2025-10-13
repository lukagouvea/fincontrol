import React, { useState, useMemo } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, ArchiveIcon } from 'lucide-react';
import { useFinance, FixedIncome as FixedIncomeType } from '../../context/FinanceContext';
import { ConfirmationModal } from '../../components/Shared/ConfirmationModal'; // Supondo que você tenha este componente

export const FixedIncome: React.FC = () => {
  const {
    fixedIncomes,
    categories,
    addFixedIncome,
    updateFixedIncome,
    deleteFixedIncome
  } = useFinance();

  // Estados do modal de formulário
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<FixedIncomeType | null>(null);

  // NOVO: Estado para controlar o modal de rendas arquivadas
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  // NOVO: Estado para o modal de confirmação de exclusão
  const [incomeToDelete, setIncomeToDelete] = useState<FixedIncomeType | null>(null);

  // Estados do formulário (sem alteração)
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // NOVO: Lógica para separar rendas ativas e arquivadas
  const { activeIncomes, archivedIncomes } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera a hora para comparações de data precisas

    const active: FixedIncomeType[] = [];
    const archived: FixedIncomeType[] = [];

    fixedIncomes.forEach(income => {
      // Uma renda é ativa se não tem data de fim OU se a data de fim é hoje ou no futuro.
      const isArchived = income.endDate && new Date(income.endDate + 'T00:00:00') <= today;
      
      if (isArchived) {
        archived.push(income);
      } else {
        active.push(income);
      }
    });

    return { activeIncomes: active, archivedIncomes: archived };
  }, [fixedIncomes]);

  // Funções de formatação e manipulação de modal
  const formatDateToDDMMAAAA = (dataString: string): string => {
    if (typeof dataString !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dataString)) {
      return "Formato inválido";
    }
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const openModal = (income?: FixedIncomeType) => {
    if (income) {
      setEditingIncome(income);
      setDescription(income.description);
      setAmount(income.amount.toString());
      setDay(income.day.toString());
      setCategoryId(income.categoryId || '');
      setStartDate(income.startDate);
      setEndDate(income.endDate || '');
    } else {
      setEditingIncome(null);
      setDescription('');
      setAmount('');
      setDay('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setCategoryId('');
    }
    setIsFormModalOpen(true);
  };


  const incomeCategories = categories.filter(cat => cat.type === 'income');

  const getCategory = (categoryId: string) => {
    return incomeCategories.find(c => c.id === categoryId);
  };

  const closeModal = () => {
    setIsFormModalOpen(false);
    setEditingIncome(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !day || !startDate) return;
    const formattedAmount = parseFloat(amount.replace(',', '.'));
    const formattedDay = parseInt(day);
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

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // NOVO: Funções para o fluxo de exclusão com confirmação
  const handleRequestDelete = (income: FixedIncomeType) => {
    setIncomeToDelete(income);
  };
  const handleConfirmDelete = () => {
    if (incomeToDelete) {
      deleteFixedIncome(incomeToDelete.id);
      setIncomeToDelete(null);
    }
  };

  const handleEditArchived = (income: FixedIncomeType) => {
    // 1. Fecha o modal de rendas arquivadas
    setIsArchiveModalOpen(false);

    // 2. Abre o modal de formulário com os dados da renda clicada
    openModal(income);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Rendas Fixas</h1>
        <div className="flex items-center space-x-2">
          {archivedIncomes.length > 0 && (
            <button
              onClick={() => setIsArchiveModalOpen(true)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md flex items-center text-sm"
            >
              <ArchiveIcon className="w-4 h-4 mr-2" />
              Ver Arquivadas ({archivedIncomes.length})
            </button>
          )}
          <button
            onClick={() => openModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center text-sm"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Nova Renda Fixa
          </button>
        </div>
      </div>

      {/* Lista de rendas fixas ATIVAS */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {activeIncomes.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dia do Recebimento</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeIncomes.map(income => {
                const category = getCategory(income.categoryId);
                return (
                  <tr key={income.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{income.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${category.color}20`, color: category.color }}>
                        {category.name}
                      </span> : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{formatValue(income.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Dia {income.day}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateToDDMMAAAA(income.startDate)}
                      {income.endDate ? ` até ${formatDateToDDMMAAAA(income.endDate)}` : ' (contínua)'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-3">
                        <button onClick={() => openModal(income)} className="text-blue-600 hover:text-blue-900"><PencilIcon className="w-5 h-5" /></button>
                        <button onClick={() => handleRequestDelete(income)} className="text-red-600 hover:text-red-900"><TrashIcon className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
              )})}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma renda fixa ativa cadastrada.
          </div>
        )}
      </div>

      {/* Modal de formulário para adicionar/editar */}
       {isFormModalOpen && <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
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
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Categoria
                  </label>
                  <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required>
                    <option value="">Selecione uma categoria</option>
                    {incomeCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
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

      {/* NOVO: Modal para exibir rendas arquivadas */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Rendas Fixas Arquivadas</h3>
              <button onClick={() => setIsArchiveModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="p-6">
              {archivedIncomes.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {archivedIncomes.map(income => (
                      <tr key={income.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{income.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{formatValue(income.amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateToDDMMAAAA(income.startDate)} até {formatDateToDDMMAAAA(income.endDate!)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-3">
                            <button onClick={() => handleEditArchived(income)} className="text-blue-600 hover:text-blue-900"><PencilIcon className="w-5 h-5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-gray-500">Nenhuma renda arquivada.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NOVO: Modal de confirmação para exclusão */}
      <ConfirmationModal
        isOpen={!!incomeToDelete}
        onClose={() => setIncomeToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Deseja encerrar esta renda fixa?"
        message="A partir de hoje, esta renda não será mais lançada. Os registros de recebimentos anteriores não serão afetados."
      />
    </div>
  );
};