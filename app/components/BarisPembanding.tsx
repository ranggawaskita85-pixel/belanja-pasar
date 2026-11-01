"use client";

import {
  bandingkan,
  hargaPerPenjual,
  type BarisRiwayat,
  type ItemHarga,
} from "@/lib/harga";

const rp = (v: number) => `Rp ${Math.round(v).toLocaleString("id-ID")}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

/**
 * Pembanding harga untuk satu barang: harga per satuan penawaran ini
 * dibanding harga termurah yang pernah disetujui dari penjual mana pun.
 * Bisa dibuka untuk melihat harga terbaru tiap penjual.
 */
export default function BarisPembanding({
  item,
  riwayat,
  orderId,
}: {
  item: ItemHarga;
  riwayat: BarisRiwayat[];
  orderId: string;
}) {
  const harga = Number(item.price);
  const qty = Number(item.qty);
  if (!(harga > 0) || !(qty > 0)) return null;

  const hargaSatuan = harga / qty;
  const tawaran = hargaPerPenjual(riwayat, item.name, item.unit, orderId);

  if (tawaran.length === 0) {
    return (
      <p className="mt-1 text-xs text-zinc-500">
        Belum ada harga pembanding untuk {item.unit} ini.
      </p>
    );
  }

  const termurah = tawaran[0];
  const s = bandingkan(hargaSatuan, termurah.unit_price);
  const warna =
    s.tipe === "mahal"
      ? "text-red-700"
      : s.tipe === "murah"
        ? "text-emerald-700"
        : "text-zinc-600";
  const teks =
    s.tipe === "sama"
      ? "Sama dengan termurah"
      : s.tipe === "mahal"
        ? `Lebih mahal ${s.persen}%`
        : `Lebih murah ${s.persen}%`;

  return (
    <details className="mt-1.5 text-sm">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className={`font-bold ${warna}`}>{teks}</span>
        <span className="text-zinc-500">
          {" "}
          · termurah {rp(termurah.unit_price)}/{item.unit} (
          {termurah.seller_name})
        </span>
        <span className="ml-1 text-zinc-400 underline">rincian</span>
      </summary>
      <ul className="mt-1.5 space-y-1 border-l-2 border-zinc-200 pl-3 tabular-nums">
        <li className="flex justify-between gap-3 font-semibold text-zinc-900">
          <span>Penawaran ini</span>
          <span className="shrink-0">
            {rp(hargaSatuan)}/{item.unit}
          </span>
        </li>
        {tawaran.map((t) => (
          <li
            key={t.seller_key}
            className="flex justify-between gap-3 text-zinc-600"
          >
            <span className="min-w-0 truncate">
              {t.seller_name} · {tgl(t.approved_at)}
            </span>
            <span className="shrink-0">
              {rp(t.unit_price)}/{item.unit}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
