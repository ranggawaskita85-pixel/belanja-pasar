"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save } from "lucide-react";
import Button from "@/app/components/Button";
import {
  AppBar,
  Panel,
  BottomBar,
  TotalLine,
  Notice,
  inputCls,
  labelCls,
} from "@/app/components/Shell";
import { useUI } from "@/app/components/UIProvider";
import { SATUAN, groupByCategory } from "@/app/components/itemUtils";
import { useBeforeUnload } from "@/app/components/useBeforeUnload";
import NamaBarangInput from "@/app/components/NamaBarangInput";
import { useMasterItems } from "@/app/components/useMasterItems";
import { useKategori } from "@/app/components/useKategori";
import { useDaftarPenjual, useRiwayatHarga } from "@/app/components/useHarga";
import { tanggalIsoLokal } from "@/lib/excel";

type DraftItem = {
  name: string;
  qty: number;
  unit: string;
  category: string | null;
  /** harga total; hanya diisi pada catatan tanggal lampau */
  price: number | null;
};

const rp = (v: number) => `Rp ${Math.round(v).toLocaleString("id-ID")}`;

/** "2026-10-20" -> tanggal itu jam 12.00 waktu perangkat, supaya tidak bergeser hari. */
function waktuDicatat(tanggal: string) {
  const [y, m, d] = tanggal.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

function judulUntuk(tanggal: string) {
  const [y, m, d] = tanggal.split("-").map(Number);
  return "Belanja " + new Date(y, m - 1, d).toLocaleDateString("id-ID");
}

export default function BuatDaftar() {
  const [title, setTitle] = useState(
    "Belanja " + new Date().toLocaleDateString("id-ID")
  );
  const [items, setItems] = useState<DraftItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("kg");
  const [category, setCategory] = useState("");
  const [hargaItem, setHargaItem] = useState("");
  const [loading, setLoading] = useState(false);
  const [judulAwal] = useState(title);

  // Tanggal belanja. Diisi setelah halaman tampil agar tidak beda dengan versi server.
  const [hariIni, setHariIni] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [penjualInput, setPenjualInput] = useState("");
  const judulOtomatis = useRef(judulAwal);

  const supabase = createClient();
  const router = useRouter();
  const { toast, confirm } = useUI();
  const master = useMasterItems();
  const kategori = useKategori();
  const penjual = useDaftarPenjual();
  const { catat: catatHarga } = useRiwayatHarga();

  useEffect(() => {
    const t = tanggalIsoLokal();
    setHariIni(t);
    setTanggal(t);
  }, []);

  // Tanggal sebelum hari ini = mencatat belanja yang sudah lewat.
  const lampau = tanggal !== "" && hariIni !== "" && tanggal < hariIni;

  // Ada isian yang belum disimpan?
  const dirty =
    items.length > 0 ||
    itemName.trim() !== "" ||
    title !== judulAwal ||
    (tanggal !== "" && tanggal !== hariIni);
  useBeforeUnload(dirty && !loading);

  const ubahTanggal = (nilai: string) => {
    const baru = nilai && hariIni && nilai > hariIni ? hariIni : nilai;
    setTanggal(baru);
    // Judul bawaan ikut tanggal, selama belum diubah sendiri
    if (baru && title === judulOtomatis.current) {
      const judulBaru = judulUntuk(baru);
      judulOtomatis.current = judulBaru;
      setTitle(judulBaru);
    }
  };

  // Fungsi untuk menambah item ke daftar sementara (di layar)
  const tambahItem = () => {
    if (!itemName.trim() || !qty) {
      toast("Isi nama barang dan jumlahnya dulu ya!", "error");
      return;
    }
    if (!(Number(qty) > 0)) {
      toast("Jumlah barang harus lebih dari 0.", "error");
      return;
    }
    if (hargaItem && !(Number(hargaItem) >= 0)) {
      toast("Harga tidak boleh negatif.", "error");
      return;
    }
    setItems([
      ...items,
      {
        name: master.kanonik(itemName),
        qty: Number(qty),
        unit,
        category: kategori.kanonik(category) || null,
        price: lampau && Number(hargaItem) > 0 ? Number(hargaItem) : null,
      },
    ]);
    setItemName("");
    setQty("");
    setHargaItem("");
  };

  const hapusItem = (target: DraftItem) => {
    setItems(items.filter((i) => i !== target));
  };

  // Fungsi untuk menyimpan semuanya ke database Supabase
  const simpanDaftar = async () => {
    if (items.length === 0) {
      toast("Daftar belanja masih kosong!", "error");
      return;
    }
    setLoading(true);

    const waktu = lampau ? waktuDicatat(tanggal) : null;
    const namaPenjual = lampau && penjual.tersedia ? penjual.kanonik(penjualInput) : "";

    // 1. Simpan judul daftar ke tabel 'orders'
    //    Catatan tanggal lampau langsung berstatus selesai, tanpa link ke penjual.
    const { data: order, error: err1 } = await supabase
      .from("orders")
      .insert(
        lampau
          ? {
              title,
              status: "completed",
              created_at: waktu,
              ...(namaPenjual ? { seller_name: namaPenjual } : {}),
            }
          : { title, status: "draft" }
      )
      .select()
      .single();

    if (err1) {
      toast("Gagal simpan pesanan: " + err1.message, "error");
      setLoading(false);
      return;
    }

    // 2. Simpan semua item ke tabel 'items', hubungkan dengan ID pesanan di atas
    const itemsToInsert = items.map((i) => ({
      order_id: order.id,
      name: i.name,
      qty: i.qty,
      unit: i.unit,
      category: i.category,
      status: "requested",
      ...(lampau ? { price: i.price } : {}),
    }));

    const { error: err2 } = await supabase.from("items").insert(itemsToInsert);

    if (err2) {
      toast("Gagal simpan item: " + err2.message, "error");
      setLoading(false);
      return;
    }

    // Nama barang dan judul kelompok baru ikut masuk ke daftar pilihan
    // (gagal pun tidak mengganggu)
    await master.simpanBaru(items.map((i) => ({ name: i.name, unit: i.unit })));
    await kategori.simpanBaru(items.map((i) => i.category));

    // Catatan lampau dengan nama penjual dan harga ikut jadi harga pembanding,
    // bertanggal sesuai hari belanjanya.
    if (lampau && namaPenjual && waktu) {
      await catatHarga(order.id, namaPenjual, items, waktu);
    }

    toast(
      lampau ? "Catatan belanja berhasil disimpan!" : "Daftar belanja berhasil disimpan!",
      "success"
    );
    router.push("/"); // Kembali ke halaman utama
  };

  const handleBatal = async () => {
    if (dirty) {
      const ok = await confirm({
        title: "Batalkan daftar ini?",
        description: "Semua isian yang belum disimpan akan dibuang.",
        confirmLabel: "Ya, batalkan",
        cancelLabel: "Lanjut mengisi",
        destructive: true,
      });
      if (!ok) return;
    }
    router.push("/");
  };

  const groups = groupByCategory(items);
  const hasCategory = groups.some((g) => g.category);
  const totalHarga = items.reduce((n, i) => n + (i.price ?? 0), 0);

  return (
    <div className="min-h-dvh bg-zinc-100 pb-36">
      <AppBar title="Daftar Baru" backHref="/" homeDirty={dirty} />

      <main className="mx-auto max-w-lg space-y-3 pt-3">
        <Panel title="Nama Daftar">
          <div className="px-4 py-3">
            <label htmlFor="nama-daftar" className="sr-only">
              Nama daftar
            </label>
            <input
              id="nama-daftar"
              type="text"
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </Panel>

        <Panel title="Tanggal Belanja">
          <div className="space-y-3 px-4 py-3">
            <div>
              <label htmlFor="tanggal-belanja" className="sr-only">
                Tanggal belanja
              </label>
              <input
                id="tanggal-belanja"
                type="date"
                max={hariIni || undefined}
                className={inputCls}
                value={tanggal}
                onChange={(e) => ubahTanggal(e.target.value)}
              />
            </div>

            {lampau && (
              <>
                <Notice tone="info">
                  Tanggal sudah lewat, jadi daftar ini dicatat sebagai belanja
                  yang sudah selesai: tanpa link ke penjual, hanya untuk
                  catatan Anda.
                </Notice>
                {penjual.tersedia && (
                  <div>
                    <label htmlFor="nama-penjual" className={labelCls}>
                      Nama penjual (disarankan)
                    </label>
                    <NamaBarangInput
                      id="nama-penjual"
                      placeholder="Nama tukang sayur atau penjual"
                      value={penjualInput}
                      onChange={setPenjualInput}
                      suggestions={penjual.daftar}
                      tersedia={penjual.tersedia}
                      petunjukBaru="Penjual baru, akan disimpan."
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </Panel>

        <Panel title="Tambah Barang">
          <div className="space-y-4 px-4 py-3">
            <div>
              <label htmlFor="judul-kelompok" className={labelCls}>
                Judul kelompok (boleh kosong)
              </label>
              <NamaBarangInput
                id="judul-kelompok"
                placeholder="Pilih atau ketik judul sendiri"
                value={category}
                onChange={setCategory}
                suggestions={kategori.items}
                tersedia={kategori.tersedia}
                petunjukBaru="Judul baru, akan masuk ke daftar pilihan."
                tampilSemua
              />
            </div>

            <div>
              <label htmlFor="nama-barang" className={labelCls}>
                Nama barang
              </label>
              <NamaBarangInput
                id="nama-barang"
                placeholder="Contoh: Wortel"
                value={itemName}
                onChange={setItemName}
                suggestions={master.items}
                tersedia={master.tersedia}
                onPick={(m) => {
                  if (m.last_unit && SATUAN.includes(m.last_unit)) {
                    setUnit(m.last_unit);
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="jumlah-barang" className={labelCls}>
                  Jumlah
                </label>
                <input
                  id="jumlah-barang"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="0"
                  className={`${inputCls} tabular-nums`}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") tambahItem();
                  }}
                />
              </div>
              <div>
                <label htmlFor="satuan-barang" className={labelCls}>
                  Satuan
                </label>
                <select
                  id="satuan-barang"
                  className={inputCls}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  {SATUAN.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {lampau && (
              <div>
                <label htmlFor="harga-barang" className={labelCls}>
                  Harga total (Rp), boleh kosong
                </label>
                <input
                  id="harga-barang"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="any"
                  placeholder="0"
                  className={`${inputCls} tabular-nums`}
                  value={hargaItem}
                  onChange={(e) => setHargaItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") tambahItem();
                  }}
                />
              </div>
            )}

            <Button variant="secondary" onClick={tambahItem}>
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              Tambah ke Daftar
            </Button>
          </div>
        </Panel>

        <Panel title="Isi Daftar" aside={`${items.length} barang`}>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-base text-zinc-500">
              Belum ada barang.
            </p>
          ) : (
            <div>
              {groups.map((group, gi) => (
                <div key={`${group.category ?? "_"}-${gi}`}>
                  {hasCategory && (
                    <div className="bg-zinc-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-700">
                      {group.category ?? "Lainnya"}
                    </div>
                  )}
                  <ul className="divide-y divide-zinc-200">
                    {group.items.map((item, ii) => (
                      <li
                        key={`${item.name}-${ii}`}
                        className="flex items-center gap-3 px-4 py-2"
                      >
                        <p className="min-w-0 flex-1 break-words text-base font-semibold text-zinc-900">
                          {item.name}
                        </p>
                        <p className="shrink-0 text-base tabular-nums text-zinc-600">
                          {item.qty} {item.unit}
                        </p>
                        {lampau && (
                          <p className="w-24 shrink-0 text-right text-base font-semibold tabular-nums text-zinc-900">
                            {item.price ? rp(item.price) : "-"}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => hapusItem(item)}
                          aria-label={`Hapus ${item.name}`}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-700 active:bg-red-100"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </main>

      <BottomBar>
        {lampau ? (
          <TotalLine label="Total belanja" value={rp(totalHarga)} />
        ) : (
          <TotalLine label="Jumlah barang" value={String(items.length)} />
        )}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            block={false}
            className="px-6"
            onClick={handleBatal}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            block={false}
            className="flex-1"
            onClick={simpanDaftar}
            loading={loading}
            disabled={items.length === 0}
          >
            <Save className="h-5 w-5" strokeWidth={2.25} />
            {loading
              ? "Menyimpan..."
              : lampau
                ? "Simpan Catatan"
                : "Simpan Daftar"}
          </Button>
        </div>
      </BottomBar>
    </div>
  );
}
