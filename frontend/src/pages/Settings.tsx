import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronRight, Flag, Moon, Repeat, ShieldCheck, Tag, Zap } from "lucide-react";
import { AlertToggles } from "./AlertSettings";
import { DataActions } from "./DataSettings";
import { useAuth } from "../context/AuthContext";
import { useTheme, type ThemePreference } from "../context/ThemeContext";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { cx } from "../lib/cx";
import { initials } from "../app/AppShell";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { IconTile } from "../ui/ListRow";

const themeOptions: Array<{ value: ThemePreference; label: string; hint: string }> = [
  { value: "light", label: "Claro", hint: "Fundo claro o tempo todo" },
  { value: "dark", label: "Escuro", hint: "Fundo escuro, melhor à noite" },
  { value: "system", label: "Automático", hint: "Segue o tema do seu aparelho" },
];
const themeLabel: Record<ThemePreference, string> = { light: "Claro", dark: "Escuro", system: "Automático" };

/**
 * Miniatura do tema. As cores são fixas de propósito: mostram como o outro
 * tema fica, independente do tema atual (exceção à regra de tokens).
 */
function ThemePreview({ value, large }: { value: ThemePreference; large?: boolean }) {
  const background =
    value === "light" ? "#F5F2EA" : value === "dark" ? "#121714" : "linear-gradient(90deg,#F5F2EA 50%,#121714 50%)";
  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex shrink-0 flex-col justify-start gap-[5px] rounded-[10px] border border-border p-2",
        large ? "h-[84px] w-full gap-2.5 p-3" : "h-[52px] w-14",
      )}
      style={{ background }}
    >
      <span className={cx("rounded-[3px]", large ? "h-2 w-1/2" : "h-1.5 w-3/5")} style={{ background: value === "dark" ? "#EDF1EE" : value === "light" ? "#16201C" : "#7FB8A8" }} />
      <span className={cx("rounded-[3px]", large ? "h-4" : "h-2.5")} style={{ background: value === "dark" ? "#58AD88" : "#1E4D3B" }} />
    </span>
  );
}

function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx("size-6 shrink-0 rounded-full border-2", checked ? "border-[6px] border-primary-tint bg-primary" : "border-border-strong")}
    />
  );
}

export function AppearanceOptions({ layout = "list" }: { layout?: "list" | "tiles" }) {
  const { preference, setPreference } = useTheme();
  return (
    <div role="radiogroup" aria-label="Tema" className={cx("grid gap-2.5", layout === "tiles" && "lg:grid-cols-3 lg:gap-3")}>
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
              layout === "tiles" && "lg:flex-col lg:items-stretch lg:gap-3 lg:p-3",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
              checked ? "border-primary" : "border-border",
            )}
          >
            <span className={cx(layout === "tiles" && "hidden lg:block")}>
              <ThemePreview value={option.value} large />
            </span>
            <span className={cx(layout === "tiles" && "lg:hidden")}>
              <ThemePreview value={option.value} />
            </span>
            <span className={cx("flex flex-1 items-center gap-3", layout === "tiles" && "lg:flex-row-reverse lg:justify-end")}>
              <span className="flex-1">
                <span className="block text-[15px] font-semibold">{option.label}</span>
                <span className="block text-[13px] text-muted">{option.hint}</span>
              </span>
              <Radio checked={checked} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SettingsLink({ to, icon, title, subtitle }: { to: string; icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <li>
      <Link
        to={to}
        className="-mx-2 flex min-h-16 items-center gap-3 rounded-tile px-2 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
      >
        <IconTile>{icon}</IconTile>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{title}</span>
          {subtitle && <span className="block text-[13px] text-muted">{subtitle}</span>}
        </span>
        <ChevronRight size={18} aria-hidden="true" className="text-muted" />
      </Link>
    </li>
  );
}

function useSignOut() {
  const { logout } = useAuth();
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
  return { leaving, error, signOut };
}

export function Settings() {
  const { currentUser } = useAuth();
  const { preference } = useTheme();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const { leaving, error, signOut } = useSignOut();

  const profile = (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary font-num text-lg font-semibold text-on-primary">
        {initials(currentUser?.name)}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[17px] font-semibold">{currentUser?.name}</div>
        <div className="truncate text-[13px] text-muted">{currentUser?.email}</div>
      </div>
    </div>
  );
  const errorText = error && (
    <p role="alert" className="text-[13px] text-expense">
      {error}
    </p>
  );

  if (!desktop) {
    return (
      <>
        <PageHeader back="/" title="Ajustes" />
        <Card>{profile}</Card>
        <ul className="flex flex-col">
          <SettingsLink to="/ajustes/aparencia" icon={<Moon size={20} />} title="Aparência" subtitle={themeLabel[preference]} />
          <SettingsLink to="/categorias" icon={<Tag size={20} />} title="Categorias" subtitle="Organize seus gastos" />
          <SettingsLink to="/recorrentes" icon={<Repeat size={20} />} title="Recorrentes" subtitle="Lançamentos automáticos" />
          <SettingsLink to="/metas" icon={<Flag size={20} />} title="Metas" subtitle="Seus objetivos" />
          <SettingsLink to="/ajustes/alertas" icon={<Bell size={20} />} title="Alertas" subtitle="O que avisar no sino" />
          <SettingsLink to="/ajustes/atalhos" icon={<Zap size={20} />} title="Atalhos" subtitle="Instalar o app e lançar rápido" />
          <SettingsLink to="/ajustes/dados" icon={<ShieldCheck size={20} />} title="Segurança e dados" subtitle="Importar, exportar e apagar" />
        </ul>
        <Button variant="secondary" size="lg" block loading={leaving} onClick={signOut} className="mt-4 !text-expense">
          Sair da conta
        </Button>
        {errorText}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Ajustes"
        eyebrow="Conta e preferências"
        actions={
          <Button variant="secondary" loading={leaving} onClick={signOut}>
            Sair da conta
          </Button>
        }
      />
      {errorText}
      <div className="flex max-w-[820px] flex-col gap-4">
        <Card>
          <CardHeader title="Perfil" />
          {profile}
        </Card>
        <Card>
          <CardHeader title="Aparência" />
          <AppearanceOptions layout="tiles" />
          <p className="text-[13px] text-muted">A escolha vale neste aparelho. No celular você pode escolher outra.</p>
        </Card>
        <Card>
          <CardHeader title="Alertas" />
          <AlertToggles />
        </Card>
        <Card>
          <CardHeader title="Atalhos" action={{ label: "Ver atalhos", to: "/ajustes/atalhos" }} />
          <p className="text-[15px] text-ink-2">Instale o app e use “Gasto rápido” e “Nova receita” direto do ícone.</p>
        </Card>
        <Card>
          <CardHeader title="Segurança e dados" />
          <DataActions />
        </Card>
      </div>
    </>
  );
}

/** Ajustes › Aparência (subtela no mobile). */
export function AppearanceSettings() {
  return (
    <>
      <PageHeader back="/ajustes" title="Aparência" />
      <AppearanceOptions />
      <p className="text-[13px] text-muted">A escolha vale neste aparelho. No computador você pode escolher outra.</p>
    </>
  );
}
