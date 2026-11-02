"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Button from "@/app/components/Button";
import { inputCls, labelCls } from "@/app/components/Shell";
import { useUI } from "@/app/components/UIProvider";
import {
  tanggalIsoLokal,
  unduhExcelRekap,
  type ItemExcel,
  type OrderExcel,
} from "@/lib/excel";

/** awal hari / akhir hari menurut zona waktu perangkat */
const awalHari = (t: string) => {
  const [y, m, d] = t.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
};
const akhirHari = (t: string) => {
  const [y, m, d] = t.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
};

/**
 * Unduh rekap semua pesanan selesai dalam rentang tanggal.
 * Pesanan yang sudah di-reset dari beranda (diarsipkan) tetap ikut,
 * karena datanya memang masih tersimpan.
 */
export default function RekapExcelDialog({ onTutup }: { onTutup: () => void }) {
  const supabase = createClient();
  const { toast } = useUI();

  const hariIni = tanggalIsoLokal();
  const [dari, setDari] = useState(hariIni.slice(0, 8) + "01");
  const [sampai, setSampai] = useState(hariIni);
  const [loading, setLoading] = useState(false);

  const unduh = async () => {
    if (!dari || !sampai || dari > sampai) {
      toast("Rentang tanggal belum benar.", "error");
      return;
    }
    setLoading(true);
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select()
        .eq("status", "completed")
        .gte("created_at", awalHari(dari))
        .lte("created_at", akhirHari(sampai))
        .order("created_at", { ascending: true });

      if (error) {
        toast("Gagal mengambil data: " + error.message, "error");
        return;
      }
      if (!orders || orders.length === 0) {
        toast("Tidak ada pesanan selesai pada rentang ini.", "info");
        return;
      }

      const ids = (orders as OrderExcel[]).map((o) => String(o.id));
      const semuaItem: ItemExcel[] = [];
      for (let i = 0; i < ids.length; i += 50) {
        const { data: items, error: errItems } = await supabase
          .from("items")
          .select()
          .in("order_id", ids.slice(i, i + 50))
          .order("id", { ascending: true });
        if (errItems) {
          toast("Gagal mengambil isi barang: " + errItems.message, "error");
          return;
        }
        semuaItem.push(...((items ?? []) as ItemExcel[]));
      }

      await unduhExcelRekap(
        (orders as OrderExcel[]).map((order) => ({
          order,
          items: semuaItem.filter((i) => String(i.order_id) === String(order.id)),
        })),
        dari,
        sampai
      );
      toast(`Rekap ${orders.length} pesanan diunduh.`, "success");
      onTutup();
    } catch (e) {
      toast("Gagal membuat file Excel.", "error");
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Unduh rekap Excel"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded-md bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-zinc-900">Unduh Rekap Excel</h2>
        <p className="mt-1 text-base text-zinc-600">
          Semua pesanan yang sudah selesai pada rentang tanggal ini, termasuk
          yang sudah di-reset dari beranda.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="rekap-dari" className={labelCls}>
              Dari
            </label>
            <input
              id="rekap-dari"
              type="date"
              max={sampai || undefined}
              className={inputCls}
              value={dari}
              onChange={(e) => setDari(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="rekap-sampai" className={labelCls}>
              Sampai
            </label>
            <input
              id="rekap-sampai"
              type="date"
              min={dari || undefined}
              className={inputCls}
              value={sampai}
              onChange={(e) => setSampai(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button
            variant="secondary"
            block={false}
            className="px-5"
            onClick={onTutup}
            disabled={loading}
          >
            Tutup
          </Button>
          <Button block={false} className="flex-1" onClick={unduh} loading={loading}>
            <Download className="h-5 w-5" strokeWidth={2.25} />
            Unduh
          </Button>
        </div>
      </div>
    </div>
  );
}
