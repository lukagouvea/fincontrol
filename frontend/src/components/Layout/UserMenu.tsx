import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LogOut, Moon, Sun, HelpCircle, UserRound } from "lucide-react";
import CurrencyInput from "react-currency-input-field";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useInvestmentSettings } from "../../hooks/useInvestmentSettings";
import { useTutorial } from "../../hooks/useTutorial";
import { Dialog } from "../Shared/Dialog";
import { Button, ErrorState, formatMoney, LoadingState } from "../Shared/UI";

const AccountContext = createContext<() => void>(() => {});
export function AccountProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { startTutorial } = useTutorial();
  const investment = useInvestmentSettings();
  const [amount, setAmount] = useState<string>();
  const [numeric, setNumeric] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const dirty = useRef(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  useEffect(() => {
    if (open) {
      dirty.current = false;
      setAmount(String(investment.investmentMonthlyAmount));
      setNumeric(investment.investmentMonthlyAmount);
      setMessage("");
      setError("");
    }
    // Opening starts a draft; server updates must not reset feedback or user edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (open && !dirty.current) {
      setAmount(String(investment.investmentMonthlyAmount));
      setNumeric(investment.investmentMonthlyAmount);
    }
  }, [open, investment.investmentMonthlyAmount]);
  const save = async () => {
    if (numeric === null || numeric < 0 || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await investment.saveInvestment(numeric);
      setMessage("Investimento mensal salvo.");
    } catch {
      setError("Não foi possível salvar. Seu preenchimento foi mantido.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <AccountContext.Provider value={() => setOpen(true)}>
      {children}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Conta e preferências"
        variant="panel"
        dismissible={!saving && !loggingOut}
      >
        <div className="account-identity">
          <span className="account-avatar">
            {currentUser?.name?.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{currentUser?.name}</strong>
            <p>{currentUser?.email}</p>
          </div>
        </div>
        <section className="account-section" id="investment-setting">
          <h3>Investimento mensal</h3>
          <p>
            Valor reservado por padrão no seu planejamento. Você pode definir um
            valor diferente para um mês em Relatórios.
          </p>
          {investment.isLoading ? (
            <LoadingState />
          ) : investment.isError ? (
            <ErrorState retry={() => void investment.refetch()} />
          ) : (
            <>
              <label className="sr-only" htmlFor="default-investment">
                Investimento mensal padrão
              </label>
              <div className="inline-actions">
                <CurrencyInput
                  id="default-investment"
                  value={amount}
                  prefix="R$ "
                  intlConfig={{ locale: "pt-BR", currency: "BRL" }}
                  decimalsLimit={2}
                  allowNegativeValue={false}
                  inputMode="decimal"
                  onValueChange={(value, _name, values) => {
                    dirty.current = true;
                    setAmount(value);
                    setNumeric(values?.float ?? null);
                    setMessage("");
                  }}
                />
                <Button
                  onClick={() => void save()}
                  disabled={saving || loggingOut || numeric === null}
                >
                  {saving ? "Salvando…" : "Salvar investimento"}
                </Button>
              </div>
              <p>Atual: {formatMoney(investment.investmentMonthlyAmount)}</p>
            </>
          )}
          {message && (
            <p className="notice notice-success" role="status">
              {message}
            </p>
          )}
          {error && <ErrorState message={error} />}
        </section>
        <section className="account-section">
          <h3>Aparência</h3>
          <div className="inline-actions">
            <p>Tema {theme === "dark" ? "escuro" : "claro"}</p>
            <Button id="theme-toggle" variant="secondary" onClick={toggleTheme}>
              {theme === "dark" ? <Sun /> : <Moon />}
              {theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
            </Button>
          </div>
        </section>
        <section className="account-section">
          <Button
            variant="secondary"
            disabled={saving || loggingOut}
            onClick={() => {
              setOpen(false);
              startTutorial();
            }}
          >
            <HelpCircle />
            Rever tutorial
          </Button>
          <Button
            variant="ghost"
            disabled={loggingOut || saving}
            onClick={async () => {
              if (loggingOut || saving) return;
              setLoggingOut(true);
              setLogoutError("");
              try {
                await logout();
                setOpen(false);
              } catch {
                setLogoutError(
                  "Não foi possível sair da conta. Verifique a conexão e tente novamente.",
                );
              } finally {
                setLoggingOut(false);
              }
            }}
          >
            <LogOut />
            {loggingOut ? "Saindo…" : "Sair da conta"}
          </Button>
          {logoutError && <ErrorState message={logoutError} />}
        </section>
      </Dialog>
    </AccountContext.Provider>
  );
}
export function UserMenu({
  placement = "header",
  beforeOpen,
}: {
  placement?: "header" | "sidebar" | "more";
  beforeOpen?: () => void;
}) {
  const open = useContext(AccountContext);
  const { currentUser } = useAuth();
  return (
    <button
      type="button"
      id={placement === "header" ? "header-account-button" : undefined}
      className={
        placement === "header" ? "icon-button" : "nav-item w-full text-left"
      }
      aria-label={
        placement === "header"
          ? "Abrir conta e preferências"
          : "Conta e preferências"
      }
      onClick={() => {
        beforeOpen?.();
        open();
      }}
    >
      {placement === "header" ? (
        <span className="account-avatar" aria-hidden="true">
          {currentUser?.name?.slice(0, 1).toUpperCase()}
        </span>
      ) : (
        <>
          <UserRound size={18} />
          <span>Conta e preferências</span>
        </>
      )}
    </button>
  );
}
