import { Component, type ReactNode } from "react";
import { Button } from "../ui/Button";

/** Última barreira: uma tela que quebrou não derruba o app inteiro sem aviso. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-5 text-center text-ink">
        <p className="text-sm font-semibold text-muted">ALGO INTERROMPEU ESTA PÁGINA</p>
        <h1 className="font-num text-[28px] font-semibold">Vamos tentar de novo?</h1>
        <p className="max-w-sm text-[15px] text-muted">
          Não foi possível abrir a tela. Verifique sua conexão e recarregue a página.
        </p>
        <Button size="lg" className="mt-2" onClick={() => window.location.reload()}>
          Recarregar página
        </Button>
      </main>
    );
  }
}
