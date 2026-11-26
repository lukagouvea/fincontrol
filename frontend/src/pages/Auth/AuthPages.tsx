import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cx } from "../../lib/cx";
import { Button } from "../../ui/Button";
import { Field, TextInput } from "../../ui/Field";

const MIN_PASSWORD = 6;

const highlights = [
  "Gastos, receitas e recorrentes num lugar só",
  "O mês inteiro sem planilha",
  "Os mesmos dados no celular e no computador",
];

function statusOf(cause: unknown) {
  return (cause as { response?: { status?: number } }).response?.status;
}

/** Destino depois de entrar: a página que pediu login, ou o Início. */
function useAfterAuth() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  return from && from.startsWith("/") && !from.startsWith("/entrar") ? from : "/";
}

function AuthLayout({ mode, title, subtitle, children }: { mode: "login" | "signup"; title: string; subtitle: string; children: ReactNode }) {
  const location = useLocation();
  const tab = (active: boolean) =>
    cx(
      "flex min-h-[40px] items-center justify-center rounded-full px-3 text-sm font-semibold",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
      active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
    );
  return (
    <div className="flex min-h-dvh bg-bg text-ink">
      <aside className="hidden w-1/2 flex-col justify-center gap-6 bg-hero px-14 text-on-hero lg:flex">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="size-9 rounded-[10px] bg-on-hero" />
          <span className="font-num text-xl font-bold">FinControl</span>
        </div>
        <p className="max-w-md font-num text-[42px] font-semibold leading-tight tracking-[-0.02em]">Seu dinheiro, sem planilha</p>
        <ul className="flex flex-col gap-3">
          {highlights.map((item) => (
            <li key={item} className="flex items-center gap-3 text-base">
              <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--on-hero)_20%,transparent)]">
                <Check size={16} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex flex-1 flex-col px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))] lg:items-center lg:justify-center lg:px-10">
        <div className="flex w-full flex-1 flex-col gap-5 lg:max-w-[400px] lg:flex-none">
          <div className="flex items-center gap-2.5 lg:hidden">
            <span aria-hidden="true" className="size-8 rounded-[10px] bg-primary" />
            <span className="font-num text-lg font-bold">FinControl</span>
          </div>
          <nav aria-label="Acesso" className="hidden grid-cols-2 gap-1 rounded-full bg-surface-2 p-1 lg:grid">
            <Link to="/entrar" state={location.state} aria-current={mode === "login" ? "page" : undefined} className={tab(mode === "login")}>
              Entrar
            </Link>
            <Link to="/criar-conta" state={location.state} aria-current={mode === "signup" ? "page" : undefined} className={tab(mode === "signup")}>
              Criar conta
            </Link>
          </nav>
          <div>
            <h1 className="font-num text-[28px] font-semibold tracking-[-0.01em]">{title}</h1>
            <p className="text-[15px] text-muted">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  autoComplete,
  placeholder,
  ...field
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder: string;
  /** Injetados por <Field>: id, aria-invalid, aria-describedby, invalid. */
  id?: string;
  invalid?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <TextInput
        {...field}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        className="pr-14"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-1 top-1/2 inline-flex size-tap -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
      >
        {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
      </button>
    </div>
  );
}

function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-field bg-expense-tint px-4 py-3 text-sm text-expense">
      {message}
    </p>
  );
}

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const target = useAfterAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (isAuthenticated) return <Navigate to={target} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await login({ email: email.trim(), password });
      navigate(target, { replace: true });
    } catch (cause) {
      const status = statusOf(cause);
      setError(
        status === 401
          ? "E-mail ou senha incorretos."
          : status === 429
            ? "Muitas tentativas. Aguarde um momento."
            : status && status >= 500
              ? "Serviço temporariamente indisponível. Tente novamente."
              : "Não foi possível entrar. Verifique sua conexão e tente novamente.",
      );
      setBusy(false);
    }
  };

  return (
    <AuthLayout mode="login" title="Bem-vindo de volta" subtitle="Entre para ver como está o seu mês.">
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4">
        <FormError message={error} />
        <Field label="E-mail">
          <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" inputMode="email" placeholder="nome@email.com" required />
        </Field>
        <Field label="Senha">
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" placeholder="Sua senha" />
        </Field>
        <div className="flex-1 lg:hidden" />
        <Button type="submit" size="lg" block loading={busy}>
          Entrar
        </Button>
        <Link to="/criar-conta" state={location.state} className="self-center text-sm font-semibold text-primary hover:underline lg:hidden">
          Criar uma conta
        </Link>
      </form>
    </AuthLayout>
  );
}

export function SignupPage() {
  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const target = useAfterAuth();
  const location = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  if (isAuthenticated) return <Navigate to={target} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Use pelo menos 2 letras.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Informe um e-mail válido.";
    if (password.length < MIN_PASSWORD) next.password = `Use pelo menos ${MIN_PASSWORD} caracteres.`;
    setFieldErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setError("");
    try {
      await signup({ name: name.trim(), email: email.trim(), password });
      navigate(target, { replace: true });
    } catch (cause) {
      setError(
        statusOf(cause) === 409
          ? "Este e-mail já está cadastrado."
          : "Não foi possível criar a conta. Verifique seus dados e tente novamente.",
      );
      setBusy(false);
    }
  };

  return (
    <AuthLayout mode="signup" title="Criar conta" subtitle="Leva menos de um minuto.">
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-4">
        <FormError message={error} />
        <Field label="Nome" error={fieldErrors.name}>
          <TextInput value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Como podemos te chamar?" />
        </Field>
        <Field label="E-mail" error={fieldErrors.email}>
          <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" inputMode="email" placeholder="nome@email.com" />
        </Field>
        <Field label="Senha" error={fieldErrors.password} hint={`Use pelo menos ${MIN_PASSWORD} caracteres.`}>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" placeholder="Crie uma senha" />
        </Field>
        <div className="flex-1 lg:hidden" />
        <Button type="submit" size="lg" block loading={busy}>
          Criar conta
        </Button>
        <Link to="/entrar" state={location.state} className="self-center text-sm font-semibold text-primary hover:underline lg:hidden">
          Já tenho conta
        </Link>
      </form>
    </AuthLayout>
  );
}
