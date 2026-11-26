import { useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme, type ThemePreference } from "../context/ThemeContext";
import { cx } from "../lib/cx";
import { initials } from "../app/AppShell";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";

const themeOptions: Array<{ value: ThemePreference; label: string; hint: string }> = [
  { value: "light", label: "Claro", hint: "Fundo claro o tempo todo" },
  { value: "dark", label: "Escuro", hint: "Fundo escuro, melhor à noite" },
  { value: "system", label: "Automático", hint: "Segue o tema do seu aparelho" },
];

/** Miniatura do tema. Cores fixas de propósito: mostram o outro tema. */
function ThemePreview({ value }: { value: ThemePreference }) {
  const background =
    value === "light"
      ? "#F5F2EA"
      : value === "dark"
        ? "#121714"
        : "linear-gradient(90deg,#F5F2EA 50%,#121714 50%)";
  return (
    <span
      aria-hidden="true"
      className="flex h-[52px] w-14 shrink-0 flex-col gap-[5px] rounded-[10px] border border-border p-2"
      style={{ background }}
    >
      <span className="h-1.5 w-3/5 rounded-[3px]" style={{ background: "#7FB8A8" }} />
      <span className="h-2.5 rounded-[3px]" style={{ background: value === "dark" ? "#58AD88" : "#1E4D3B" }} />
    </span>
  );
}

export function AppearanceOptions() {
  const { preference, setPreference } = useTheme();
  return (
    <div role="radiogroup" aria-label="Tema" className="flex flex-col gap-2.5">
      {themeOptions.map((option) => {
        const checked = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => setPreference(option.value)}
            className={cx(
              "flex items-center gap-3.5 rounded-[18px] border-2 bg-surface px-3.5 py-3 text-left",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
              checked ? "border-primary" : "border-border",
            )}
          >
            <ThemePreview value={option.value} />
            <span className="flex-1">
              <span className="block text-[15px] font-semibold">{option.label}</span>
              <span className="block text-[13px] text-muted">{option.hint}</span>
            </span>
            <span
              aria-hidden="true"
              className={cx(
                "size-6 shrink-0 rounded-full border-2",
                checked ? "border-[6px] border-primary-tint bg-primary" : "border-border-strong",
              )}
            />
          </button>
        );
      })}
      <p className="text-[13px] text-muted">
        A escolha vale neste aparelho. No computador você pode escolher outra.
      </p>
    </div>
  );
}

export function Settings() {
  const { currentUser, logout } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  const signOut = async () => {
    setLeaving(true);
    setError("");
    try {
      await logout();
    } catch {
      setError("Não foi possível sair. Tente de novo.");
      setLeaving(false);
    }
  };
  return (
    <>
      <header>
        <h1 className="font-num text-[28px] font-semibold tracking-[-0.01em] lg:text-[32px]">Ajustes</h1>
      </header>
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
        <Card>
          <CardHeader title="Perfil" />
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-12 items-center justify-center rounded-full bg-primary font-num text-base font-semibold text-on-primary"
            >
              {initials(currentUser?.name)}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold">{currentUser?.name}</div>
              <div className="truncate text-[13px] text-muted">{currentUser?.email}</div>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Aparência" id="aparencia" />
          <AppearanceOptions />
        </Card>
        <Card>
          <CardHeader title="Conta" />
          <Button variant="secondary" size="lg" block loading={leaving} icon={<LogOut size={18} aria-hidden="true" />} onClick={signOut}>
            Sair da conta
          </Button>
          {error && (
            <p role="alert" className="text-[13px] text-expense">
              {error}
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
