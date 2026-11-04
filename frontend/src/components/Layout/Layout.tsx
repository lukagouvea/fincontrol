import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Ellipsis } from "lucide-react";
import { Sidebar, mainNavigation } from "./Sidebar";
import { Header } from "./Header";
import { AccountProvider, UserMenu } from "./UserMenu";
import { QuickAddProvider } from "./QuickAdd";
import { Dialog } from "../Shared/Dialog";
import { TutorialProvider } from "../../hooks/useTutorial";

export function Layout() {
  const [more, setMore] = useState(false);
  const { pathname } = useLocation();
  return (
    <TutorialProvider>
      <AccountProvider>
        <QuickAddProvider>
          <div className="app-shell">
            <a className="skip-link button button-primary" href="#main-content">
              Pular para o conteúdo
            </a>
            <Sidebar />
            <div className="app-column">
              <Header />
              <main id="main-content" className="app-content" tabIndex={-1}>
                <Outlet />
              </main>
            </div>
            <nav
              className="mobile-nav"
              id="mobile-navigation"
              aria-label="Navegação no celular"
            >
              {mainNavigation.slice(0, 3).map(({ to, label, icon: Icon }) => (
                <NavLink key={to} end={to === "/"} to={to}>
                  <Icon size={21} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}
              <button
                type="button"
                onClick={() => setMore(true)}
                aria-expanded={more}
                aria-current={
                  ["/relatorio-mensal", "/categorias"].includes(pathname)
                    ? "page"
                    : undefined
                }
              >
                <Ellipsis size={21} aria-hidden="true" />
                <span>Mais</span>
              </button>
            </nav>
            <Dialog
              open={more}
              onClose={() => setMore(false)}
              title="Mais opções"
              variant="panel"
            >
              <nav className="sidebar-nav" aria-label="Outras páginas">
                {mainNavigation.slice(3).map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className="nav-item"
                    onClick={() => setMore(false)}
                  >
                    <Icon size={19} />
                    {label}
                  </NavLink>
                ))}
              </nav>
              <div className="account-section">
                <UserMenu placement="more" beforeOpen={() => setMore(false)} />
              </div>
            </Dialog>
          </div>
        </QuickAddProvider>
      </AccountProvider>
    </TutorialProvider>
  );
}
