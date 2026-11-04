import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { AuthShell } from "../../components/Auth/AuthShell";
import { Button, ErrorState } from "../../components/Shared/UI";

export function SignupPage() {
  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(""),
    [email, setEmail] = useState("");
  const [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [passwordError, setPasswordError] = useState("");
  if (isAuthenticated) return <Navigate to="/" replace />;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (password !== confirmation) {
      setPasswordError("As senhas não coincidem.");
      document.getElementById("signup-confirm")?.focus();
      return;
    }
    if (password.length < 6) {
      setPasswordError("Use pelo menos 6 caracteres.");
      return;
    }
    setPasswordError("");
    setError("");
    setBusy(true);
    try {
      await signup({ name: name.trim(), email, password });
      navigate("/");
    } catch (cause) {
      const status = (cause as { response?: { status: number } }).response
        ?.status;
      setError(
        status === 409
          ? "Este e-mail já está cadastrado."
          : "Não foi possível criar a conta. Verifique seus dados e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell>
      <h1>Criar conta</h1>
      <form className="form-stack" onSubmit={submit}>
        {error && <ErrorState message={error} />}
        <div className="field">
          <label htmlFor="signup-name">Nome</label>
          <input
            id="signup-name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="signup-email">E-mail</label>
          <input
            id="signup-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="signup-password">Senha</label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="field-hint">
            Pelo menos 6 caracteres.
          </p>
        </div>
        <div className="field">
          <label htmlFor="signup-confirm">Confirmar senha</label>
          <input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            aria-invalid={!!passwordError}
            aria-describedby={passwordError ? "password-error" : undefined}
          />
          {passwordError && (
            <p id="password-error" className="field-error">
              {passwordError}
            </p>
          )}
        </div>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {busy ? "Criando conta…" : "Criar conta"}
        </Button>
      </form>
      <p className="auth-footnote">
        Já tem uma conta?{" "}
        <Link className="auth-link" to="/login">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
