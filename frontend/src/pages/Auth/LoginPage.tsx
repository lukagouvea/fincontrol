import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { AuthShell } from "../../components/Auth/AuthShell";
import { Button, ErrorState } from "../../components/Shared/UI";

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (isAuthenticated) return <Navigate to="/" replace />;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await login({ email, password });
      navigate("/");
    } catch (cause) {
      const status = (cause as { response?: { status: number } }).response
        ?.status;
      setError(
        status === 401
          ? "E-mail ou senha incorretos."
          : status === 429
            ? "Muitas tentativas. Aguarde um momento."
            : status && status >= 500
              ? "Serviço temporariamente indisponível. Tente novamente."
              : "Não foi possível entrar. Verifique sua conexão e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell>
      <h1>{recovering ? "Recuperar acesso" : "Entrar"}</h1>
      {recovering ? (
        <div className="form-stack">
          <div className="notice" role="status">
            A recuperação automática de senha ainda não está disponível neste
            sistema.
          </div>
          <Button variant="secondary" onClick={() => setRecovering(false)}>
            <ArrowLeft />
            Voltar para entrar
          </Button>
        </div>
      ) : (
        <>
          <form className="form-stack" onSubmit={submit}>
            {error && <ErrorState message={error} />}
            <div className="field">
              <label htmlFor="login-email">E-mail</label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
              />
            </div>
            <div className="field">
              <label htmlFor="login-password">Senha</label>
              <div className="password-field">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="button"
              className="auth-link auth-recovery"
              onClick={() => {
                setRecovering(true);
                setError("");
              }}
            >
              Esqueceu sua senha?
            </button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {busy ? "Entrando…" : "Entrar"}
            </Button>
          </form>
          <p className="auth-footnote">
            Ainda não tem conta?{" "}
            <Link className="auth-link" to="/signup">
              Criar conta
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
