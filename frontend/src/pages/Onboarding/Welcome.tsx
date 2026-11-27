import { Navigate } from "react-router-dom";
import { Clock, CreditCard, List } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ButtonLink } from "../../ui/Button";
import { IconTile } from "../../ui/ListRow";

const points = [
  { icon: CreditCard, text: "Cartões e gastos à vista, sem manter saldo" },
  { icon: Clock, text: "Limite semanal que se ajusta sozinho" },
  { icon: List, text: "Relatórios claros, no celular e no computador" },
];

/** Boas-vindas (Boasvindas.html): primeira tela de quem não está logado. */
export function Welcome() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return (
    <main className="flex min-h-dvh flex-col bg-bg px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))] text-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6">
        <span aria-hidden="true" className="size-14 rounded-[16px] bg-primary" />
        <div className="flex flex-col gap-3">
          <h1 className="font-num text-[34px] font-semibold leading-tight tracking-[-0.02em]">Seu dinheiro, sem planilha</h1>
          <p className="text-[17px] text-muted">Registre gastos em segundos e saiba quanto ainda pode gastar nesta semana.</p>
        </div>
        <ul className="flex flex-col gap-3">
          {points.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-[15px]">
              <IconTile>
                <Icon size={20} />
              </IconTile>
              {text}
            </li>
          ))}
        </ul>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 pt-8">
        <ButtonLink to="/criar-conta" size="lg" block>
          Criar conta
        </ButtonLink>
        <ButtonLink to="/entrar" variant="link">
          Já tenho conta
        </ButtonLink>
      </div>
    </main>
  );
}
