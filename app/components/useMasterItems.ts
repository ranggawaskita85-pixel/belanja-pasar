"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

/** Satu nama barang di daftar saran (tabel master_items). */
export type MasterItem = { name: string; last_unit: string | null };

/** Merapikan spasi: " wortel   baru " menjadi "wortel baru". */
export function rapikanNama(nama: string) {
  return nama.trim().replace(/\s+/g, " ");
}

/**
 * Memuat daftar saran nama barang dari Supabase dan menyediakan
 * fungsi untuk menyimpan nama baru. Jika tabel belum dibuat atau gagal
 * dimuat, daftar saran kosong dan aplikasi tetap berjalan seperti biasa.
 */
export function useMasterItems() {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [tersedia, setTersedia] = useState(false);

  const muat = useCallback(async () => {
    try {
      const { data, error } = await createClient()
        .from("master_items")
        .select("name, last_unit")
        .order("name", { ascending: true });
      if (error || !data) {
        setTersedia(false);
        return;
      }
      setItems(data as MasterItem[]);
      setTersedia(true);
    } catch {
      setTersedia(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  /** Pakai ejaan yang sudah ada di daftar saran; jika belum ada, pakai ketikan yang dirapikan. */
  const kanonik = useCallback(
    (nama: string) => {
      const bersih = rapikanNama(nama);
      const kunci = bersih.toLowerCase();
      return items.find((i) => i.name.toLowerCase() === kunci)?.name ?? bersih;
    },
    [items]
  );

  /** Simpan nama baru (atau perbarui satuan terakhir). Gagal pun tidak mengganggu. */
  const simpanBaru = useCallback(
    async (daftar: { name: string; unit: string }[]) => {
      const unik = new Map<string, { name: string; last_unit: string }>();
      for (const d of daftar) {
        const nama = rapikanNama(d.name);
        if (!nama) continue;
        unik.set(nama.toLowerCase(), { name: nama, last_unit: d.unit });
      }
      if (unik.size === 0) return;

      try {
        const { error } = await createClient()
          .from("master_items")
          .upsert(Array.from(unik.values()), { onConflict: "name_key" });
        if (error) {
          console.warn("Gagal menyimpan saran nama barang:", error.message);
        } else {
          await muat();
        }
      } catch (e) {
        console.warn("Gagal menyimpan saran nama barang:", e);
      }
    },
    [muat]
  );

  return { items, tersedia, muat, kanonik, simpanBaru };
}
