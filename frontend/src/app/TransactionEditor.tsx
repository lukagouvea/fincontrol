import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { QuickExpenseSheet } from "../features/transactions/QuickExpenseSheet";
import {
  TransactionSheet,
  type TransactionDraft,
  type TransactionSheetMode,
} from "../features/transactions/TransactionSheet";
import type { LedgerEntry } from "../features/ledger";

type Editor = {
  create: (draft?: TransactionDraft) => void;
  edit: (entry: LedgerEntry) => void;
  /** Gasto rápido (teclado numérico). */
  quick: () => void;
};

const EditorContext = createContext<Editor>({ create: () => {}, edit: () => {}, quick: () => {} });

/** Nova/Editar transação, disponível em qualquer tela (botão "+", atalhos). */
export const useTransactionEditor = () => useContext(EditorContext);

export function TransactionEditorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; mode: TransactionSheetMode }>({
    open: false,
    mode: { kind: "create" },
  });
  const create = useCallback((draft?: TransactionDraft) => setState({ open: true, mode: { kind: "create", draft } }), []);
  const edit = useCallback((entry: LedgerEntry) => setState({ open: true, mode: { kind: "edit", entry } }), []);
  const [quickOpen, setQuickOpen] = useState(false);
  const quick = useCallback(() => setQuickOpen(true), []);
  const value = useMemo(() => ({ create, edit, quick }), [create, edit, quick]);

  // Atalhos do app instalado (manifest): /?rapido=1 e /?nova=receita|despesa.
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const rapido = params.get("rapido");
    const nova = params.get("nova");
    if (!rapido && !nova) return;
    if (rapido) setQuickOpen(true);
    if (nova === "receita" || nova === "despesa") create({ type: nova === "receita" ? "income" : "expense" });
    const next = new URLSearchParams(params);
    next.delete("rapido");
    next.delete("nova");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  return (
    <EditorContext.Provider value={value}>
      {children}
      <QuickExpenseSheet
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onMore={(draft) => {
          setQuickOpen(false);
          create(draft);
        }}
      />
      <TransactionSheet
        open={state.open}
        mode={state.mode}
        onClose={() => setState((current) => ({ ...current, open: false }))}
      />
    </EditorContext.Provider>
  );
}
