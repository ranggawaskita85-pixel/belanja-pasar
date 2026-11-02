"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Button from "@/app/components/Button";
import { Panel, Notice, inputCls, labelCls } from "@/app/components/Shell";
import { useUI } from "@/app/components/UIProvider";
import { SATUAN } from "@/app/components/itemUtils";
import NamaBarangInput from "@/app/components/NamaBarangInput";
import { rapikanNama, useMasterItems } from "@/app/components/useMasterItems";
import { useKategori } from "@/app/components/useKategori";
import { useRiwayatHarga } from "@/app/components/useHarga";

type ItemAsli = {
  id: number | string;
  name: string;
  qty: number | string;
  unit: string;
  price: number | string | null;
  category?: string | null;
  internal?: boolean | null;
};

type Baris = {
  key: string;
  id?: number | string;
  name: string;
  qty: string;
  unit: string;
  price: string;
  category: string;
  internal?: boolean | null;
};

const rp = (v: number) => `Rp ${Math.round(v).toLocaleString("id-ID")}`;

function dariItem(i: ItemAsli): Baris {
  return {
    key: `item-${i.id}`,
    id: i.id,
    name: i.name,
    qty: String(i.qty),
    unit: i.unit,
    price: Number(i.price) > 0 ? String(Number(i.price)) : "",
    category: i.category?.trim() ?? "",
    internal: i.internal ?? null,
  };
}

/**
 * Edit catatan pesanan yang sudah selesai (hanya untuk pembeli).
 * Status pesanan tidak berubah dan penjual tidak diberi kabar. Barang yang
 * ditambahkan di sini ditandai internal, jadi tidak tampil di halaman link penjual.
 */
