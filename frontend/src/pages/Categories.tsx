import React, { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, Loader2 } from 'lucide-react';
import { useCategories, useAddCategory, useUpdateCategory, useDeleteCategory } from '../hooks/useCategories';
import { Category } from '../types/FinanceTypes'
import ReactDOM from 'react-dom';
import { ConfirmationModal } from '../components/Shared/ConfirmationModal';
import { Skeleton } from '../components/Shared/Skeleton';



export const Categories: React.FC = () => {
  const { data: categories = [], isLoading, isError } = useCategories();

  const addMutation = useAddCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  // Estado para o formulário
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [color, setColor] = useState('#F44336');
  // Filtrar categorias pelo tipo ativo
  const filteredCategories = categories.filter(cat => cat.type === activeTab && cat.active !== false);
  // Cores predefinidas
  const predefinedColors = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548', '#607D8B' // Blue Grey
  ];
  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setName(category.name);
      setDescription(category.description || '');
      setType(category.type);
      setColor(category.color || '#F44336');
    } else {
      setEditingCategory(null);
      setName('');
      setDescription('');
      setType(activeTab);
      setColor('#F44336');
    }
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    // Verifica qual mutação está rodando
    const isSaving = addMutation.isPending || updateMutation.isPending;
    if (isSaving) return;

    if (editingCategory) {
      updateMutation.mutate(
        { id: editingCategory.id, data: { name, description, color } },
        { onSuccess: closeModal } // Fecha o modal só se der certo
      );
    } else {
      addMutation.mutate(
        { name, type, description, color, active: true },
        { onSuccess: closeModal }
      );
    }
  };

  const confirmationMessage = "Você tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.";


  const handleRequestDelete = (category: Category) => {
    setCategoryToDelete(category);
  };
  
  const handleCancelDelete = () => {
    setCategoryToDelete(null);
  };
  
  const handleConfirmDelete = () => {
    if (categoryToDelete) {
      deleteMutation.mutate(categoryToDelete.id);
      setCategoryToDelete(null);
    }
  };


  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;


  if (isError) {
    return <div className="text-red-500">Erro ao carregar categorias. Tente recarregar a página.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header sempre visível */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Categorias</h1>
        <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center text-sm">
          <PlusIcon className="w-4 h-4 mr-2" />
          Nova Categoria
        </button>
      </div>
      
      {/* Tabs sempre visíveis */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => setActiveTab('expense')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'expense' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            Categorias de Despesa
          </button>
          <button onClick={() => setActiveTab('income')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'income' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            Categorias de Renda
          </button>
        </nav>
      </div>

      {/* Lista de categorias com Skeleton */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          // 2. Estado de Loading: Renderiza 5 itens falsos
          <ul className="divide-y divide-gray-200">
            {Array.from({ length:  6}).map((_, index) => (
              <li key={`skeleton-${index}`} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center w-full">
                  <Skeleton className="w-4 h-4 rounded-full mr-3 shrink-0" /> {/* Bola da cor */}
                  <div className="space-y-2 w-full max-w-md">
                     <Skeleton className="h-4 w-1/3 rounded" /> {/* Nome */}
                  </div>
                </div>
                <div className="flex items-center space-x-2 pl-4">
                  <Skeleton className="w-5 h-5 rounded" /> {/* Botão editar */}
                  <Skeleton className="w-5 h-5 rounded" /> {/* Botão excluir */}
                </div>
              </li>
            ))}
          </ul>
        ) : filteredCategories.length > 0 ? (
          // 3. Estado com Dados Reais
          <ul className="divide-y divide-gray-200">
            {filteredCategories.map(category => (
              <li key={category.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full mr-3 shrink-0" style={{ backgroundColor: category.color || '#888888' }}></div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{category.name}</h3>
                    {category.description && <p className="text-sm text-gray-500">{category.description}</p>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => openModal(category)} className="text-blue-600 hover:text-blue-900">
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleRequestDelete(category)} 
                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    disabled={deleteMutation.isPending}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          // 4. Estado Vazio
          <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma categoria de {activeTab === 'expense' ? 'despesa' : 'renda'} cadastrada.
          </div>
        )}
      </div>

      {/* Modal (Mantido igual) */}
      {isModalOpen && modalRoot && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              {/* ... form content ... (mantive o conteúdo interno do form igual para não extender demais a resposta, mas o código original deve ser colado aqui) */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome</label>
                  <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descrição (Opcional)</label>
                  <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                </div>
                {!editingCategory && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo</label>
                    <div className="mt-1 flex space-x-4">
                      <label className="inline-flex items-center">
                        <input type="radio" value="expense" checked={type === 'expense'} onChange={() => setType('expense')} className="h-4 w-4 text-blue-600" />
                        <span className="ml-2 text-sm text-gray-700">Despesa</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input type="radio" value="income" checked={type === 'income'} onChange={() => setType('income')} className="h-4 w-4 text-blue-600" />
                        <span className="ml-2 text-sm text-gray-700">Renda</span>
                      </label>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
                  <div className="grid grid-cols-6 gap-2">
                    {predefinedColors.map(presetColor => (
                      <button 
                        key={presetColor} 
                        type="button" 
                        className={`w-8 h-8 rounded-full ${color === presetColor ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`} 
                        style={{ backgroundColor: presetColor }} 
                        onClick={() => setColor(presetColor)}
                      ></button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={closeModal} className="bg-white py-2 px-4 border border-gray-300 rounded-md mr-3 hover:bg-gray-50">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={addMutation.isPending || updateMutation.isPending}
                  className="bg-blue-600 py-2 px-4 border border-transparent rounded-md text-white hover:bg-blue-700 disabled:bg-blue-400 flex items-center"
                >
                  {(addMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingCategory ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        modalRoot
      )}

      <ConfirmationModal
        isOpen={!!categoryToDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message={confirmationMessage}
      />
    </div>
  );
};