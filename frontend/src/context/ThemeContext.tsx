import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/** Tema aplicado na tela. */
export type Theme = "light" | "dark";
/** Escolha do usuário em Ajustes › Aparência; "system" segue o aparelho. */
export type ThemePreference = Theme | "system";

type ThemeContextType = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = "theme";
/** Cor da barra do navegador/PWA, igual a --bg de cada tema. */
const THEME_COLOR: Record<Theme, string> = { light: "#F5F2EA", dark: "#121714" };

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* Storage pode estar bloqueado em navegação privada. */
  }
  return "system";
}

const systemQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [systemTheme, setSystemTheme] = useState<Theme>(() =>
    systemQuery().matches ? "dark" : "light",
  );
  const theme = preference === "system" ? systemTheme : preference;

  useEffect(() => {
    if (preference !== "system") return;
    const media = systemQuery();
    const update = () => setSystemTheme(media.matches ? "dark" : "light");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preference]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLOR[theme]);
  }, [theme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* A escolha vale na sessão mesmo sem persistência. */
    }
  }, []);

  const toggleTheme = useCallback(
    () => setPreference(theme === "light" ? "dark" : "light"),
    [theme, setPreference],
  );

  const value = useMemo(
    () => ({ theme, preference, setPreference, toggleTheme }),
    [theme, preference, setPreference, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
