import { parseDateKey } from "../../lib/dates";
import { formatMoney, sumMoney } from "../../lib/money";
import { Card, CardHeader } from "../../ui/Card";
import { Money } from "../../ui/Money";
import { usePendingBills, todayKey } from "../useLedger";
import type { LedgerEntry } from "../ledger";
import { BillCheckButton } from "./BillControls";

const daysFrom = (today: string, date: string) => Math.round((parseDateKey(date).getTime() - parseDateKey(today).getTime()) / 86_400_000);

/** "Venceu há 3 dias", "Vence hoje", "Vence amanhã", "Vence em 5 dias". */
export function dueText(date: string, today: string) {
  const days = daysFrom(today, date);
  if (days < 0) return days === -1 ? "Venceu ontem" : `Venceu há ${-days} dias`;
  if (days === 0) return "Vence hoje";
  return days === 1 ? "Vence amanhã" : `Vence em ${days} dias`;
}

function BillRow({ entry, today }: { entry: LedgerEntry; today: string }) {
  const overdue = entry.bill?.status === "vencida";
  const detail = entry.installment ? ` · parcela ${entry.installment.current} de ${entry.installment.total}` : "";
  return (
    <li className="flex min-h-16 items-center gap-3 border-t border-border first:border-t-0">
      <BillCheckButton entry={entry} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{entry.description}</span>
        <span className={overdue ? "block truncate text-[13px] font-semibold text-expense" : "block truncate text-[13px] text-muted"}>
          {dueText(entry.date, today)}
          {detail}
        </span>
      </span>
      <Money value={entry.amount} kind="expense" signed={false} />
    </li>
  );
}

/**
 * Contas a pagar (Início): recorrentes e parcelas À vista vencidas ou que vencem
 * em até 7 dias, com o botão de marcar como paga. Some quando não há nada.
 */
export function BillsCard() {
  const { entries, isLoading } = usePendingBills();
  if (isLoading || !entries.length) return null;
  const today = todayKey();
  const overdue = entries.filter((entry) => entry.bill?.status === "vencida");
  const total = sumMoney(entries.map((entry) => entry.amount));
  const subtitle = overdue.length
    ? `${overdue.length} vencida${overdue.length > 1 ? "s" : ""} · ${formatMoney(total)} no total`
    : `${formatMoney(total)} nos próximos 7 dias`;
  return (
    <Card aria-label="Contas a pagar">
      <CardHeader title="Contas a pagar" subtitle={subtitle} />
      <ul className="flex flex-col">
        {entries.slice(0, 6).map((entry) => (
          <BillRow key={entry.key} entry={entry} today={today} />
        ))}
      </ul>
      {entries.length > 6 && <p className="text-[13px] text-muted">E mais {entries.length - 6}.</p>}
    </Card>
  );
}
