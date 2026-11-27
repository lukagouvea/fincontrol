import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { IconTile } from "./ListRow";

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <IconTile>{icon ?? <Inbox size={22} strokeWidth={1.8} />}</IconTile>
      <h2 className="font-num text-xl font-semibold">{title}</h2>
      {description && <p className="max-w-sm text-[15px] text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
