import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cx } from "../lib/cx";
import { useTransactionEditor } from "./TransactionEditor";
import { navigation, settingsItem, type NavItem } from "./navigation";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export function initials(name?: string) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0][1] ?? "");
  return (first + last).toUpperCase();
}

export function Brand() {
  return (
    <NavLink to="/" className={cx("flex items-center gap-2.5 rounded-xl px-2", focusRing)} aria-label="FinControl — Início">
      <span aria-hidden="true" className="size-8 rounded-[10px] bg-primary" />
      <span className="font-num text-xl font-bold">FinControl</span>
    </NavLink>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        cx(
          "flex min-h-tap items-center gap-3 rounded-xl px-3 text-[15px] font-semibold",
          focusRing,
          isActive ? "bg-primary-tint text-primary" : "text-ink-2 hover:bg-surface-2",
        )
      }
    >
      <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
      {item.label}
    </NavLink>
  );
}

function Sidebar() {
  const { currentUser } = useAuth();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-sidebar flex-col gap-6 overflow-y-auto border-r border-border bg-surface px-4 py-6 lg:flex">
      <Brand />
      <nav aria-label="Navegação principal" className="flex flex-col gap-1">
        {navigation.map((item) => (
          <div key={item.to} className="contents">
            {item.dividerBefore && <div aria-hidden="true" className="mx-1 my-2 h-px bg-border" />}
            <SidebarLink item={item} />
          </div>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
        <SidebarLink item={settingsItem} />
        {currentUser && (
          <div className="flex items-center gap-2.5 px-3">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-num text-sm font-semibold text-on-primary"
            >
              {initials(currentUser.name)}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{currentUser.name}</div>
              <div className="truncate text-xs text-muted">{currentUser.email}</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface px-2 pt-2 pb-[env(safe-area-inset-bottom)] text-[11px] font-semibold lg:hidden"
      style={{ minHeight: "var(--nav-h)" }}
    >
      {navigation
        .filter((item) => item.mobile)
        .map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cx(
                "flex min-h-12 flex-col items-center gap-1 rounded-xl",
                focusRing,
                isActive ? "text-primary" : "text-muted",
              )
            }
          >
            <Icon size={24} strokeWidth={1.9} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
    </nav>
  );
}

/** Telas com ação principal própria no cabeçalho não mostram o botão flutuante. */
const NO_FAB = ["/transacoes", "/categorias", "/recorrentes", "/ajustes", "/alertas"];

function Fab() {
  const { create } = useTransactionEditor();
  const { pathname } = useLocation();
  if (NO_FAB.some((path) => pathname.startsWith(path))) return null;
  return (
    <button
      type="button"
      onClick={() => create()}
      aria-label="Nova transação"
      className={cx(
        "fixed right-5 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-fab lg:hidden",
        "bottom-[calc(var(--nav-h)+20px+env(safe-area-inset-bottom))]",
        focusRing,
      )}
    >
      <Plus size={24} strokeWidth={2.2} aria-hidden="true" />
    </button>
  );
}

/**
 * Casca do app: barra lateral de 248px a partir de 1024px; barra inferior com 5
 * itens + botão "+" abaixo disso. Um só componente responsivo.
 */
export function AppShell() {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <a
        href="#main-content"
        className={cx(
          "sr-only z-[70] rounded-full bg-primary px-4 py-3 font-semibold text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4",
          focusRing,
        )}
      >
        Pular para o conteúdo
      </a>
      <Sidebar />
      <main
        id="main-content"
        tabIndex={-1}
        className={cx(
          "mx-auto flex w-full max-w-[1280px] flex-col gap-4 outline-none",
          "px-5 pt-[max(20px,env(safe-area-inset-top))] pb-[calc(var(--nav-h)+96px+env(safe-area-inset-bottom))]",
          "lg:max-w-none lg:gap-6 lg:pl-[calc(var(--sidebar-w)+40px)] lg:pr-10 lg:pt-8 lg:pb-10",
        )}
      >
        <Outlet />
      </main>
      <Fab />
      <BottomNav />
    </div>
  );
}
