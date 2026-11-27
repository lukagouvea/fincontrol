import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, CreditCard, Flag, Repeat } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { monthsService } from "../../services/monthsService";
import { useMonthLedger, todayKey } from "../useLedger";
import { useMonthBudget } from "../useMonthBudget";
import { monthKeyOf } from "../budget";
import { monthResult } from "../history";
import type { LedgerEntry } from "../ledger";
import { formatLongDate, fromMonthIndex, monthIndex, monthNames } from "../../lib/dates";
import { formatMoney, sumMoney } from "../../lib/money";
import { Sheet } from "../../ui/Sheet";
import { Button, ButtonLink } from "../../ui/Button";
import { IconTile } from "../../ui/ListRow";

/**
 * Virada de mês (ViradaMes.html): no primeiro acesso depois que um mês fecha,
 * mostra o resultado e o que o mês novo já traz. Aparece uma vez por mês, em
 * qualquer aparelho (users.last_closing_seen).
 */
export function MonthTurnover({ currentEntries }: { currentEntries: LedgerEntry[] }) {
  const { currentUser, markClosingSeen } = useAuth();
  const navigate = useNavigate();
  const now = new Date();
  const previous = fromMonthIndex(monthIndex(now.getFullYear(), now.getMonth()) - 1);
  const previousKey = monthKeyOf(previous.year, previous.month);
  const seen = currentUser?.lastClosingSeen;
  // Conta criada neste mês não tem o que fechar.
  const startedBefore = !!currentUser?.onboardingCompletedAt && currentUser.onboardingCompletedAt.slice(0, 7) <= previousKey;
  const pending = !!currentUser && startedBefore && (!seen || seen < previousKey);

  const prevLedger = useMonthLedger(previous.month, previous.year);
  const prevBudget = useMonthBudget(previous.month, previous.year, prevLedger.entries, pending && !prevLedger.isLoading && !prevLedger.isError);
  const currentBudget = useMonthBudget(now.getMonth(), now.getFullYear(), currentEntries, pending);
  const [closing, setClosing] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (!pending || hidden || prevLedger.isLoading || !prevBudget.data || !currentBudget.data) return null;
  if (!prevLedger.entries.length) return null; // mês anterior vazio: nada a mostrar

  const income = sumMoney(prevLedger.entries.filter((e) => e.type === "income").map((e) => e.amount));
  const result = monthResult(prevBudget.data.spent, income, prevBudget.data.hasBudget ? prevBudget.data.total : null, false);
  const name = monthNames[previous.month];
  const currentName = monthNames[now.getMonth()];
  const recurring = currentEntries.filter((e) => e.type === "expense" && e.source === "recurring");
  const installments = currentEntries.filter((e) => e.installment);

  const acknowledge = async (then?: string) => {
    setClosing(true);
    try {
      await monthsService.seen(previousKey);
      markClosingSeen(previousKey);
    } catch {
      // Se falhar, só some nesta sessão; volta a aparecer depois.
    }
    setHidden(true);
    if (then) navigate(then);
  };

  const items = [
    currentBudget.data.hasBudget && { icon: <Flag size={20} />, title: "Orçamento repetido", hint: `${formatMoney(currentBudget.data.total)} por mês` },
    recurring.length > 0 && { icon: <Repeat size={20} />, title: `${recurring.length} ${recurring.length === 1 ? "recorrente" : "recorrentes"} no mês`, hint: `${formatMoney(sumMoney(recurring.map((e) => e.amount)))} em fixas` },
    installments.length > 0 && {
      icon: <CreditCard size={20} />,
      title: `${installments.length} ${installments.length === 1 ? "parcela" : "parcelas"} no mês`,
      hint: `${formatMoney(sumMoney(installments.map((e) => e.amount)))} · ${installments[0].description}${installments.length > 1 ? " e outras" : ""}`,
    },
    currentBudget.data.week && { icon: <CalendarClock size={20} />, title: "Limite da semana", hint: `${formatMoney(currentBudget.data.week.limit)} nesta semana` },
  ].filter(Boolean) as Array<{ icon: React.ReactNode; title: string; hint: string }>;

  const headline =
    result.kind === "passou"
      ? `${name} fechou ${formatMoney(result.amount)} acima do orçamento.`
      : `${name} fechou. Sobraram ${formatMoney(result.amount)}.`;

  return (
    <Sheet
      open
      onClose={() => acknowledge()}
      dismissible={!closing}
      mobile="full"
      title={`${formatLongDate(todayKey()).replace(/^./, (c) => c.toUpperCase())}`}
      footer={
        <>
          <Button size="lg" block loading={closing} className="lg:w-auto" onClick={() => acknowledge()}>
            Começar {currentName.toLowerCase()}
          </Button>
          <Button variant="secondary" size="lg" block disabled={closing} className="lg:w-auto" onClick={() => acknowledge("/orcamento")}>
            Ajustar orçamento
          </Button>
        </>
      }
    >
      <h2 className="font-num text-[30px] font-semibold leading-tight tracking-[-0.01em]">{headline}</h2>
      <p className="text-sm text-muted">
        {result.basis === "orcamento"
          ? result.kind === "passou"
            ? "O gasto passou do orçamento."
            : "Você ficou dentro do orçamento."
          : "Sem orçamento definido, a sobra é entradas menos gastos."}{" "}
        {currentName} já está pronto para começar.
      </p>
      {items.length > 0 && (
        <section aria-label="O que já foi preparado" className="rounded-card border border-border bg-surface p-4">
          <h3 className="pb-2 text-[15px] font-semibold">O que já foi preparado</h3>
          <ul>
            {items.map((item) => (
              <li key={item.title} className="flex min-h-16 items-center gap-3 border-t border-border">
                <IconTile>{item.icon}</IconTile>
                <span>
                  <span className="block text-[15px] font-semibold">{item.title}</span>
                  <span className="block text-[13px] text-muted">{item.hint}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ButtonLink to={`/relatorios/historico/${previousKey}`} variant="link" className="self-start" onClick={() => void acknowledge()}>
        Ver o fechamento de {name.toLowerCase()}
      </ButtonLink>
    </Sheet>
  );
}
