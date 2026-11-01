"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  arahSelisih,
  hitungRingkasan,
  susunPerbandingan,
  type BarisRiwayat,
} from "@/lib/harga";

type BarisItem = {
  id: number | string;
  name: string;
  qty: number | string;
  unit: string;
  price: number | string | null;
};

const rp = (v: number) => `Rp ${Math.round(v).toLocaleString("id-ID")}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

function daftarNama(nama: string[]) {
  if (nama.length <= 4) return nama.join(", ");
  return `${nama.slice(0, 4).join(", ")}, dan ${nama.length - 4} lainnya`;
}

/** Warna sesuai sudut pandang pembeli: penjual lain lebih murah = merah. */
function Selisih({
  totalKiri,
  totalKanan,
  testId,
}: {
  totalKiri: number;
  totalKanan: number;
  testId?: string;
}) {
  const { tipe, selisih } = arahSelisih(totalKiri, totalKanan);
  if (tipe === "sama") {
    return <span data-testid={testId}>Total sama</span>;
  }
  const murah = tipe === "kananMurah";
  return (
    <span data-testid={testId}>
      {murah ? "Penjual lain lebih murah " : "Penjual lain lebih mahal "}
      <span
        className={`font-bold tabular-nums ${
          murah ? "text-red-700" : "text-emerald-700"
        }`}
        data-warna={murah ? "merah" : "hijau"}
      >
        {rp(selisih)}
      </span>
    </span>
  );
}

/**
 * Lembar perbandingan dua kolom. Kiri: penawaran penjual pada pesanan ini.
 * Kanan: satu penjual lain (bawaan: barang paling lengkap, lalu total
 * terendah) dengan harga dikonversi ke jumlah dan satuan kolom kiri.
 */
export default function PerbandinganHarga({
  items,
  riwayat,
  orderId,
  penjualSendiri,
  onClose,
}: {
  items: BarisItem[];
  riwayat: BarisRiwayat[];
  orderId: string;
  penjualSendiri: string;
  onClose: () => void;
}) {
  const [pilihan, setPilihan] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { opsi } = useMemo(
    () => susunPerbandingan(items, riwayat, { orderId, penjualSendiri }),
    [items, riwayat, orderId, penjualSendiri]
  );

  const terpilih = opsi.find((o) => o.seller_key === pilihan) ?? opsi[0];
  const ringkas = terpilih ? hitungRingkasan(items, terpilih.sel) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bandingkan harga"
      className="fixed inset-0 z-50 flex flex-col bg-zinc-100"
    >
      <header className="bg-emerald-800 text-white">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-1 px-2">
          <h2 className="flex-1 px-2 text-lg font-bold">Bandingkan Harga</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-emerald-700 active:bg-emerald-900"
          >
            <X className="h-6 w-6" strokeWidth={2.25} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg pb-4">
          {!terpilih || !ringkas ? (
            <div className="px-4 py-10 text-center">
              <p className="text-lg font-bold text-zinc-900">
                Belum ada penjual lain untuk dibandingkan
              </p>
              <p className="mt-1 text-base text-zinc-500">
                Harga dari penjual lain muncul di sini setelah penawarannya
                Anda simpan atau setujui.
              </p>
            </div>
          ) : (
            <>
              <div className="border-b border-zinc-300 bg-white px-4 py-3">
                <label
                  htmlFor="penjual-pembanding"
                  className="block text-sm font-bold uppercase tracking-wide text-zinc-600"
                >
                  Penjual pembanding
                </label>
                <select
                  id="penjual-pembanding"
                  className="mt-1 h-12 w-full rounded-md border border-zinc-400 bg-white px-3 text-base"
                  value={terpilih.seller_key}
                  onChange={(e) => setPilihan(e.target.value)}
                >
                  {opsi.map((o) => (
                    <option key={o.seller_key} value={o.seller_key}>
                      {o.seller_name} · {o.jumlahAda}/{items.length} barang ·{" "}
                      {rp(o.total)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-zinc-500">
                  Bawaan: penjual dengan barang paling lengkap, lalu total
                  terendah.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-px border-b border-zinc-300 bg-zinc-300 text-sm font-bold">
                <div className="bg-emerald-50 px-4 py-2 text-emerald-900">
                  <p>Penawaran {penjualSendiri || "ini"}</p>
                </div>
                <div className="bg-white px-4 py-2 text-zinc-900">
                  <p>{terpilih.seller_name}</p>
                  <p className="font-normal text-zinc-500">
                    harga per {tgl(terpilih.tanggalTerbaru)}
                  </p>
                </div>
              </div>

              <ul className="bg-white">
                {items.map((item, i) => {
                  const harga = Number(item.price);
                  const s = terpilih.sel[i];
                  return (
                    <li
                      key={item.id}
                      className="border-b border-zinc-200 px-4 py-3"
                    >
                      <p className="text-base font-semibold text-zinc-900">
                        {item.name}{" "}
                        <span className="text-sm font-normal text-zinc-500">
                          {item.qty} {item.unit}
                        </span>
                      </p>
                      <div className="mt-1 grid grid-cols-2 gap-3">
                        <div className="text-base tabular-nums">
                          {harga > 0 ? (
                            <span className="font-semibold">{rp(harga)}</span>
                          ) : (
                            <span className="italic text-zinc-400">Kosong</span>
                          )}
                        </div>
                        <div className="text-base tabular-nums">
                          {s.status === "ada" ? (
                            <>
                              <span className="font-semibold">{rp(s.harga)}</span>
                              <span className="block text-xs text-zinc-500">
                                {rp(s.hargaSatuan)}/{s.unit}
                                {s.dikonversi ? ` (dari ${s.unitAsal})` : ""}
                              </span>
                            </>
                          ) : s.status === "satuan_beda" ? (
                            <span className="text-sm italic text-zinc-400">
                              Satuan beda ({s.unitAsal})
                            </span>
                          ) : (
                            <span className="italic text-zinc-400">Tidak ada</span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="space-y-2 px-4 pt-3">
                {ringkas.kananKosong.length > 0 && (
                  <p
                    data-testid="catatan-kanan"
                    className="rounded-md border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-950"
                  >
                    Total {terpilih.seller_name} bisa tampak lebih murah karena{" "}
                    {ringkas.kananKosong.length} barang tidak ada atau satuannya
                    tidak bisa dikonversi: {daftarNama(ringkas.kananKosong)}.
                  </p>
                )}
                {ringkas.kiriKosong.length > 0 && (
                  <p
                    data-testid="catatan-kiri"
                    className="rounded-md border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-950"
                  >
                    {ringkas.kiriKosong.length} barang belum diberi harga di
                    penawaran ini ({daftarNama(ringkas.kiriKosong)}), jadi total
                    penawaran ini bisa tampak lebih murah.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {terpilih && ringkas && (
        <footer className="border-t border-zinc-300 bg-white">
          <div className="mx-auto max-w-lg space-y-1 px-4 py-3">
            <div className="grid grid-cols-2 gap-3 text-sm text-zinc-600">
              <p>
                Total penawaran
                <span
                  data-testid="total-kiri"
                  className="block text-lg font-bold tabular-nums text-zinc-900"
                >
                  {rp(ringkas.totalKiri)}
                </span>
              </p>
              <p>
                Total {terpilih.seller_name}
                <span
                  data-testid="total-kanan"
                  className="block text-lg font-bold tabular-nums text-zinc-900"
                >
                  {rp(ringkas.totalKanan)}
                </span>
              </p>
            </div>
            <p className="text-base text-zinc-800">
              Selisih:{" "}
              <Selisih
                testId="selisih-total"
                totalKiri={ringkas.totalKiri}
                totalKanan={ringkas.totalKanan}
              />
            </p>
            {ringkas.sebanding.jumlah > 0 &&
              (ringkas.kananKosong.length > 0 || ringkas.kiriKosong.length > 0) && (
                <p className="text-sm text-zinc-600">
                  Hanya {ringkas.sebanding.jumlah} barang yang sama-sama ada:{" "}
                  <Selisih
                    testId="selisih-sebanding"
                    totalKiri={ringkas.sebanding.totalKiri}
                    totalKanan={ringkas.sebanding.totalKanan}
                  />
                </p>
              )}
          </div>
        </footer>
      )}
    </div>
  );
}
