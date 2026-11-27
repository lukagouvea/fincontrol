import { useEffect, useId, useState, type FormEvent } from "react";
import { useCreateGoal, useDeleteGoal, useUpdateGoal } from "../../hooks/useGoals";
import type { Goal } from "../../types/FinanceTypes";
import { monthNames } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { Sheet } from "../../ui/Sheet";
import { Button } from "../../ui/Button";
import { Field, MoneyInput, TextInput } from "../../ui/Field";
import { BigMoneyInput } from "../../ui/BigMoneyInput";
import { ConfirmSheet } from "../../ui/ConfirmSheet";
import { useToast } from "../../ui/Toast";
import { todayKey } from "../useLedger";
import { monthlyPlan } from "../goals";

const monthName = (key: string) => monthNames[Number(key.slice(5, 7)) - 1].toLowerCase();

/** Nova/Editar meta (NovaMeta.html). */
export function GoalSheet({ open, goal, onClose }: { open: boolean; goal?: Goal | null; onClose: () => void }) {
  const formId = useId();
  const create = useCreateGoal();
  const update = useUpdateGoal();
  const remove = useDeleteGoal();
  const showToast = useToast();
  const [name, setName] = useState("");
  const [targetText, setTargetText] = useState<string>();
  const [target, setTarget] = useState<number | null>(null);
  const [deadline, setDeadline] = useState("");
  const [initialText, setInitialText] = useState<string>();
  const [initial, setInitial] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(goal?.name ?? "");
    setTarget(goal?.target ?? null);
    setTargetText(goal ? String(goal.target).replace(".", ",") : undefined);
    setDeadline(goal?.deadline ?? "");
    setInitial(null);
    setInitialText(undefined);
    setErrors({});
    setSubmitError("");
  }, [open, goal]);

  const saved = goal ? goal.saved : initial ?? 0;
  const plan = target ? monthlyPlan(target, saved, deadline || null, todayKey()) : null;
  const busy = create.isPending || update.isPending || remove.isPending;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Dê um nome à meta.";
    if (!target || target <= 0) next.target = "Quanto você quer juntar?";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitError("");
    const input = { name: name.trim(), target: target!, deadline: deadline || null };
    try {
      if (goal) await update.mutateAsync({ id: goal.id, data: input });
      else await create.mutateAsync({ ...input, ...(initial ? { initial } : {}) });
      showToast({ message: goal ? "Meta atualizada" : "Meta criada" });
      onClose();
    } catch {
      setSubmitError("Não foi possível salvar. O que você preencheu foi mantido.");
    }
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        dismissible={!busy}
        mobile="full"
        title={goal ? "Editar meta" : "Nova meta"}
        footer={
          <>
            <Button type="submit" form={formId} size="lg" block loading={create.isPending || update.isPending} className="lg:w-auto">
              {goal ? "Salvar meta" : "Criar meta"}
            </Button>
            {goal && (
              <Button variant="link" className="self-center !text-expense lg:mr-auto" disabled={busy} onClick={() => setConfirming(true)}>
                Excluir meta
              </Button>
            )}
          </>
        }
      >
        <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Field label="Nome da meta" error={errors.name}>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Reforma da casa" maxLength={80} autoComplete="off" />
          </Field>
          <BigMoneyInput
            label="Quanto você quer juntar"
            text={targetText}
            error={errors.target}
            onChange={(text, value) => {
              setTargetText(text);
              setTarget(value);
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prazo" hint="Opcional">
              <TextInput type="month" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </Field>
            {goal ? (
              <Field label="Já guardado">
                <TextInput value={formatMoney(goal.saved)} readOnly className="text-muted" />
              </Field>
            ) : (
              <Field label="Já guardado">
                <MoneyInput value={initialText} onValueChange={(value) => setInitialText(value)} onNumberChange={setInitial} placeholder="R$ 0,00" />
              </Field>
            )}
          </div>
          {plan && (
            <div className="flex flex-col gap-0.5 rounded-card bg-primary-tint p-4">
              <span className="text-[13px] font-semibold text-primary">Para chegar lá</span>
              {plan.late ? (
                <span className="text-[15px]">O prazo já chegou: faltam {formatMoney(plan.perMonth)}.</span>
              ) : (
                <>
                  <span className="font-num text-[22px] font-semibold">{formatMoney(plan.perMonth)} por mês</span>
                  <span className="text-[13px] text-ink-2">
                    {plan.months === 1
                      ? `Em 1 aporte, em ${monthName(plan.to)}.`
                      : `Em ${plan.months} aportes, de ${monthName(plan.from!)} a ${monthName(plan.to)}.`}
                  </span>
                </>
              )}
            </div>
          )}
          {submitError && (
            <p role="alert" className="rounded-field bg-expense-tint px-4 py-3 text-sm text-expense">
              {submitError}
            </p>
          )}
        </form>
      </Sheet>
      <ConfirmSheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Excluir “${goal?.name ?? ""}”?`}
        description="A meta e o histórico de aportes saem do app. Isso não mexe nas suas transações."
        confirmLabel="Excluir meta"
        busy={remove.isPending}
        onConfirm={async () => {
          if (!goal) return;
          try {
            await remove.mutateAsync(goal.id);
            setConfirming(false);
            showToast({ message: "Meta excluída" });
            onClose();
          } catch {
            setConfirming(false);
            setSubmitError("Não foi possível excluir.");
          }
        }}
      />
    </>
  );
}
