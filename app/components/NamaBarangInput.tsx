"use client";

import { useId, useMemo, useState } from "react";
import { inputCls } from "@/app/components/Shell";
import type { MasterItem } from "@/app/components/useMasterItems";

const MAKS_SARAN = 6;

type Props = {
  id?: string;
  value: string;
  onChange: (nilai: string) => void;
  /** Dipanggil saat pengguna memilih salah satu saran. */
  onPick?: (item: MasterItem) => void;
  suggestions: MasterItem[];
  /** true jika daftar saran berhasil dimuat (untuk petunjuk "barang baru"). */
  tersedia?: boolean;
  /** Teks petunjuk saat ketikan belum ada di daftar saran. */
  petunjukBaru?: string;
  /** true = semua pilihan tampil saat kolom diketuk (untuk daftar pendek seperti judul kelompok). */
  tampilSemua?: boolean;
  placeholder?: string;
  ariaLabel?: string;
};

/** Kolom nama barang dengan saran otomatis saat mengetik. */
export default function NamaBarangInput({
  id,
  value,
  onChange,
  onPick,
  suggestions,
  tersedia = false,
  petunjukBaru = "Barang baru, akan disimpan ke daftar saran.",
  tampilSemua = false,
  placeholder,
  ariaLabel,
}: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [aktif, setAktif] = useState(-1);

  const q = value.trim().toLowerCase();

  // Yang diawali ketikan tampil lebih dulu, lalu yang mengandung ketikan.
  const hasil = useMemo(() => {
    if (!q) return tampilSemua ? suggestions : [];
    const awal: MasterItem[] = [];
    const tengah: MasterItem[] = [];
    for (const s of suggestions) {
      const n = s.name.toLowerCase();
      if (n.startsWith(q)) awal.push(s);
      else if (n.includes(q)) tengah.push(s);
    }
    const semua = [...awal, ...tengah];
    return tampilSemua ? semua : semua.slice(0, MAKS_SARAN);
  }, [q, suggestions, tampilSemua]);

  const persis = suggestions.some((s) => s.name.toLowerCase() === q);
  const tampilDaftar = open && hasil.length > 0 && !(hasil.length === 1 && persis);

  const pilih = (item: MasterItem) => {
    onChange(item.name);
    onPick?.(item);
    setOpen(false);
    setAktif(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!tampilDaftar) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAktif((a) => (a + 1) % hasil.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAktif((a) => (a <= 0 ? hasil.length - 1 : a - 1));
    } else if (e.key === "Enter" && aktif >= 0) {
      e.preventDefault();
      pilih(hasil[aktif]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={tampilDaftar}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        placeholder={placeholder}
        className={inputCls}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setAktif(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />

      {tampilDaftar && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-md border border-zinc-300 bg-white shadow-lg"
        >
          {hasil.map((s, i) => (
            <li
              key={s.name}
              role="option"
              aria-selected={i === aktif}
              // mencegah kolom kehilangan fokus sebelum pilihan terbaca
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pilih(s)}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 border-b border-zinc-100 px-3 py-2 text-base last:border-b-0 ${
                i === aktif ? "bg-emerald-50" : "hover:bg-zinc-50"
              }`}
            >
              <span className="min-w-0 break-words font-semibold text-zinc-900">
                {s.name}
              </span>
              {s.last_unit && (
                <span className="shrink-0 text-sm text-zinc-500">
                  {s.last_unit}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {tersedia && q && !persis && hasil.length === 0 && (
        <p className="mt-1 text-xs text-zinc-500">{petunjukBaru}</p>
      )}
    </div>
  );
}
