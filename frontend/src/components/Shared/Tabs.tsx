import { useRef } from "react";

export function Tabs({
  items,
  value,
  onChange,
  label,
  panelId,
}: {
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  panelId: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div className="page-tabs" role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button
          key={item.value}
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="button"
          role="tab"
          id={panelId + "-tab-" + item.value}
          aria-selected={value === item.value}
          aria-controls={panelId}
          tabIndex={value === item.value ? 0 : -1}
          onClick={() => onChange(item.value)}
          onKeyDown={(event) => {
            let next: number;
            if (event.key === "ArrowRight") next = (index + 1) % items.length;
            else if (event.key === "ArrowLeft")
              next = (index + items.length - 1) % items.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = items.length - 1;
            else return;
            event.preventDefault();
            onChange(items[next].value);
            refs.current[next]?.focus();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
