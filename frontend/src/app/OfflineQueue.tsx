import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { transactionService } from "../services/transactionService";
import { useToast } from "../ui/Toast";

/** Lançamento simples guardado enquanto não há conexão. */
export type QueuedTransaction = {
  id: string;
  createdAt: string;
  payload: { description: string; amount: number; categoryId: string; date: string; type: "income" | "expense"; cardId: string | null };
};

type OfflineQueue = {
  online: boolean;
  pending: QueuedTransaction[];
  /** Cria agora; sem conexão (ou se a rede cair), guarda na fila. */
  submit: (payload: QueuedTransaction["payload"]) => Promise<{ queued: boolean }>;
  flush: () => Promise<void>;
};

const OfflineContext = createContext<OfflineQueue>({ online: true, pending: [], submit: async () => ({ queued: false }), flush: async () => {} });
export const useOfflineQueue = () => useContext(OfflineContext);

const storageKey = (userId: string) => `fincontrol:offline-queue:${userId}`;

function load(userId: string): QueuedTransaction[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(userId: string, items: QueuedTransaction[]) {
  try {
    if (items.length) localStorage.setItem(storageKey(userId), JSON.stringify(items));
    else localStorage.removeItem(storageKey(userId));
  } catch {
    /* sem armazenamento: a fila vale só nesta sessão */
  }
}

/** Erro sem resposta do servidor = rede (o interceptor da API remove o response nesses casos). */
const isNetworkError = (error: unknown) => !(error as { response?: unknown })?.response;
/** Vale tentar de novo depois: sem rede ou erro do servidor (5xx). 4xx não adianta repetir. */
const isRetryable = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === undefined || status >= 500;
};

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

/**
 * Fila offline (DESIGN.md › "sem conexão"): lançamentos simples feitos sem
 * internet ficam no aparelho (por usuário) e são enviados quando a conexão
 * volta, em ordem. Erro de validação descarta o item e avisa.
 */
export function OfflineQueueProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const userId = currentUser?.id;
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  const [pending, setPending] = useState<QueuedTransaction[]>(() => (userId ? load(userId) : []));
  const flushing = useRef(false);

  useEffect(() => {
    setPending(userId ? load(userId) : []);
  }, [userId]);

  const update = useCallback(
    (next: QueuedTransaction[]) => {
      setPending(next);
      if (userId) save(userId, next);
    },
    [userId],
  );

  const flush = useCallback(async () => {
    if (!userId || flushing.current) return;
    const queue = load(userId);
    if (!queue.length) return;
    flushing.current = true;
    let sent = 0;
    let dropped = 0;
    const remaining = [...queue];
    try {
      while (remaining.length) {
        try {
          await transactionService.create(remaining[0].payload as never);
          sent += 1;
        } catch (error) {
          if (isRetryable(error)) break; // sem conexão ou servidor instável: tenta depois
          dropped += 1; // recusado pelo servidor (ex.: categoria apagada)
        }
        remaining.shift();
        update([...remaining]);
      }
    } finally {
      flushing.current = false;
    }
    if (sent) {
      await queryClient.invalidateQueries();
      showToast({ message: sent === 1 ? "1 lançamento guardado foi enviado" : `${sent} lançamentos guardados foram enviados` });
    }
    if (dropped) showToast({ message: `${dropped} lançamento${dropped > 1 ? "s" : ""} guardado${dropped > 1 ? "s" : ""} não pôde ser enviado e foi descartado.` });
  }, [userId, update, queryClient, showToast]);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      void flush();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    if (navigator.onLine !== false) void flush();
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [flush]);

  const submit = useCallback(
    async (payload: QueuedTransaction["payload"]) => {
      const enqueue = () => {
        if (!userId) throw new Error("Sem sessão");
        update([...load(userId), { id: newId(), createdAt: new Date().toISOString(), payload }]);
        return { queued: true };
      };
      if (navigator.onLine === false) return enqueue();
      try {
        await transactionService.create(payload as never);
        await queryClient.invalidateQueries({ queryKey: ["transactions"] });
        return { queued: false };
      } catch (error) {
        if (isNetworkError(error)) {
          setOnline(false);
          return enqueue();
        }
        throw error;
      }
    },
    [userId, update, queryClient],
  );

  const value = useMemo(() => ({ online, pending, submit, flush }), [online, pending, submit, flush]);
  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

/** Aviso fixo de "sem conexão" e de lançamentos aguardando envio. */
export function OfflineBanner() {
  const { online, pending, flush } = useOfflineQueue();
  if (online && !pending.length) return null;
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-surface-2 px-4 py-3 text-sm text-ink">
      <span>
        <strong className="font-semibold">{online ? "Lançamentos aguardando envio" : "Sem conexão"}</strong>
        {" · "}
        {online
          ? `${pending.length} ${pending.length === 1 ? "lançamento guardado" : "lançamentos guardados"} no aparelho.`
          : pending.length
            ? `${pending.length} ${pending.length === 1 ? "lançamento guardado" : "lançamentos guardados"}. Envio quando a internet voltar.`
            : "Novos gastos ficam guardados no aparelho e são enviados quando a internet voltar."}
      </span>
      {online && pending.length > 0 && (
        <button type="button" onClick={() => void flush()} className="min-h-tap rounded-full px-3 font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
          Enviar agora
        </button>
      )}
    </div>
  );
}
