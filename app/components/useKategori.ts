"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { KATEGORI_CEPAT } from "@/app/components/itemUtils";
import { rapikanNama, type MasterItem } from "@/app/components/useMasterItems";

const BAWAAN: MasterItem[] = KATEGORI_CEPAT.map((name) => ({ name, last_unit: null }));

/**
 * Daftar pilihan judul kelompok (tabel master_kategori).
 * Jika tabel belum dibuat, daftar memakai judul bawaan dan aplikasi
 * tetap berjalan; judul baru hanya tidak tersimpan ke daftar.
 */
export function useKategori() {
  const [items, setItems] = useState<MasterItem[]>(BAWAAN);
  const [tersedia, setTersedia] = useState(false);

  const muat = useCallback(async () => {
    try {
      const { data, error } = await createClient()
        .from("master_kategori")
        .select("name")
        .order("id", { ascending: true });
      if (error || !data) {
        setTersedia(false);
        return;
      }
      setItems((data as { name: string }[]).map((r) => ({ name: r.name, last_unit: null })));
      setTersedia(true);
    } catch {
      setTersedia(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  /** Pakai ejaan yang sudah ada di daftar; jika baru, pakai ketikan yang dirapikan. */
  const kanonik = useCallback(
    (nama: string) => {
      const bersih = rapikanNama(nama);
      const kunci = bersih.toLowerCase();
      return items.find((i) => i.name.toLowerCase() === kunci)?.name ?? bersih;
    },
    [items]
  );

  /** Simpan judul baru ke daftar. Judul yang sudah ada dibiarkan. Gagal pun tidak mengganggu. */
  const simpanBaru = useCallback(
    async (daftar: (string | null | undefined)[]) => {
      const unik = new Map<string, { name: string }>();
      for (const d of daftar) {
        const nama = rapikanNama(d ?? "");
        if (nama) unik.set(nama.toLowerCase(), { name: nama });
      }
      if (unik.size === 0) return;
      try {
        const { error } = await createClient()
          .from("master_kategori")
          .upsert(Array.from(unik.values()), { onConflict: "name_key", ignoreDuplicates: true });
        if (error) console.warn("Gagal menyimpan judul kelompok:", error.message);
        else await muat();
      } catch (e) {
        console.warn("Gagal menyimpan judul kelompok:", e);
      }
    },
    [muat]
  );

  return { items, tersedia, muat, kanonik, simpanBaru };
}
