"use client";

import { CheckCircle2 } from "lucide-react";
import Button from "@/app/components/Button";

/** Pop-up informasi sederhana dengan satu tombol tutup. */
export default function PopupInfo({
  pesan,
  tombol = "Tutup",
  onTutup,
}: {
  pesan: string;
  tombol?: string;
  onTutup: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Informasi"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded-md bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <CheckCircle2
            className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700"
            strokeWidth={2.25}
          />
          <p className="text-lg font-semibold leading-snug text-zinc-900">
            {pesan}
          </p>
        </div>
        <div className="mt-5">
          <Button onClick={onTutup}>{tombol}</Button>
        </div>
      </div>
    </div>
  );
}
