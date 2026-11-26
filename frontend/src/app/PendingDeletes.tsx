import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../ui/Toast";

type ScheduleOptions = {
  /** Chaves das linhas a esconder (ex.: "tx:<id>"). */
  keys: string[];
  /** Texto do toast ("Transação excluída"). */
  message: string;
  /** Chamada real à API; só roda se o usuário não desfizer. */
  commit: () => Promise<unknown>;
};

type PendingDeletes = {
  hidden: ReadonlySet<string>;
  scheduleDelete: (options: ScheduleOptions) => void;
};

const PendingDeletesContext = createContext<PendingDeletes>({
  hidden: new Set(),
  scheduleDelete: () => {},
});

export const usePendingDeletes = () => useContext(PendingDeletesContext);

/**
 * Excluir com "Desfazer" (PRODUCT_RULES): a linha some na hora, o toast fica
 * alguns segundos e só então a exclusão vai para a API. Fechar a página
 * efetiva o que estiver pendente (ToastProvider chama onExpire no pagehide).
 */
export function PendingDeletesProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const showToast = useToast();
  const queryClient = useQueryClient();

  const setKeys = useCallback((keys: string[], visible: boolean) => {
    setHidden((current) => {
      const next = new Set(current);
      for (const key of keys) {
        if (visible) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  }, []);

  const scheduleDelete = useCallback(
    ({ keys, message, commit }: ScheduleOptions) => {
      setKeys(keys, false);
      showToast({
        message,
        actionLabel: "Desfazer",
        onAction: () => setKeys(keys, true),
        onExpire: () => {
          commit()
            .then(() => queryClient.invalidateQueries())
            .catch(() => {
              showToast({ message: "Não foi possível excluir. O item voltou para a lista." });
            })
            .finally(() => setKeys(keys, true));
        },
      });
    },
    [queryClient, setKeys, showToast],
  );

  const value = useMemo(() => ({ hidden, scheduleDelete }), [hidden, scheduleDelete]);
  return <PendingDeletesContext.Provider value={value}>{children}</PendingDeletesContext.Provider>;
}
