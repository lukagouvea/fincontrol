import { useEffect, useState } from "react";
import { useContribute, useRemoveContribution } from "../../hooks/useGoals";
import type { Goal } from "../../types/FinanceTypes";
import { dateKeyToIso, toDateKey } from "../../lib/dates";
import { formatMoney, fromCents, toCents } from "../../lib/money";
import { Sheet } from "../../ui/Sheet";
import { Button } from "../../ui/Button";
import { Field, TextInput } from "../../ui/Field";
import { Segmented } from "../../ui/Segmented";
import { ProgressBar } from "../../ui/ProgressBar";
import { BigMoneyInput } from "../../ui/BigMoneyInput";
import { useToast } from "../../ui/Toast";
import { goalProgress } from "../goals";

/**
 * Guardar ou retirar (GuardarMeta.html). `initialAmount`/`sourceMonth` vêm do
 * Fechamento do mês, quando a sobra vai para a meta.
 */
export function SaveToGoalSheet({
  goal,
  initialAmount,
  sourceMonth,
  onClose,
}: {
  goal: Goal | null;
  initialAmount?: number;
  sourceMonth?: string;
  onClose: () => void;
}) {
  const contribute = useContribute();
  const undo = useRemoveContribution();
  const showToast = useToast();
  const [mode, setMode] = useState<"guardar" | "retirar">("guardar");
  const [text, setText] = useState<string>();
  const [value, setValue] = useState<number | null>(null);
  const [date, setDate] = useState(toDateKey(new Date()));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!goal) return;
    setMode("guardar");
    setText(initialAmount ? String(initialAmount).replace(".", ",") : undefined);
    setValue(initialAmount ?? null);
    setDate(toDateKey(new Date()));
    setError("");
  }, [goal, initialAmount]);

  if (!goal) return null;
  const signed = (value ?? 0) * (mode === "retirar" ? -1 : 1);
  const after = fromCents(toCents(goal.saved) + toCents(signed));

  const confirm = async () => {
    if (!value || value <= 0) {
      setError("Informe um valor.");
      return;
    }
    if (after < 0) {
      setError(`Dá para retirar até ${formatMoney(goal.saved)}.`);
      return;
    }
    setError("");
    try {
      const created = await contribute.mutateAsync({ goalId: goal.id, amount: signed, date: dateKeyToIso(date), sourceMonth });
      showToast({
        message: mode === "guardar" ? `${formatMoney(value)} guardados em ${goal.name}` : `${formatMoney(value)} retirados de ${goal.name}`,
        actionLabel: "Desfazer",
        onAction: () => undo.mutate({ goalId: goal.id, contributionId: created.id }),
      });
      onClose();
    } catch {
      setError("Não foi possível salvar. Tente de novo.");
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      dismissible={!contribute.isPending}
      mobile="full"
      title={mode === "guardar" ? "Guardar na meta" : "Retirar da meta"}
      footer={
        <Button size="lg" block loading={contribute.isPending} onClick={confirm} className="lg:w-auto">
          {mode === "guardar" ? "Confirmar aporte" : "Confirmar retirada"}
        </Button>
      }
    >
      <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[15px] font-semibold">{goal.name}</span>
          <span className="text-right text-[13px] text-muted">
            {formatMoney(goal.saved)} de {formatMoney(goal.target)}
          </span>
        </div>
        <ProgressBar value={goal.saved} max={goal.target} label={`${Math.round(goalProgress(goal.saved, goal.target) * 100)}% da meta`} />
      </div>
      <Segmented
        label="Guardar ou retirar"
        value={mode}
        onChange={setMode}
        options={[
          { value: "guardar", label: "Guardar" },
          { value: "retirar", label: "Retirar" },
        ]}
      />
      <BigMoneyInput
        label="Valor"
        text={text}
        error={error || undefined}
        onChange={(next, number) => {
          setText(next);
          setValue(number);
        }}
      />
      <Field label="Data">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <div className="flex flex-col gap-2 rounded-card bg-primary-tint p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-semibold">Depois {mode === "guardar" ? "deste aporte" : "desta retirada"}</span>
          <span className="font-num text-[20px] font-semibold text-primary">{Math.round(goalProgress(Math.max(0, after), goal.target) * 100)}%</span>
        </div>
        <ProgressBar value={Math.max(0, after)} max={goal.target} label="Progresso depois" />
        <span className="text-[13px] text-ink-2">
          {formatMoney(Math.max(0, after))} de {formatMoney(goal.target)}.
        </span>
      </div>
    </Sheet>
  );
}
