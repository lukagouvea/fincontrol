import { NavLink } from "react-router-dom";
import {
  ArrowLeftRight,
  CalendarDays,
  ChartNoAxesCombined,
  House,
  Tags,
  TrendingUp,
} from "lucide-react";
import { UserMenu } from "./UserMenu";

export const mainNavigation = [
  { to: "/", label: "Início", icon: House },
  { to: "/lancamentos", label: "Lançamentos", icon: ArrowLeftRight },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/relatorio-mensal", label: "Relatórios", icon: ChartNoAxesCombined },
  { to: "/categorias", label: "Categorias", icon: Tags },
];
export function Brand() {
  return (
    <NavLink to="/" className="brand" aria-label="FinControl — Início">
      <span className="brand-mark">
        <TrendingUp size={20} aria-hidden="true" />
      </span>
      FinControl
    </NavLink>
  );
}
export function Sidebar() {
  return (
    <aside className="desktop-sidebar">
      <div className="px-3">
        <Brand />
      </div>
      <nav
        className="sidebar-nav"
        id="desktop-navigation"
        aria-label="Navegação principal"
      >
        {mainNavigation.map(({ to, label, icon: Icon }) => (
          <NavLink
            id={"desktop-nav-" + (to === "/" ? "home" : to.slice(1))}
            key={to}
            end={to === "/"}
            to={to}
            className="nav-item"
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <UserMenu placement="sidebar" />
      </div>
    </aside>
  );
}
