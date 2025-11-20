import React, { useState, useMemo } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { useFinance, VariableExpense as VariableExpenseType } from '../../context/FinanceContext';
import { ConfirmationModal } from '../../components/Shared/ConfirmationModal';
import { ExpenseModal, ExpenseFormData } from '../../components/Expenses/ExpenseModal';
import { formatUTCToDDMMAAAA, parseDateInputToLocal } from '../../utils/dateUtils';

export const VariableExpenses: React.FC = () => {
  const {
    variableExpenses,
    categories,
  } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<VariableExpenseType | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<VariableExpenseType | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
  const filteredExpenses = useMemo(() => {
    return variableExpenses.filter(expense => {
      // Corrige o bug de fuso horário, tratando a data como local
      const expenseDate = parseDateInputToLocal(expense.date.split('T')[0]);
      return expenseDate.getMonth() === selectedMonth && expenseDate.getFullYear() === selectedYear;
    });
  }, [variableExpenses, selectedMonth, selectedYear]);

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear + 2 - i);

  const handleRequestDelete = (expense: VariableExpenseType) => {
    setExpenseToDelete(expense);
  };

  const handleCancelDelete = () => {
    setExpenseToDelete(null);
  };

  const handleConfirmDelete = () => {
    if (expenseToDelete) {
      console.log("Deletando despesa:", expenseToDelete.id); // Lógica a ser implementada
      setExpenseToDelete(null);
    }
  };

  let confirmationMessage = "Você tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.";
  
  const handleOpenCreateModal = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };
  
  const handleOpenEditModal = (expense: VariableExpenseType) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };
  
  const handleModalSubmit = (formData: ExpenseFormData) => {
    console.log("Submetendo dados da despesa", formData); // Lógica a ser implementada
    setIsModalOpen(false);
  };

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  
  const getCategory = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Despesas Variáveis</h1>
        <div className="flex items-center space-x-2">
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm">
            {months.map((month, index) => <option key={index} value={index}>{month}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm">
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
          <button onClick={handleOpenCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center text-sm">
            <PlusIcon className="w-4 h-4 mr-2" />
            Nova Despesa
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredExpenses.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.map(expense => {
                const category = getCategory(expense.categoryId);
                return (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatUTCToDDMMAAAA(expense.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {expense.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${category.color}20`, color: category.color }}>{category.name}</span> : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{formatValue(expense.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-3">
                        <button onClick={() => handleOpenEditModal(expense)} className="text-blue-600 hover:text-blue-900"><PencilIcon className="w-5 h-5" /></button>
                        <button onClick={() => handleRequestDelete(expense)} className="text-red-600 hover:text-red-900"><TrashIcon className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma despesa variável para o período selecionado.
          </div>
        )}
      </div>
      
      <ExpenseModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingExpense}
      />
      
      <ConfirmationModal
        isOpen={!!expenseToDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message={confirmationMessage}
      />
    </div>
  );
};