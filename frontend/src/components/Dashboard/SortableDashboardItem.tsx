import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";

type Props = {
  id: string;
  title: string;
  children: ReactNode;
  span: number;
  organizing?: boolean;
  onMove?: (direction: -1 | 1) => void;
  first?: boolean;
  last?: boolean;
};
export function SortableDashboardItem({
  id,
  title,
  children,
  span,
  organizing = false,
  onMove,
  first,
  last,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !organizing });
  return (
    <section
      ref={setNodeRef}
      className={"panel dashboard-widget widget-span-" + span}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 2 : undefined,
      }}
    >
      <div className="panel-heading">
        <h2>{title}</h2>
        {organizing && (
          <div className="organize-actions">
            <button
              type="button"
              className="icon-button drag-handle"
              aria-label={"Arrastar " + title}
              {...attributes}
              {...listeners}
            >
              <GripVertical size={18} />
            </button>
            {onMove && (
              <>
                <button
                  className="icon-button move-button"
                  disabled={first}
                  aria-label={"Mover " + title + " para cima"}
                  onClick={() => onMove(-1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  className="icon-button move-button"
                  disabled={last}
                  aria-label={"Mover " + title + " para baixo"}
                  onClick={() => onMove(1)}
                >
                  <ArrowDown size={16} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}
