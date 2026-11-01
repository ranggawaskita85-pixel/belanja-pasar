"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  kunciNama,
  susunBarisRiwayat,
  type BarisRiwayat,
  type ItemHarga,
} from "@/lib/harga";
import type { MasterItem } from "@/app/components/useMasterItems";

/**
 * Riwayat harga yang pernah disetujui (tabel price_history).
 * Jika tabel belum dibuat, hasilnya kosong dan tidak ada galat.
 */
export function useRiwayatHarga() {
  const [riwayat, setRiwayat] = useState<BarisRiwayat[]>([]);

  /** Muat riwayat untuk daftar nama barang tertentu. */
  const muat = useCallback(async (namaBarang: string[]) => {
    const kunci = Array.from(
      new Set(namaBarang.map(kunciNama).filter(Boolean))
    );
    if (kunci.length === 0) {
      setRiwayat([]);
      return;
    }
    try {
      const { data, error } = await createClient()
        .from("price_history")
        .select("*")
        .in("item_key", kunci)
        .order("approved_at", { ascending: false })
        .limit(1000);
      if (error || !data) {
        setRiwayat([]);
        return;
      }
      setRiwayat(
        (data as BarisRiwayat[]).map((r) => ({
          ...r,
          order_id: String(r.order_id),
          qty: Number(r.qty),
          total_price: Number(r.total_price),
          unit_price: Number(r.unit_price),
        }))
      );
    } catch {
      setRiwayat([]);
    }
  }, []);

  /** Simpan harga pesanan yang disetujui. Mengembalikan true jika berhasil. */
  const catat = useCallback(
    async (orderId: string, penjual: string, items: ItemHarga[]) => {
      const baris = susunBarisRiwayat(orderId, penjual, items);
      if (baris.length === 0) return true;
      try {
        const { error } = await createClient()
          .from("price_history")
          .upsert(baris, { onConflict: "order_id,item_key,unit" });
        if (error) {
          console.warn("Gagal menyimpan riwayat harga:", error.message);
          return false;
        }
        return true;
      } catch (e) {
        console.warn("Gagal menyimpan riwayat harga:", e);
        return false;
      }
    },
    []
  );

  return { riwayat, muat, catat };
}

/**
 * Daftar nama penjual yang pernah dipakai (diambil dari kolom
 * orders.seller_name) untuk saran saat mengetik.
 */
export function useDaftarPenjual() {
  const [daftar, setDaftar] = useState<MasterItem[]>([]);

  const muat = useCallback(async () => {
    try {
      const { data, error } = await createClient()
        .from("orders")
        .select("seller_name, created_at")
        .not("seller_name", "is", null)
        .order("created_at", { ascending: false });
      if (error || !data) return;

      // Ejaan terbaru untuk tiap nama menang.
      const unik = new Map<string, string>();
      for (const r of data as { seller_name: string | null }[]) {
        const nama = (r.seller_name ?? "").trim().replace(/\s+/g, " ");
        if (!nama) continue;
        const k = nama.toLowerCase();
        if (!unik.has(k)) unik.set(k, nama);
      }
      setDaftar(
        Array.from(unik.values())
          .sort((a, b) => a.localeCompare(b, "id"))
          .map((name) => ({ name, last_unit: null }))
      );
    } catch {
      /* diabaikan: saran kosong */
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  /** Pakai ejaan yang sudah ada; jika baru, pakai ketikan yang dirapikan. */
  const kanonik = useCallback(
    (nama: string) => {
      const bersih = nama.trim().replace(/\s+/g, " ");
      const k = bersih.toLowerCase();
      return daftar.find((d) => d.name.toLowerCase() === k)?.name ?? bersih;
    },
    [daftar]
  );

  return { daftar, muat, kanonik };
}
