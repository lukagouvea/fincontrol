import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVerticalIcon } from 'lucide-react';
type SortableDashboardItemProps = {
  id: string;
  title: string;
  children: React.ReactNode;
};
export const SortableDashboardItem: React.FC<SortableDashboardItemProps> = ({
  id,
  title,
  children
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0
  };
  return <div ref={setNodeRef} style={style} className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-800">{title}</h3>
        <button className="cursor-grab p-1 rounded hover:bg-gray-100 text-gray-500" {...attributes} {...listeners}>
          <GripVerticalIcon className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>;
};