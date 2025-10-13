import React, { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { Parcela, Transaction, useFinance, VariableExpense } from '../../context/FinanceContext';
import { ConfirmationModal } from '../../components/Shared/ConfirmationModal';

export const VariableExpenses: React.FC = () => {
  const {
    transactions,
    categories,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCompraParcelada
  } = useFinance();

  // ... (seus estados de formulário e modal permanecem os mesmos)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<VariableExpense | Parcela | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState('1');
  const [expenseToDelete, setExpenseToDelete] = useState<Transaction | null>(null);

  // NOVO: Estados para controlar o filtro de data
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const expenseCategories = categories.filter(cat => cat.type === 'expense');
  const variableExpenses = transactions.filter(t => 'isInstallment' in t) as VariableExpense[];

  // NOVO: Lógica de filtragem por mês e ano
  const filteredExpenses = variableExpenses.filter(expense => {
    // Atenção: new Date() pode ter problemas com fuso horário. Veja nota no final.
    const expenseDate = new Date(expense.date + 'T00:00:00');
    return expenseDate.getMonth() === selectedMonth && expenseDate.getFullYear() === selectedYear;
  });

  // NOVO: Gerar opções para os filtros de mês e ano
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear + 2 - i);

  // ... (suas funções openModal, closeModal, generateParcelas, handleSubmit, etc. permanecem as mesmas)
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

  const handleRequestDelete = (expense: Transaction) => {
    setExpenseToDelete(expense);
  };

  const handleCancelDelete = () => {
    setExpenseToDelete(null);
  };

  const handleConfirmDelete = () => {
    if (expenseToDelete) {
      deleteTransaction(expenseToDelete.id); // Chama a função do seu context
      setExpenseToDelete(null); // Fecha o modal
    }
  };

  let confirmationMessage = "Você tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.";
  if (expenseToDelete?.isInstallment) {
    confirmationMessage = "Ao excluir esta parcela, todas as outras parcelas da mesma compra também serão removidas. Deseja continuar?";
  }
  
  const openModal = (expense?: VariableExpense & Parcela) => {
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

  const generateParcelas = (valorTotal: number, numeroParcelas: number, description:string, date:string, categoryId:string) => {
    // 1. Validação dos dados de entrada
    if (valorTotal <= 0 || numeroParcelas <= 0) {
      throw new Error("O valor total e o número de parcelas devem ser positivos.");
    }
    if (!Number.isInteger(numeroParcelas)) {
      throw new Error("O número de parcelas deve ser um inteiro.");
    }

    // 2. Converter o valor total para centavos para trabalhar com inteiros
    const valorTotalEmCentavos = Math.round(valorTotal * 100);

    // 3. Calcular o valor base de cada parcela e o resto da divisão
    const valorBaseParcelaEmCentavos = Math.floor(valorTotalEmCentavos / numeroParcelas);
    const restoEmCentavos = valorTotalEmCentavos % numeroParcelas;

    const parcelas : Omit<Parcela, 'id' | 'idCompraParcelada'>[] = [];
    const baseDate = new Date(date);
    // 4. Gerar as parcelas, distribuindo o resto
    for (let i = 0; i < numeroParcelas; i++) {
      let valorDaParcela = valorBaseParcelaEmCentavos;
      // Adiciona 1 centavo às primeiras parcelas para distribuir o resto
      if (i < restoEmCentavos) {
        valorDaParcela += 1;
      }
      const installmentDate = new Date(baseDate);
      installmentDate.setMonth(baseDate.getMonth() + i);
      // 5. Converte o valor de volta para decimal e adiciona ao array
      parcelas.push({
        description: description,
        amount: valorDaParcela/100,
        date: installmentDate.toISOString().split('T')[0],
        categoryId: categoryId,
        isInstallment: true,
        installmentInfo: {
          total: numeroParcelas,
          current: i+1
        }
      });
    }

    return parcelas;
  }

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

        const installmentDate = new Date(date);
        const compraParcelada = {
          description: description,
          amount: formattedAmount,
          date: installmentDate.toISOString().split('T')[0],
          categoryId: categoryId,
          numParcelas: totalInstallments,
          parcelas: generateParcelas(formattedAmount, totalInstallments, description, date, categoryId)
        }
        addCompraParcelada(compraParcelada);
        
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
    return formatDateToDDMMAAAA(dateStr);
  };
  // Obter categoria
  const getCategory = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Despesas Variáveis</h1>
        
        {/* NOVO: Div para agrupar os filtros */}
        <div className="flex items-center space-x-2">
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm">
            {months.map((month, index) => <option key={index} value={index}>
              {month}
            </option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm">
            {years.map(year => <option key={year} value={year}>
              {year}
            </option>)}
          </select>
          <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center text-sm">
            <PlusIcon className="w-4 h-4 mr-2" />
            Nova Despesa
          </button>
        </div>
      </div>

      {/* Lista de despesas variáveis */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* ALTERADO: Usar a lista filtrada */}
        {filteredExpenses.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            {/* ... o thead da sua tabela permanece o mesmo ... */}
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
              {/* ALTERADO: Mapear sobre a lista filtrada */}
              {filteredExpenses.map(expense => {
                const category = getCategory(expense.categoryId);
                return (
                  // ... o JSX da sua <tr> permanece o mesmo
                  <tr key={expense.id}>
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
            Nenhuma despesa variável para o período selecionado.
          </div>
        )}
      </div>
      
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
                  <div className="flex items-center">
                    <input type="checkbox" id="isInstallment" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded " disabled={!!editingExpense }/>
                    <label htmlFor="isInstallment" className="ml-2 block text-sm text-gray-900">
                      Pagamento Parcelado
                    </label>
                  </div>
                  {isInstallment && <div>
                      <label htmlFor="installmentCount" className="block text-sm font-medium text-gray-700">
                        Número {!editingExpense? "de Parcelas" : "da Parcela"}
                      </label>
                      <input type="number" id="installmentCount" value={editingExpense? editingExpense.installmentInfo?.current : installmentCount} onChange={e => setInstallmentCount(e.target.value)} min="2" max="48" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required disabled={!!editingExpense}/>
                    </div>}
                
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

      {/* NOVO: Renderiza o modal de confirmação */}
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