export default function EditCatatan({
  order,
  items,
  kolomInternal,
  onClose,
  onSaved,
}: {
  order: { id: string; seller_name?: string | null; created_at?: string | null };
  items: ItemAsli[];
  kolomInternal: boolean;
  onClose: () => void;
  /** dipanggil setelah selesai (berhasil atau tidak) agar halaman memuat ulang data */
  onSaved: () => void;
}) {
  const supabase = createClient();
  const { toast, confirm } = useUI();
  const master = useMasterItems();
  const kategori = useKategori();
  const { catat } = useRiwayatHarga();

  const [rows, setRows] = useState<Baris[]>(() => items.map(dariItem));
  const [hapusIds, setHapusIds] = useState<(number | string)[]>([]);
  const [saving, setSaving] = useState(false);
  const [nomorBaru, setNomorBaru] = useState(0);

  // form tambah barang
  const [nName, setNName] = useState("");
  const [nQty, setNQty] = useState("");
  const [nUnit, setNUnit] = useState("kg");
  const [nPrice, setNPrice] = useState("");
  const [nCategory, setNCategory] = useState("");

  const asliPerId = new Map(items.map((i) => [String(i.id), i]));

  const berubah = (r: Baris) => {
    const a = r.id !== undefined ? asliPerId.get(String(r.id)) : undefined;
    if (!a) return false;
    return (
      r.name.trim() !== a.name ||
      Number(r.qty) !== Number(a.qty) ||
      r.unit !== a.unit ||
      (Number(r.price) || 0) !== (Number(a.price) || 0) ||
      r.category.trim() !== (a.category ?? "").trim()
    );
  };

  const adaPerubahan =
    hapusIds.length > 0 || rows.some((r) => r.id === undefined || berubah(r));

  const ubah = (key: string, bagian: Partial<Baris>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...bagian } : r)));

  const hapusBaris = (r: Baris) => {
    setRows((prev) => prev.filter((x) => x.key !== r.key));
    if (r.id !== undefined) setHapusIds((prev) => [...prev, r.id as number | string]);
  };

  const tambah = () => {
    if (!nName.trim() || !nQty) {
      toast("Isi nama barang dan jumlahnya dulu ya!", "error");
      return;
    }
    if (!(Number(nQty) > 0)) {
      toast("Jumlah barang harus lebih dari 0.", "error");
      return;
    }
    if (nPrice && !(Number(nPrice) >= 0)) {
      toast("Harga tidak boleh negatif.", "error");
      return;
    }
    setRows((prev) => [
      ...prev,
      {
        key: `baru-${nomorBaru}`,
        name: master.kanonik(nName),
        qty: nQty,
        unit: nUnit,
        price: Number(nPrice) > 0 ? String(Number(nPrice)) : "",
        category: kategori.kanonik(nCategory),
      },
    ]);
    setNomorBaru((n) => n + 1);
    setNName("");
    setNQty("");
    setNPrice("");
  };

  const handleBatal = async () => {
    if (adaPerubahan) {
      const ok = await confirm({
        title: "Buang perubahan?",
        description: "Perubahan yang belum disimpan akan dibuang.",
        confirmLabel: "Ya, buang",
        cancelLabel: "Lanjut mengedit",
        destructive: true,
      });
      if (!ok) return;
    }
    onClose();
  };

  const handleSimpan = async () => {
    const tidakValid = rows.some(
      (r) =>
        !r.name.trim() ||
        !(Number(r.qty) > 0) ||
        (r.price !== "" && !(Number(r.price) >= 0))
    );
    if (tidakValid) {
      toast("Pastikan nama, jumlah, dan harga semua barang sudah benar.", "error");
      return;
    }
    if (!adaPerubahan) {
      onClose();
      return;
    }

    setSaving(true);
    const gagal = (pesan: string) => {
      toast(
        `${pesan} Sebagian perubahan mungkin sudah tersimpan, periksa daftarnya.`,
        "error"
      );
      setSaving(false);
      onSaved();
    };

    // 1. Hapus barang yang dibuang
    if (hapusIds.length > 0) {
      const { error } = await supabase.from("items").delete().in("id", hapusIds);
      if (error) return gagal("Gagal menghapus barang: " + error.message);
    }

    // 2. Perbarui barang yang diubah
    for (const r of rows.filter((x) => x.id !== undefined && berubah(x))) {
      const { error } = await supabase
        .from("items")
        .update({
          name: rapikanNama(r.name),
          qty: Number(r.qty),
          unit: r.unit,
          price: Number(r.price) > 0 ? Number(r.price) : null,
          category: kategori.kanonik(r.category) || null,
        })
        .eq("id", r.id);
      if (error) return gagal("Gagal menyimpan perubahan: " + error.message);
    }

    // 3. Tambah barang baru (ditandai internal agar tidak tampil di halaman penjual)
    const baru = rows.filter((r) => r.id === undefined);
    if (baru.length > 0) {
      const { error } = await supabase.from("items").insert(
        baru.map((r) => ({
          order_id: order.id,
          name: rapikanNama(r.name),
          qty: Number(r.qty),
          unit: r.unit,
          price: Number(r.price) > 0 ? Number(r.price) : null,
          category: kategori.kanonik(r.category) || null,
          status: "requested",
          ...(kolomInternal ? { internal: true } : {}),
        }))
      );
      if (error) return gagal("Gagal menambah barang: " + error.message);
    }

    // 4. Nama barang dan judul kelompok baru ikut masuk daftar pilihan
    const namaBerubah = rows.filter((r) => r.id === undefined || berubah(r));
    await master.simpanBaru(namaBerubah.map((r) => ({ name: r.name, unit: r.unit })));
    await kategori.simpanBaru(rows.map((r) => r.category));

    // 5. Harga terbaru jadi pembanding (dan baris lama yang sudah tidak ada dibersihkan)
    if (order.seller_name) {
      await catat(
        order.id,
        order.seller_name,
        rows.map((r) => ({
          name: r.name,
          qty: Number(r.qty),
          unit: r.unit,
          price: r.price === "" ? null : Number(r.price),
        })),
        order.created_at ?? undefined,
        { bersihkan: true }
      );
    }

    toast("Catatan belanja diperbarui.", "success");
    setSaving(false);
    onSaved();
  };

  const totalHarga = rows.reduce((n, r) => n + (Number(r.price) > 0 ? Number(r.price) : 0), 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit catatan"
      className="fixed inset-0 z-50 flex flex-col bg-zinc-100"
    >
      <header className="bg-emerald-800 text-white">
        <div className="mx-auto flex h-14 max-w-lg items-center px-4">
          <h2 className="text-lg font-bold">Edit Catatan</h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg space-y-3 pb-4 pt-3">
          <Notice tone="info">
            Perubahan hanya untuk catatan Anda: status tetap selesai dan
            penjual tidak diberi kabar. Barang yang ditambahkan tidak tampil
            di halaman link penjual.
          </Notice>

          <Panel title="Tambah Barang">
            <div className="space-y-4 px-4 py-3">
              <div>
                <span className={labelCls}>Judul kelompok (boleh kosong)</span>
                <NamaBarangInput
                  ariaLabel="Judul kelompok barang baru"
                  placeholder="Pilih atau ketik judul sendiri"
                  value={nCategory}
                  onChange={setNCategory}
                  suggestions={kategori.items}
                  tersedia={kategori.tersedia}
                  petunjukBaru="Judul baru, akan masuk ke daftar pilihan."
                  tampilSemua
                />
              </div>
              <div>
                <span className={labelCls}>Nama barang</span>
                <NamaBarangInput
                  ariaLabel="Nama barang baru"
                  placeholder="Contoh: Wortel"
                  value={nName}
                  onChange={setNName}
                  suggestions={master.items}
                  tersedia={master.tersedia}
                  onPick={(m) => {
                    if (m.last_unit && SATUAN.includes(m.last_unit)) setNUnit(m.last_unit);
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className={labelCls}>Jumlah</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    aria-label="Jumlah barang baru"
                    className={`${inputCls} tabular-nums`}
                    value={nQty}
                    onChange={(e) => setNQty(e.target.value)}
                  />
                </div>
                <div>
                  <span className={labelCls}>Satuan</span>
                  <select
                    aria-label="Satuan barang baru"
                    className={inputCls}
                    value={nUnit}
                    onChange={(e) => setNUnit(e.target.value)}
                  >
                    {SATUAN.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className={labelCls}>Harga (Rp)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="any"
                    aria-label="Harga barang baru"
                    className={`${inputCls} tabular-nums`}
                    value={nPrice}
                    onChange={(e) => setNPrice(e.target.value)}
                  />
                </div>
              </div>
              <Button variant="secondary" onClick={tambah}>
                <Plus className="h-5 w-5" strokeWidth={2.5} />
                Tambah ke Catatan
              </Button>
            </div>
          </Panel>

          <Panel title="Isi Catatan" aside={`${rows.length} barang`}>
            {rows.length === 0 ? (
              <p className="px-4 py-6 text-center text-base text-zinc-500">
                Belum ada barang.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-200">
                {rows.map((r, i) => (
                  <li key={r.key} className="space-y-2 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        aria-label={`Nama barang ${i + 1}`}
                        className={`${inputCls} flex-1 font-semibold`}
                        value={r.name}
                        onChange={(e) => ubah(r.key, { name: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => hapusBaris(r)}
                        aria-label={`Hapus barang ${i + 1}`}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-700 active:bg-red-100"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        aria-label={`Jumlah barang ${i + 1}`}
                        className={`${inputCls} tabular-nums`}
                        value={r.qty}
                        onChange={(e) => ubah(r.key, { qty: e.target.value })}
                      />
                      <select
                        aria-label={`Satuan barang ${i + 1}`}
                        className={inputCls}
                        value={r.unit}
                        onChange={(e) => ubah(r.key, { unit: e.target.value })}
                      >
                        {Array.from(new Set([...SATUAN, r.unit])).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="any"
                        placeholder="Harga"
                        aria-label={`Harga barang ${i + 1}`}
                        className={`${inputCls} tabular-nums`}
                        value={r.price}
                        onChange={(e) => ubah(r.key, { price: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`Kelompok barang ${i + 1}`}
                        className={`${inputCls} flex-1`}
                        value={r.category}
                        onChange={(e) => ubah(r.key, { category: e.target.value })}
                      >
                        <option value="">Tanpa kelompok</option>
                        {Array.from(
                          new Set([...kategori.items.map((k) => k.name), r.category].filter(Boolean))
                        ).map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                      {(r.id === undefined || r.internal) && (
                        <span className="shrink-0 rounded-md bg-amber-100 px-2 py-1 text-xs font-bold uppercase text-amber-900">
                          {r.id === undefined ? "Baru" : "Internal"}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <footer className="border-t border-zinc-300 bg-white">
        <div className="mx-auto max-w-lg space-y-2 px-4 py-3">
          <p className="flex items-baseline justify-between text-base text-zinc-600">
            Total harga
            <span className="text-lg font-bold tabular-nums text-zinc-900">
              {rp(totalHarga)}
            </span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              block={false}
              className="px-6"
              onClick={handleBatal}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              block={false}
              className="flex-1"
              onClick={handleSimpan}
              loading={saving}
            >
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
