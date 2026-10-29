"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ToastKind = "success" | "error" | "info";

type UIContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  toast: (message: string, kind?: ToastKind) => void;
};

const UIContext = createContext<UIContextType | null>(null);

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI harus dipakai di dalam UIProvider");
  return ctx;
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);

  const [toasts, setToasts] = useState<
    { id: number; message: string; kind: ToastKind }[]
  >([]);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, kind }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const handleAnswer = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  return (
    <UIContext.Provider value={{ confirm, toast }}>
      {children}

      {/* Dialog konfirmasi */}
      {confirmState && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 px-4 pb-4 sm:items-center sm:pb-0"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900">
              {confirmState.title}
            </h3>
            {confirmState.description && (
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {confirmState.description}
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => handleAnswer(false)}
                className="min-h-11 flex-1 rounded-lg border border-stone-300 bg-white text-sm font-medium text-stone-700 transition hover:bg-stone-50"
              >
                {confirmState.cancelLabel ?? "Batal"}
              </button>
              <button
                type="button"
                onClick={() => handleAnswer(true)}
                className={`min-h-11 flex-1 rounded-lg text-sm font-medium text-white transition ${
                  confirmState.destructive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-800 hover:bg-green-900"
                }`}
              >
                {confirmState.confirmLabel ?? "Lanjutkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-lg"
            role="status"
          >
            {t.kind === "success" && (
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                strokeWidth={1.75}
              />
            )}
            {t.kind === "error" && (
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-red-700"
                strokeWidth={1.75}
              />
            )}
            <p className="flex-1 text-sm leading-6 text-stone-900">
              {t.message}
            </p>
            <button
              type="button"
              onClick={() =>
                setToasts((prev) => prev.filter((x) => x.id !== t.id))
              }
              className="-mr-1 -mt-1 p-1 text-stone-400 hover:text-stone-700"
              aria-label="Tutup notifikasi"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        ))}
      </div>
    </UIContext.Provider>
  );
}
