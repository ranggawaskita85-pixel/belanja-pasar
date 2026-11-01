"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save } from "lucide-react";
import Button from "@/app/components/Button";
import {
  AppBar,
  Panel,
  BottomBar,
  TotalLine,
  inputCls,
  labelCls,
} from "@/app/components/Shell";
import { useUI } from "@/app/components/UIProvider";
import {
  SATUAN,
  KATEGORI_CEPAT,
  groupByCategory,
} from "@/app/components/itemUtils";

type DraftItem = {
  name: string;
  qty: number;
  unit: string;
  category: string | null;
};

export default function BuatDaftar() {
  const [title, setTitle] = useState(
    "Belanja " + new Date().toLocaleDateString("id-ID")
  );
  const [items, setItems] = useState<DraftItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("kg");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const { toast } = useUI();

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
    setItems([
      ...items,
      {
        name: itemName.trim(),
        qty: Number(qty),
        unit,
        category: category.trim() || null,
      },
    ]);
    setItemName("");
    setQty("");
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

    // 1. Simpan judul daftar ke tabel 'orders'
    const { data: order, error: err1 } = await supabase
      .from("orders")
      .insert({ title, status: "draft" })
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
    }));

    const { error: err2 } = await supabase.from("items").insert(itemsToInsert);

    if (err2) {
      toast("Gagal simpan item: " + err2.message, "error");
      setLoading(false);
      return;
    }

    toast("Daftar belanja berhasil disimpan!", "success");
    router.push("/"); // Kembali ke halaman utama
  };

  const groups = groupByCategory(items);
  const hasCategory = groups.some((g) => g.category);

  return (
    <div className="min-h-dvh bg-zinc-100 pb-36">
      <AppBar title="Daftar Baru" backHref="/" />

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

        <Panel title="Tambah Barang">
          <div className="space-y-4 px-4 py-3">
            <div>
              <span className={labelCls}>Judul kelompok (boleh kosong)</span>
              <div className="flex flex-wrap gap-2">
                {KATEGORI_CEPAT.map((k) => {
                  const aktif = category === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setCategory(aktif ? "" : k)}
                      aria-pressed={aktif}
                      className={`h-10 rounded-md border px-3 text-sm font-semibold transition ${
                        aktif
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-zinc-400 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {k}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                aria-label="Judul kelompok sendiri"
                placeholder="Atau ketik judul sendiri"
                className={`${inputCls} mt-2`}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="nama-barang" className={labelCls}>
                Nama barang
              </label>
              <input
                id="nama-barang"
                type="text"
                placeholder="Contoh: Wortel"
                className={inputCls}
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
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
        <TotalLine label="Jumlah barang" value={String(items.length)} />
        <Button
          onClick={simpanDaftar}
          loading={loading}
          disabled={items.length === 0}
        >
          <Save className="h-5 w-5" strokeWidth={2.25} />
          {loading ? "Menyimpan..." : "Simpan Daftar"}
        </Button>
      </BottomBar>
    </div>
  );
}
