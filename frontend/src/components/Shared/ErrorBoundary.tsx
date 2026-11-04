import { Component, type ReactNode } from "react";
import { Button } from "./UI";

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="not-found" role="alert">
          <p className="eyebrow">ALGO INTERROMPEU ESTA PÁGINA</p>
          <h1>Vamos tentar de novo?</h1>
          <p className="subtle">
            Não foi possível abrir a tela. Verifique sua conexão e recarregue a
            página.
          </p>
          <Button onClick={() => window.location.reload()}>
            Recarregar página
          </Button>
        </div>
      );
    return this.props.children;
  }
}
