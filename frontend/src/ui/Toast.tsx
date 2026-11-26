import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cx } from "../lib/cx";

export type ToastOptions = {
  message: string;
  /** Rótulo da ação (ex.: "Desfazer"). */
  actionLabel?: string;
  onAction?: () => void;
  /**
   * Chamado quando o toast some sem a ação ter sido usada, inclusive quando a
   * página é fechada (pagehide). Use para efetivar exclusões adiadas.
   */
  onExpire?: () => void;
  duration?: number;
};

type ActiveToast = ToastOptions & { id: number };

const ToastContext = createContext<(options: ToastOptions) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export const TOAST_DURATION = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const pending = useRef(new Map<number, { options: ToastOptions; timer: number }>());
  const nextId = useRef(1);

  const settle = useCallback((id: number, acted: boolean) => {
    const entry = pending.current.get(id);
    if (!entry) return;
    pending.current.delete(id);
    window.clearTimeout(entry.timer);
    setToasts((current) => current.filter((toast) => toast.id !== id));
    if (acted) entry.options.onAction?.();
    else entry.options.onExpire?.();
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      // Um toast por vez: o anterior é efetivado antes de mostrar o novo.
      for (const id of [...pending.current.keys()]) settle(id, false);
      const id = nextId.current++;
      const timer = window.setTimeout(() => settle(id, false), options.duration ?? TOAST_DURATION);
      pending.current.set(id, { options, timer });
      setToasts([{ ...options, id }]);
    },
    [settle],
  );

  useEffect(() => {
    const flush = () => {
      for (const id of [...pending.current.keys()]) settle(id, false);
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [settle]);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          className={cx(
            "pointer-events-none fixed inset-x-4 z-[60] flex flex-col items-center gap-2",
            "bottom-[calc(var(--nav-h)+16px+env(safe-area-inset-bottom))]",
            "lg:bottom-6 lg:left-[calc(var(--sidebar-w)+40px)] lg:right-10",
          )}
        >
          <div role="status" aria-live="polite" className="contents">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className="pointer-events-auto flex min-h-[52px] w-full max-w-[480px] items-center justify-between gap-3 rounded-field bg-toast-bg pl-4 pr-2 text-toast-ink shadow-toast"
              >
                <span className="text-sm">{toast.message}</span>
                {toast.actionLabel && (
                  <button
                    type="button"
                    onClick={() => settle(toast.id, true)}
                    className="min-h-tap shrink-0 rounded-full px-3 text-sm font-semibold text-toast-action focus-visible:outline focus-visible:outline-2 focus-visible:outline-current"
                  >
                    {toast.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
