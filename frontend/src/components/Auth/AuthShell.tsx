import type { ReactNode } from "react";
import { Moon, Sun, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

export function AuthShell({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const brand = (
    <Link className="brand" to="/login">
      <span className="brand-mark">
        <TrendingUp size={20} />
      </span>
      FinControl
    </Link>
  );
  return (
    <div className="auth-page">
      <main className="auth-main">
        <div className="auth-form">
          <div className="auth-brand">{brand}</div>
          {children}
        </div>
      </main>
      <button
        type="button"
        className="icon-button auth-theme"
        aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
        onClick={toggleTheme}
      >
        {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
      </button>
    </div>
  );
}
