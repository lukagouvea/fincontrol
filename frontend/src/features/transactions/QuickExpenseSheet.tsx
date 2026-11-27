import { useEffect, useMemo, useState } from "react";
import { Delete } from "lucide-react";
import { useCategories } from "../../hooks/useCategories";
import { useCards } from "../../hooks/useCards";
import { useOfflineQueue } from "../../app/OfflineQueue";
import { useMonthLedger } from "../useLedger";
import { cardVars } from "../cards/cardStyle";
import { dateKeyToIso, toDateKey } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { cx } from "../../lib/cx";
import { Sheet } from "../../ui/Sheet";
import { Button } from "../../ui/Button";
import { Chip } from "../../ui/Chip";
import { useToast } from "../../ui/Toast";
import type { TransactionDraft } from "./TransactionSheet";

const LAST_PAYMENT_KEY = "fincontrol:last-payment";
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "back"] as const;

/** Texto digitado no teclado ("20,5") → número. */
export const keypadValue = (text: string) => (text ? Number(text.replace(",", ".")) : 0);

/** Aplica uma tecla ao texto: vírgula uma vez, até 2 casas e até R$ 999.999,99. */
export function pressKey(text: string, key: string) {
  if (key === "back") return text.slice(0, -1);
  if (key === ",") return text.includes(",") ? text : (text || "0") + ",";
  if (!/^\d$/.test(key)) return text;
  const [whole, decimals] = text.split(",");
  if (decimals !== undefined && decimals.length >= 2) return text;
  if (decimals === undefined && whole.length >= 6) return text;
  if (text === "0") return key;
  return text + key;
}

/** "20" → "20,00"; "1234,5" → "1.234,50". */
export function keypadDisplay(text: string) {
  const [whole, decimals = ""] = text.split(",");
  return `${Number(whole || "0").toLocaleString("pt-BR")},${decimals.padEnd(2, "0")}`;
}

/** Gasto rápido (Rapido.html): valor, categoria e pagamento em três toques. */
export function QuickExpenseSheet({ open, onClose, onMore }: { open: boolean; onClose: () => void; onMore: (draft: TransactionDraft) => void }) {
  const now = new Date();
  const categoriesQuery = useCategories();
  const cardsQuery = useCards();
  const ledger = useMonthLedger(now.getMonth(), now.getFullYear());
  const offline = useOfflineQueue();
  const showToast = useToast();
  const [text, setText] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const cards = (cardsQuery.data ?? []).filter((card) => !card.archived);
  // Categorias mais usadas no mês (depois as demais, em ordem alfabética).
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of ledger.entries) if (entry.type === "expense" && entry.categoryId) counts.set(entry.categoryId, (counts.get(entry.categoryId) ?? 0) + 1);
    return (categoriesQuery.data ?? [])
      .filter((category) => category.type === "expense" && category.active !== false)
      .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.name.localeCompare(b.name, "pt-BR"))
      .slice(0, 4);
  }, [ledger.entries, categoriesQuery.data]);

  useEffect(() => {
    if (!open) return;
    setText("");
    setError("");
    setSaving(false);
    let last: string | null = null;
    try {
      last = localStorage.getItem(LAST_PAYMENT_KEY);
    } catch {
      /* só conveniência */
    }
    setCardId(last && last !== "avista" ? last : null);
    setCategoryId(null);
  }, [open]);

  useEffect(() => {
    if (open && !categoryId && categories[0]) setCategoryId(categories[0].id);
  }, [open, categoryId, categories]);

  // Teclado físico também funciona.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      const key = event.key === "Backspace" ? "back" : event.key === "." ? "," : event.key;
      if (KEYS.includes(key as (typeof KEYS)[number])) {
        event.preventDefault();
        setText((current) => pressKey(current, key));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const amount = keypadValue(text);
  const card = cards.find((item) => item.id === cardId);
  const category = categories.find((item) => item.id === categoryId);

  const save = async () => {
    if (!amount || !category) {
      setError(!amount ? "Digite o valor." : "Escolha uma categoria.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { queued } = await offline.submit({
        description: category.name,
        amount,
        categoryId: category.id,
        date: dateKeyToIso(toDateKey(new Date())),
        type: "expense",
        cardId: card?.id ?? null,
      });
      try {
        localStorage.setItem(LAST_PAYMENT_KEY, card?.id ?? "avista");
      } catch {
        /* só conveniência */
      }
      showToast({ message: queued ? "Sem conexão: gasto guardado. Será enviado quando a internet voltar." : `Gasto de ${formatMoney(amount)} salvo` });
      onClose();
    } catch {
      setError("Não foi possível salvar. Tente de novo.");
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!saving}
      title="Gasto rápido"
      footer={
        <Button size="lg" block loading={saving} onClick={save}>
          Salvar gasto
        </Button>
      }
    >
      <div className="-mt-2 flex justify-end">
        <Button variant="link" onClick={() => onMore({ type: "expense", amount: amount || undefined, categoryId, cardId: card?.id ?? null })}>
          Mais opções
        </Button>
      </div>
      <p aria-live="polite" aria-label={`Valor: ${formatMoney(amount)}`} className="text-center">
        <span className="font-num text-[28px] text-muted-2">R$ </span>
        <span className="font-num text-[44px] font-semibold tracking-[-0.02em]">{keypadDisplay(text)}</span>
      </p>
      <div role="group" aria-label="Categoria" className="flex flex-wrap gap-2">
        {categories.map((item) => (
          <Chip key={item.id} selected={item.id === categoryId} onClick={() => setCategoryId(item.id)}>
            {item.name}
          </Chip>
        ))}
      </div>
      {cards.length > 0 && (
        <div role="group" aria-label="Pago com" className="flex flex-wrap gap-2">
          <Chip selected={!card} onClick={() => setCardId(null)}>
            À vista
          </Chip>
          {cards.map((item) => (
            <Chip key={item.id} selected={item.id === card?.id} onClick={() => setCardId(item.id)}>
              <span aria-hidden="true" className="size-2 rounded-full" style={{ background: cardVars(item.color).background }} />
              {item.name}
            </Chip>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2" aria-label="Teclado">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-label={key === "back" ? "Apagar" : key === "," ? "Vírgula" : key}
            onClick={() => setText((current) => pressKey(current, key))}
            className={cx(
              "flex min-h-[48px] items-center justify-center rounded-xl bg-surface-2 font-num text-xl font-semibold hover:bg-border",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus",
            )}
          >
            {key === "back" ? <Delete size={22} aria-hidden="true" /> : key}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-expense">
          {error}
        </p>
      )}
    </Sheet>
  );
}
