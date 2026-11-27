import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { useCreateCard } from "../../hooks/useCards";
import { onboardingService } from "../../services/onboardingService";
import { daysInMonth } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { cx } from "../../lib/cx";
import { Button } from "../../ui/Button";
import { Chip } from "../../ui/Chip";
import { Field, MoneyInput, TextInput } from "../../ui/Field";
import { BigMoneyInput } from "../../ui/BigMoneyInput";
import { IconTile } from "../../ui/ListRow";

const SUGGESTIONS = [2000, 3000, 5000];

function Steps({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Passo ${step} de 2`}>
      {[1, 2].map((n) => (
        <span key={n} aria-hidden="true" className={cx("h-1.5 flex-1 rounded-full", n <= step ? "bg-primary" : "bg-surface-2")} />
      ))}
      <span className="ml-2 text-[13px] text-muted">Passo {step} de 2</span>
    </div>
  );
}

/**
 * Configuração inicial (SetupCartao/SetupOrcamento.html): primeiro cartão e
 * orçamento mensal, os dois opcionais. Ao terminar, a conta ganha categorias
 * padrão se não tiver nenhuma.
 */
export function Setup() {
  const { currentUser, markOnboarded } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createCard = useCreateCard();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [last4, setLast4] = useState("");
  const [limitText, setLimitText] = useState<string>();
  const [limit, setLimit] = useState<number | null>(null);
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [budgetText, setBudgetText] = useState<string>();
  const [budget, setBudget] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [finishing, setFinishing] = useState(false);

  if (currentUser?.onboardingCompletedAt) return <Navigate to="/" replace />;

  const saveCard = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Dê um apelido ao cartão.";
    if (!/^\d{4}$/.test(last4)) next.last4 = "4 últimos dígitos.";
    if (!limit || limit <= 0) next.limit = "Informe o limite.";
    if (!(Number(closingDay) >= 1 && Number(closingDay) <= 31)) next.closingDay = "Dia de 1 a 31.";
    if (!(Number(dueDay) >= 1 && Number(dueDay) <= 31)) next.dueDay = "Dia de 1 a 31.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setError("");
    try {
      await createCard.mutateAsync({ name: name.trim(), last4, limit: limit!, closingDay: Number(closingDay), dueDay: Number(dueDay), color: "verde" });
      setStep(2);
    } catch {
      setError("Não foi possível salvar o cartão. Tente de novo ou pule este passo.");
    }
  };

  const finish = async () => {
    setFinishing(true);
    setError("");
    try {
      const result = await onboardingService.complete(budget && budget > 0 ? budget : null);
      await queryClient.invalidateQueries();
      markOnboarded(result.onboardingCompletedAt);
      navigate("/", { replace: true });
    } catch {
      setError("Não foi possível concluir. Tente de novo.");
      setFinishing(false);
    }
  };

  const now = new Date();
  const perWeek = budget ? (budget / daysInMonth(now.getFullYear(), now.getMonth())) * 7 : 0;
  const errorBox = error && (
    <p role="alert" className="rounded-field bg-expense-tint px-4 py-3 text-sm text-expense">
      {error}
    </p>
  );

  return (
    <main className="flex min-h-dvh flex-col bg-bg px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))] text-ink lg:items-center lg:justify-center">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 lg:flex-none lg:rounded-dialog lg:border lg:border-border lg:bg-surface lg:p-8">
        <Steps step={step} />
        {step === 1 ? (
          <form onSubmit={saveCard} noValidate className="flex flex-1 flex-col gap-4">
            <div>
              <h1 className="font-num text-[28px] font-semibold leading-tight">Adicione seu primeiro cartão</h1>
              <p className="text-[15px] text-muted">Só cartão de crédito. Pix, dinheiro e débito entram como “À vista”, sem cadastro.</p>
            </div>
            <Field label="Apelido do cartão" error={errors.name}>
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Aurora" maxLength={60} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Final" error={errors.last4}>
                <TextInput value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="0000" />
              </Field>
              <Field label="Limite" error={errors.limit}>
                <MoneyInput value={limitText} onValueChange={(v) => setLimitText(v)} onNumberChange={setLimit} />
              </Field>
              <Field label="Fecha no dia" error={errors.closingDay}>
                <TextInput type="number" inputMode="numeric" min={1} max={31} value={closingDay} onChange={(e) => setClosingDay(e.target.value)} />
              </Field>
              <Field label="Vence no dia" error={errors.dueDay}>
                <TextInput type="number" inputMode="numeric" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
              </Field>
            </div>
            {errorBox}
            <div className="flex-1" />
            <Button type="submit" size="lg" block loading={createCard.isPending}>
              Continuar
            </Button>
            <Button variant="link" className="self-center !text-muted" onClick={() => setStep(2)}>
              Pular, só uso à vista
            </Button>
          </form>
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div>
              <h1 className="font-num text-[28px] font-semibold leading-tight">Quanto quer gastar por mês?</h1>
              <p className="text-[15px] text-muted">É o seu orçamento total. Você divide por categoria depois, em Orçamento.</p>
            </div>
            <BigMoneyInput
              label="Orçamento mensal"
              text={budgetText}
              onChange={(text, value) => {
                setBudgetText(text);
                setBudget(value);
              }}
            />
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((value) => (
                <Chip
                  key={value}
                  selected={budget === value}
                  onClick={() => {
                    setBudget(value);
                    setBudgetText(String(value));
                  }}
                >
                  {formatMoney(value, { cents: false })}
                </Chip>
              ))}
            </div>
            {budget ? (
              <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 text-[15px]">
                <IconTile>
                  <Clock size={20} />
                </IconTile>
                <p>
                  Isso dá cerca de <strong>{formatMoney(perWeek, { cents: false })} por semana</strong>. O limite se ajusta sozinho conforme você gasta.
                </p>
              </div>
            ) : (
              <p className="text-center text-[13px] text-muted">Pode deixar para depois: sem orçamento, o app só não mostra o limite da semana.</p>
            )}
            {errorBox}
            <div className="flex-1" />
            <Button size="lg" block loading={finishing} onClick={finish}>
              Começar
            </Button>
            <Button variant="link" className="self-center !text-muted" disabled={finishing} onClick={() => setStep(1)}>
              Voltar
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
