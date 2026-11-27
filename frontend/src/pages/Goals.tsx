import { useState } from "react";
import { Flag, Plus } from "lucide-react";
import { useGoals } from "../hooks/useGoals";
import { useMediaQuery } from "../hooks/useMediaQuery";
import type { Goal } from "../types/FinanceTypes";
import { deadlineLabel, goalProgress } from "../features/goals";
import { GoalSheet } from "../features/goalsui/GoalSheet";
import { SaveToGoalSheet } from "../features/goalsui/SaveToGoalSheet";
import { formatMoney, fromCents, toCents } from "../lib/money";
import { Button, IconButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Money } from "../ui/Money";
import { PageHeader } from "../ui/PageHeader";
import { ProgressBar } from "../ui/ProgressBar";
import { LoadingCard } from "../ui/Skeleton";

export function Goals() {
  const desktop = useMediaQuery("(min-width: 1024px)");
  const goals = useGoals();
  const [editing, setEditing] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });
  const [saving, setSaving] = useState<Goal | null>(null);
  const openNew = () => setEditing({ open: true, goal: null });

  return (
    <>
      <PageHeader
        back="/"
        title="Metas"
        eyebrow={<span className="hidden lg:inline">Seus objetivos</span>}
        actions={
          desktop ? (
            <Button icon={<Plus size={18} aria-hidden="true" />} onClick={openNew}>
              Nova meta
            </Button>
          ) : (
            <IconButton label="Nova meta" onClick={openNew} className="!border-primary !bg-primary !text-on-primary">
              <Plus size={22} aria-hidden="true" />
            </IconButton>
          )
        }
      />
      {goals.isPending ? (
        <LoadingCard label="Carregando metas…" rows={3} />
      ) : goals.isError ? (
        <Card>
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="text-[15px] font-semibold text-expense">Não foi possível carregar as metas.</p>
            <Button variant="secondary" onClick={() => goals.refetch()}>
              Tentar novamente
            </Button>
          </div>
        </Card>
      ) : !goals.data.length ? (
        <Card>
          <EmptyState
            icon={<Flag size={22} strokeWidth={1.8} />}
            title="Nenhuma meta ainda"
            description="Reserva de emergência, viagem, um notebook novo: crie uma meta e vá guardando aos poucos."
            action={
              <Button size="lg" icon={<Plus size={18} aria-hidden="true" />} onClick={openNew}>
                Criar meta
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-3 lg:gap-4">
          {goals.data.map((goal) => {
            const progress = goalProgress(goal.saved, goal.target);
            const missing = fromCents(Math.max(0, toCents(goal.target) - toCents(goal.saved)));
            return (
              <Card as="li" key={goal.id} aria-label={goal.name}>
                <button
                  type="button"
                  onClick={() => setEditing({ open: true, goal })}
                  className="-m-2 flex items-start justify-between gap-3 rounded-tile p-2 text-left hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                  aria-label={`Editar ${goal.name}`}
                >
                  <span>
                    <span className="block text-[17px] font-semibold">{goal.name}</span>
                    <span className="block text-[13px] text-muted">{goal.deadline ? `Meta até ${deadlineLabel(goal.deadline)}` : "Sem prazo"}</span>
                  </span>
                  <span className="font-num text-[22px] font-semibold text-primary">{Math.round(progress * 100)}%</span>
                </button>
                <ProgressBar value={goal.saved} max={goal.target} label={`${Math.round(progress * 100)}% de ${goal.name}`} />
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <Money value={goal.saved} size="md" className="text-[20px]" />
                    <p className="text-[13px] text-muted">
                      {missing > 0 ? `Faltam ${formatMoney(missing)} de ${formatMoney(goal.target)}` : `Meta de ${formatMoney(goal.target)} alcançada`}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => setSaving(goal)} aria-label={`Guardar em ${goal.name}`}>
                    Guardar
                  </Button>
                </div>
              </Card>
            );
          })}
        </ul>
      )}
      <GoalSheet open={editing.open} goal={editing.goal} onClose={() => setEditing({ open: false, goal: null })} />
      <SaveToGoalSheet goal={saving} onClose={() => setSaving(null)} />
    </>
  );
}
