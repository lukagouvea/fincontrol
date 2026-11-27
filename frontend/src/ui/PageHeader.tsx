import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { IconButton } from "./Button";

/**
 * Cabeçalho de página: legenda (ex.: "Novembro de 2026"), título em Space
 * Grotesk (28 mobile / 32 desktop) e ações à direita.
 */
export function PageHeader({
  title,
  eyebrow,
  actions,
  back,
}: {
  title: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  /**
   * Botão voltar só no mobile (telas secundárias). Volta no histórico quando
   * veio de dentro do app; senão vai para este endereço.
   */
  back?: string;
}) {
  const navigate = useNavigate();
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 items-center gap-3">
        {back && (
          <IconButton
            label="Voltar"
            className="lg:hidden"
            onClick={() => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate(back))}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </IconButton>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          {eyebrow && <span className="text-sm text-muted">{eyebrow}</span>}
          <h1 className="font-num text-[28px] font-semibold leading-tight tracking-[-0.01em] lg:text-[32px]">
            {title}
          </h1>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 lg:gap-3">{actions}</div>}
    </header>
  );
}
