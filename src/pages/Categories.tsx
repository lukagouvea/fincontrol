import React, { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { useFinance, Category } from '../context/FinanceContext';
export const Categories: React.FC = () => {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory
  } = useFinance();
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  // Estado para o formulário
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [color, setColor] = useState('#F44336');
  // Filtrar categorias pelo tipo ativo
  const filteredCategories = categories.filter(cat => cat.type === activeTab);
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
    if (editingCategory) {
      updateCategory(editingCategory.id, {
        name,
        description,
        color
      });
    } else {
      addCategory({
        name,
        type,
        description,
        color
      });
    }
    closeModal();
  };
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Categorias</h1>
        <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center text-sm">
          <PlusIcon className="w-4 h-4 mr-2" />
          Nova Categoria
        </button>
      </div>
      {/* Tabs */}
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
      {/* Lista de categorias */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredCategories.length > 0 ? <ul className="divide-y divide-gray-200">
            {filteredCategories.map(category => <li key={category.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full mr-3" style={{
              backgroundColor: category.color || '#888888'
            }}></div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {category.name}
                    </h3>
                    {category.description && <p className="text-sm text-gray-500">
                        {category.description}
                      </p>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => openModal(category)} className="text-blue-600 hover:text-blue-900">
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button onClick={() => deleteCategory(category.id)} className="text-red-600 hover:text-red-900">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </li>)}
          </ul> : <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma categoria de {activeTab === 'expense' ? 'despesa' : 'renda'}{' '}
            cadastrada.
          </div>}
      </div>
      {/* Modal de categoria */}
      {isModalOpen && <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nome
                  </label>
                  <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Descrição (Opcional)
                  </label>
                  <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                {!editingCategory && <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tipo
                    </label>
                    <div className="mt-1 flex space-x-4">
                      <label className="inline-flex items-center">
                        <input type="radio" value="expense" checked={type === 'expense'} onChange={() => setType('expense')} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                        <span className="ml-2 text-sm text-gray-700">
                          Despesa
                        </span>
                      </label>
                      <label className="inline-flex items-center">
                        <input type="radio" value="income" checked={type === 'income'} onChange={() => setType('income')} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                        <span className="ml-2 text-sm text-gray-700">
                          Renda
                        </span>
                      </label>
                    </div>
                  </div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cor
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {predefinedColors.map(presetColor => <button key={presetColor} type="button" className={`w-8 h-8 rounded-full ${color === presetColor ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`} style={{
                  backgroundColor: presetColor
                }} onClick={() => setColor(presetColor)}></button>)}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={closeModal} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Cancelar
                </button>
                <button type="submit" className="ml-3 bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  {editingCategory ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>}
    </div>;
};