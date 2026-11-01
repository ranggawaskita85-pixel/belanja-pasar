import { Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import HomeButton from "@/app/components/HomeButton";

/** Gaya input dan label yang dipakai di semua form. */
export const inputCls =
  "h-12 w-full rounded-md border border-zinc-400 bg-white px-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/25 disabled:bg-zinc-100 disabled:text-zinc-500";

export const labelCls =
  "mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-600";

/** Bilah judul di atas, warna solid. */
export function AppBar({
  title,
  backHref,
  right,
  meta,
  homeDirty = false,
}: {
  title: string;
  backHref?: string;
  right?: ReactNode;
  /** true = ada proses belum selesai, tampilkan peringatan sebelum ke beranda. */
  homeDirty?: boolean;
  /** Teks kecil di sebelah kanan judul, misalnya hari dan tanggal. */
  meta?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 bg-emerald-800 text-white">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-1 px-2">
        {backHref ? (
          <HomeButton href={backHref} dirty={homeDirty} />
        ) : (
          <div className="w-2 shrink-0" />
        )}
        <div
          className={`min-w-0 truncate text-lg font-semibold ${
            meta ? "shrink-0" : "flex-1"
          }`}
        >
          {title}
        </div>
        {meta && (
          <div className="min-w-0 flex-1 truncate pl-2 text-sm tabular-nums text-emerald-100">
            {meta}
          </div>
        )}
        {right}
      </div>
    </header>
  );
}

/** Tombol ikon persegi di bilah judul (tanpa tulisan). */
export function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white hover:bg-emerald-700 active:bg-emerald-900 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

/** Blok konten penuh lebar dengan judul kecil, seperti kartu di aplikasi kasir. */
export function Panel({
  title,
  aside,
  children,
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-y border-zinc-300 bg-white sm:rounded-md sm:border">
      {(title || aside) && (
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 sm:rounded-t-md">
          <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-600">
            {title}
          </h2>
          {aside && (
            <span className="text-sm font-semibold tabular-nums text-zinc-700">
              {aside}
            </span>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/** Bilah aksi tetap di bawah layar. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-300 bg-white">
      <div className="mx-auto max-w-lg space-y-2 px-4 py-3">{children}</div>
    </div>
  );
}

/** Baris ringkasan angka di bilah bawah (total, jumlah barang). */
export function TotalLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="text-2xl font-bold tabular-nums text-zinc-900">
        {value}
      </span>
    </div>
  );
}

const noticeTone = {
  info: { box: "border-sky-600 bg-sky-50", Icon: Info, icon: "text-sky-700" },
  warn: {
    box: "border-amber-500 bg-amber-50",
    Icon: AlertTriangle,
    icon: "text-amber-700",
  },
  ok: {
    box: "border-emerald-600 bg-emerald-50",
    Icon: CheckCircle2,
    icon: "text-emerald-700",
  },
};

/** Pesan status datar dengan garis warna di kiri. */
export function Notice({
  tone = "info",
  children,
}: {
  tone?: keyof typeof noticeTone;
  children: ReactNode;
}) {
  const { box, Icon, icon } = noticeTone[tone];
  return (
    <div
      className={`flex items-start gap-3 border-l-4 px-4 py-3 text-base leading-6 text-zinc-800 ${box}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${icon}`} strokeWidth={2} />
      <div>{children}</div>
    </div>
  );
}
