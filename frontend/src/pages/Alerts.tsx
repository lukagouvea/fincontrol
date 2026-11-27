import { useEffect, useRef } from "react";
import { AlertTriangle, Bell, Clock, Repeat } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { accountService } from "../services/accountService";
import { useAlerts } from "../features/useAlerts";
import type { AppAlert } from "../features/alerts";
import { todayKey } from "../features/useLedger";
import { formatShortDate } from "../lib/dates";
import { cx } from "../lib/cx";
import { ButtonLink } from "../ui/Button";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
import { LoadingCard } from "../ui/Skeleton";

function AlertIcon({ alert }: { alert: AppAlert }) {
  const Icon = alert.tone === "danger" || alert.tone === "warning" ? AlertTriangle : alert.key === "recorrencia" ? Repeat : Clock;
  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex size-tap shrink-0 items-center justify-center rounded-tile",
        alert.tone === "danger" ? "bg-expense-tint text-expense" : alert.tone === "warning" ? "bg-[var(--card-laranja-tint)] text-[var(--card-laranja-ink)]" : "bg-primary-tint text-primary",
      )}
    >
      <Icon size={20} />
    </span>
  );
}

/** Central de alertas (Alertas.html). Abrir marca todos como vistos. */
export function Alerts() {
  const { alerts, unread, isLoading } = useAlerts();
  const { patchUser } = useAuth();
  const today = todayKey();
  const marked = useRef(false);

  useEffect(() => {
    if (isLoading || !unread || marked.current) return;
    marked.current = true;
    accountService
      .markAlertsRead()
      .then(({ alertsReadAt }) => patchUser({ alertsReadAt }))
      .catch(() => {
        /* continua não lido; tenta de novo na próxima visita */
      });
  }, [isLoading, unread, patchUser]);

  const groups = [
    { title: "Hoje", items: alerts.filter((alert) => alert.date >= today) },
    { title: "Antes", items: alerts.filter((alert) => alert.date < today) },
  ].filter((group) => group.items.length);

  return (
    <>
      <PageHeader back="/" title="Alertas" actions={<ButtonLink to="/ajustes/alertas" variant="link">Ajustar alertas</ButtonLink>} />
      {isLoading ? (
        <LoadingCard label="Carregando alertas…" rows={3} />
      ) : !alerts.length ? (
        <Card>
          <EmptyState icon={<Bell size={22} strokeWidth={1.8} />} title="Nenhum alerta" description="Avisos de limite, faturas e recorrências aparecem aqui." />
        </Card>
      ) : (
        <div className="flex max-w-[720px] flex-col gap-4">
          {groups.map((group) => (
            <section key={group.title} aria-label={group.title}>
              <h2 className="pb-1 text-[13px] font-semibold text-muted">{group.title}</h2>
              <ul className="rounded-card border border-border bg-surface px-4 lg:px-5">
                {group.items.map((alert) => (
                  <li key={alert.id} className="flex items-start gap-3 border-t border-border py-4 first:border-t-0">
                    <AlertIcon alert={alert} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">{alert.title}</span>
                      <span className="block text-[13px] text-muted">{alert.body}</span>
                    </span>
                    {group.title === "Antes" && <span className="shrink-0 text-[13px] text-muted">{formatShortDate(alert.date)}</span>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
