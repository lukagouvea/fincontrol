import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  TransactionSheet,
  type TransactionDraft,
  type TransactionSheetMode,
} from "../features/transactions/TransactionSheet";
import type { LedgerEntry } from "../features/ledger";

type Editor = {
  create: (draft?: TransactionDraft) => void;
  edit: (entry: LedgerEntry) => void;
};

const EditorContext = createContext<Editor>({ create: () => {}, edit: () => {} });

/** Nova/Editar transação, disponível em qualquer tela (botão "+", atalhos). */
export const useTransactionEditor = () => useContext(EditorContext);

export function TransactionEditorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; mode: TransactionSheetMode }>({
    open: false,
    mode: { kind: "create" },
  });
  const create = useCallback((draft?: TransactionDraft) => setState({ open: true, mode: { kind: "create", draft } }), []);
  const edit = useCallback((entry: LedgerEntry) => setState({ open: true, mode: { kind: "edit", entry } }), []);
  const value = useMemo(() => ({ create, edit }), [create, edit]);
  return (
    <EditorContext.Provider value={value}>
      {children}
      <TransactionSheet
        open={state.open}
        mode={state.mode}
        onClose={() => setState((current) => ({ ...current, open: false }))}
      />
    </EditorContext.Provider>
  );
}
