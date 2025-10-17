import React from 'react';
import ReactDOM from 'react-dom';
import { XIcon, PencilIcon } from 'lucide-react';

// Define uma estrutura genérica para os itens que a tabela pode receber
type ArchiveItem = {
  id: string;
  description: string;
  amount: number;
  startDate: string;
  endDate: string;
  category?: { name: string; color: string; };
};

type ArchiveModalProps<T extends ArchiveItem> = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: T[];
  columns: { key: keyof T | 'category' | 'period' | 'actions', label: string }[];
  formatValue: (value: number) => string;
  formatDate: (dateStr: string) => string;
  onEdit: (item: T) => void;
};

export const ArchiveModal = <T extends ArchiveItem>({
  isOpen,
  onClose,
  title,
  items,
  columns,
  formatValue,
  formatDate,
  onEdit,
}: ArchiveModalProps<T>) => {
  if (!isOpen) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  const renderCellContent = (item: T, columnKey: keyof T | 'category' | 'period' | 'actions') => {
    switch (columnKey) {
      case 'description':
        return item.description;
      case 'amount':
        return <span className={item.amount >= 0 ? 'text-green-600' : 'text-red-600'}>{formatValue(item.amount)}</span>;
      case 'category':
        return item.category ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${item.category.color}20`, color: item.category.color }}>
            {item.category.name}
          </span>
        ) : '-';
      case 'period':
        return `${formatDate(item.startDate)} até ${formatDate(item.endDate)}`;
      case 'actions':
        return (
          <div className="flex items-center">
            <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-900">
              <PencilIcon className="w-5 h-5" />
            </button>
          </div>
        );
      default:
        return item[columnKey] as React.ReactNode;
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 m-0">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {items.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map(col => (
                    <th key={String(col.key)} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map(item => (
                  <tr key={item.id}>
                    {columns.map(col => (
                      <td key={String(col.key)} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {renderCellContent(item, col.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500">Nenhum item arquivado.</p>
          )}
        </div>
      </div>
    </div>,
    modalRoot
  );
};