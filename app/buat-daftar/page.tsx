"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Plus,
  Trash2,
  Tag,
  Save,
  ListPlus,
  ShoppingBasket,
} from "lucide-react";
import Button from "@/app/components/Button";
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

const inputCls =
  "h-14 w-full rounded-xl border-2 border-stone-300 bg-white px-4 text-base text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/15";

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
    <div className="min-h-dvh bg-stone-50">
      <header className="rounded-b-3xl bg-gradient-to-br from-emerald-600 to-green-800 px-5 pb-7 pt-6 shadow-md">
        <div className="mx-auto max-w-lg">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-1 text-base font-semibold text-emerald-50 hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
            Kembali
          </Link>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-white">
            Buat Daftar Belanja
          </h1>
          <p className="mt-2 text-base leading-7 text-emerald-50">
            Tulis barang yang mau dibeli, lalu simpan.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 pb-12 pt-5">
        {/* Nama daftar */}
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <label
            htmlFor="nama-daftar"
            className="block text-base font-bold text-stone-900"
          >
            Nama Daftar
          </label>
          <input
            id="nama-daftar"
            type="text"
            className={`${inputCls} mt-2`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </section>

        {/* Tambah barang */}
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900">
            <ListPlus className="h-5 w-5 text-emerald-700" />
            Tambah Barang
          </h2>

          {/* Judul / kategori */}
          <div className="mt-4">
            <p className="flex items-center gap-2 text-base font-semibold text-stone-800">
              <Tag className="h-4 w-4 text-emerald-700" />
              Judul kelompok (boleh dikosongkan)
            </p>
            <p className="mt-1 text-sm leading-6 text-stone-500">
              Ketuk salah satu, atau ketik sendiri. Barang yang ditambahkan
              akan masuk ke judul ini.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {KATEGORI_CEPAT.map((k) => {
                const aktif = category === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setCategory(aktif ? "" : k)}
                    aria-pressed={aktif}
                    className={`min-h-11 rounded-full border-2 px-4 text-base font-semibold transition active:scale-95 ${
                      aktif
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
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
              className={`${inputCls} mt-3`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <div className="my-5 border-t border-stone-100" />

          {/* Nama, jumlah, satuan */}
          <div className="space-y-3">
            <div>
              <label
                htmlFor="nama-barang"
                className="block text-base font-semibold text-stone-800"
              >
                Nama barang
              </label>
              <input
                id="nama-barang"
                type="text"
                placeholder="Contoh: Wortel"
                className={`${inputCls} mt-1.5`}
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="jumlah-barang"
                  className="block text-base font-semibold text-stone-800"
                >
                  Jumlah
                </label>
                <input
                  id="jumlah-barang"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="0"
                  className={`${inputCls} mt-1.5`}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") tambahItem();
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="satuan-barang"
                  className="block text-base font-semibold text-stone-800"
                >
                  Satuan
                </label>
                <select
                  id="satuan-barang"
                  className={`${inputCls} mt-1.5`}
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

            <Button onClick={tambahItem}>
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              Tambah ke Daftar
            </Button>
          </div>
        </section>

        {/* Daftar yang sudah ditambahkan */}
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900">
              <ShoppingBasket className="h-5 w-5 text-emerald-700" />
              Isi Daftar
            </h2>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
              {items.length} barang
            </span>
          </div>

          {items.length === 0 ? (
            <p className="mt-4 rounded-xl border-2 border-dashed border-stone-200 px-4 py-6 text-center text-base text-stone-500">
              Belum ada barang. Isi form di atas lalu ketuk &quot;Tambah ke
              Daftar&quot;.
            </p>
          ) : (
            <div className="mt-2">
              {groups.map((group, gi) => (
                <div key={`${group.category ?? "_"}-${gi}`} className="mt-3">
                  {hasCategory && (
                    <h3 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-800">
                      <Tag className="h-4 w-4" />
                      {group.category ?? "Lainnya"}
                    </h3>
                  )}
                  <ul className="divide-y divide-stone-100">
                    {group.items.map((item, ii) => (
                      <li
                        key={`${item.name}-${ii}`}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-base font-bold text-stone-900">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-base text-stone-500">
                            {item.qty} {item.unit}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => hapusItem(item)}
                          aria-label={`Hapus ${item.name}`}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-red-200 bg-white text-red-600 transition hover:bg-red-50 active:scale-95"
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
        </section>

        <Button
          onClick={simpanDaftar}
          loading={loading}
          disabled={items.length === 0}
          variant="accent"
        >
          <Save className="h-5 w-5" strokeWidth={2.25} />
          {loading ? "Menyimpan..." : "Simpan Daftar Belanja"}
        </Button>
      </main>
    </div>
  );
}
