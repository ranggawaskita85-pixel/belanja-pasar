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
          className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/60 sm:items-center sm:px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-t-lg border border-zinc-300 bg-white p-5 shadow-xl sm:rounded-lg">
            <h3 className="text-lg font-bold text-zinc-900">
              {confirmState.title}
            </h3>
            {confirmState.description && (
              <p className="mt-2 text-base leading-6 text-zinc-600">
                {confirmState.description}
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => handleAnswer(false)}
                className="h-12 flex-1 rounded-md border border-zinc-400 bg-white text-base font-semibold text-zinc-800 transition hover:bg-zinc-50 active:bg-zinc-100"
              >
                {confirmState.cancelLabel ?? "Batal"}
              </button>
              <button
                type="button"
                onClick={() => handleAnswer(true)}
                className={`h-12 flex-1 rounded-md text-base font-semibold text-white transition ${
                  confirmState.destructive
                    ? "bg-red-700 hover:bg-red-800 active:bg-red-900"
                    : "bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900"
                }`}
              >
                {confirmState.confirmLabel ?? "Lanjutkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifikasi, di atas supaya tidak tertutup bilah aksi bawah */}
      <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-md border border-zinc-300 border-l-4 bg-white px-3 py-3 shadow-lg ${
              t.kind === "success"
                ? "border-l-emerald-600"
                : t.kind === "error"
                  ? "border-l-red-600"
                  : "border-l-sky-600"
            }`}
            role="status"
          >
            {t.kind === "success" && (
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                strokeWidth={2}
              />
            )}
            {t.kind === "error" && (
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
                strokeWidth={2}
              />
            )}
            <p className="flex-1 text-base leading-6 text-zinc-900">
              {t.message}
            </p>
            <button
              type="button"
              onClick={() =>
                setToasts((prev) => prev.filter((x) => x.id !== t.id))
              }
              className="-mr-1 -mt-1 flex h-9 w-9 items-center justify-center text-zinc-400 hover:text-zinc-700"
              aria-label="Tutup notifikasi"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </UIContext.Provider>
  );
}
