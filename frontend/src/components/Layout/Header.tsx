import { useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { Brand, mainNavigation } from "./Sidebar";
import { UserMenu } from "./UserMenu";
import { Button } from "../Shared/UI";
import { useQuickAdd } from "./QuickAdd";

export function Header() {
  const { pathname } = useLocation();
  const quickAdd = useQuickAdd();
  const context =
    mainNavigation.find((item) => item.to === pathname)?.label || "FinControl";
  return (
    <header className="app-header">
      <div className="mobile-brand">
        <Brand />
      </div>
      <div className="header-context">
        <span>Meu espaço</span>
        <span aria-hidden="true">/</span>
        <span>{context}</span>
      </div>
      <div className="header-actions">
        {pathname !== "/lancamentos" && (
          <Button
            variant="secondary"
            id="quick-add"
            onClick={quickAdd}
            aria-label="Novo lançamento"
          >
            <Plus />
            <span className="quick-add-label">Novo lançamento</span>
          </Button>
        )}
        <UserMenu placement="header" />
      </div>
    </header>
  );
}
