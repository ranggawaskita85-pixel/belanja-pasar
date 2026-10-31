"use client";

export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Copy,
  Check,
  MessageCircle,
  Link2,
  Wallet,
  PackageCheck,
  Pencil,
  Plus,
  Trash2,
  Tag,
  ShoppingBasket,
  FileQuestion,
  Info,
  PartyPopper,
  Hourglass,
} from "lucide-react";
import StatusBadge from "@/app/components/StatusBadge";
import StatusTimeline from "@/app/components/StatusTimeline";
import Button from "@/app/components/Button";
import { useUI } from "@/app/components/UIProvider";
import { SATUAN, groupByCategory } from "@/app/components/itemUtils";

type Order = {
  id: string;
  title: string;
  status: string;
  public_token?: string | null;
};

type Item = {
  id: number;
  order_id: string;
  name: string;
  qty: number;
  unit: string;
  price: number | string | null;
  category?: string | null;
};

// Salinan barang yang sedang diedit (di layar, belum disimpan)
type EditItem = {
  key: string;
  id?: number; // kosong = barang baru
  name: string;
  qty: string;
  unit: string;
  category: string | null;
};

const inputCls =
  "h-12 w-full rounded-xl border-2 border-stone-300 bg-white px-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/15";

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="h-5 w-1/3 animate-pulse rounded bg-stone-100" />
      <div className="mt-4 space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-stone-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-stone-100" />
      </div>
    </div>
  );
}

function Header({
  title,
  status,
  loading,
}: {
  title?: string;
  status?: string;
  loading?: boolean;
}) {
  return (
    <header className="rounded-b-3xl bg-gradient-to-br from-emerald-600 to-green-800 px-5 pb-7 pt-6 shadow-md">
      <div className="mx-auto max-w-lg">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-1 text-base font-semibold text-emerald-50 hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
          Kembali
        </Link>
        {loading ? (
          <>
            <div className="mt-3 h-8 w-2/3 animate-pulse rounded-lg bg-white/25" />
            <div className="mt-4 h-9 w-44 animate-pulse rounded-full bg-white/25" />
          </>
        ) : (
          <>
            <h1 className="mt-3 break-words text-2xl font-extrabold leading-tight tracking-tight text-white">
              {title}
            </h1>
            {status && (
              <div className="mt-3 inline-flex rounded-full bg-white p-1 shadow-sm">
                <StatusBadge status={status} />
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
}

export default function DetailDaftar() {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkVendor, setLinkVendor] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // State untuk fitur "Ubah Pesanan"
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newUnit, setNewUnit] = useState("kg");
  const [newCategory, setNewCategory] = useState("");
  const [revised, setRevised] = useState(false);

  const supabase = createClient();
  const params = useParams();
  const { confirm, toast } = useUI();

  useEffect(() => {
    async function getDetail() {
      const { data: orderData } = await supabase
        .from("orders")
        .select()
        .eq("id", params.id)
        .single();

      if (orderData) {
        setOrder(orderData);
        if (orderData.public_token) {
          setLinkVendor(
            `${window.location.origin}/vendor/${orderData.public_token}`
          );
        }
      }

      const { data: itemsData } = await supabase
        .from("items")
        .select()
        .eq("order_id", params.id)
        .order("id", { ascending: true });

      if (itemsData) setItems(itemsData);
      setLoading(false);
    }

    getDetail();
  }, [params.id]);

  const muatUlangItems = async (orderId: string) => {
    const { data } = await supabase
      .from("items")
      .select()
      .eq("order_id", orderId)
      .order("id", { ascending: true });
    if (data) setItems(data);
  };

  const handleKirim = async () => {
    setActionLoading(true);
    const token = crypto.randomUUID();

    const { error } = await supabase
      .from("orders")
      .update({ public_token: token, status: "sent" })
      .eq("id", params.id);

    if (!error) {
      setLinkVendor(`${window.location.origin}/vendor/${token}`);
      setOrder((prev) =>
        prev ? { ...prev, status: "sent", public_token: token } : prev
      );
      toast("Link untuk tukang sayur berhasil dibuat.", "success");
    } else {
      toast("Gagal membuat link: " + error.message, "error");
    }

    setActionLoading(false);
  };

  const handleApprove = async () => {
    const ok = await confirm({
      title: "Setujui harga ini?",
      description:
        "Setelah disetujui, Anda akan diminta mentransfer sesuai total tagihan.",
      confirmLabel: "Ya, setujui",
    });
    if (!ok) return;

    setActionLoading(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: "approved" })
      .eq("id", order?.id);

    if (!error && order) {
      setOrder({ ...order, status: "approved" });
      toast("Harga disetujui. Lanjutkan ke transfer.", "success");
    } else {
      toast("Gagal menyetujui harga.", "error");
    }
    setActionLoading(false);
  };

  const handleTransfer = async () => {
    const ok = await confirm({
      title: "Konfirmasi transfer",
      description:
        "Pastikan Anda sudah mentransfer sesuai total tagihan. Tukang sayur akan memproses pengiriman.",
      confirmLabel: "Ya, sudah transfer",
    });
    if (!ok) return;

    setActionLoading(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("id", order?.id);

    if (!error && order) {
      setOrder({ ...order, status: "paid" });
      toast("Transfer dikonfirmasi.", "success");
    } else {
      toast("Gagal mengonfirmasi transfer.", "error");
    }
    setActionLoading(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(linkVendor);
      setCopied(true);
      toast("Link tersalin ke papan klip.", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Gagal menyalin. Salin manual dari kotak link.", "error");
    }
  };

  /* ---------------- Fitur: Ubah Pesanan ---------------- */

  const mulaiEdit = () => {
    setEditItems(
      items.map((i) => ({
        key: String(i.id),
        id: i.id,
        name: i.name,
        qty: String(i.qty),
        unit: i.unit,
        category: i.category ?? null,
      }))
    );
    setNewName("");
    setNewQty("");
    setNewUnit("kg");
    setNewCategory("");
    setEditing(true);
  };

  const batalEdit = () => {
    setEditing(false);
    setEditItems([]);
  };

  const ubahEditItem = (key: string, patch: Partial<EditItem>) => {
    setEditItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, ...patch } : i))
    );
  };

  const hapusEditItem = (key: string) => {
    setEditItems((prev) => prev.filter((i) => i.key !== key));
  };

  const tambahEditItem = () => {
    if (!newName.trim() || !newQty) {
      toast("Isi nama barang dan jumlahnya dulu ya!", "error");
      return;
    }
    if (!(Number(newQty) > 0)) {
      toast("Jumlah barang harus lebih dari 0.", "error");
      return;
    }
    setEditItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        name: newName.trim(),
        qty: newQty,
        unit: newUnit,
        category: newCategory.trim() || null,
      },
    ]);
    setNewName("");
    setNewQty("");
  };

  const handleSimpanEdit = async () => {
    if (!order) return;
    const orderId = order.id;

    if (editItems.length === 0) {
      toast("Daftar tidak boleh kosong.", "error");
      return;
    }
    const tidakValid = editItems.some(
      (i) => !i.name.trim() || !(Number(i.qty) > 0)
    );
    if (tidakValid) {
      toast("Pastikan nama dan jumlah semua barang sudah terisi.", "error");
      return;
    }

    const ok = await confirm({
      title: "Kirim perubahan ke tukang sayur?",
      description:
        "Tukang sayur akan menghitung ulang harga. Setelah harga baru masuk, Anda perlu menyetujuinya lagi.",
      confirmLabel: "Ya, kirim perubahan",
    });
    if (!ok) return;

    setActionLoading(true);

    const gagal = async (pesan: string) => {
      toast(pesan + " Periksa daftar lalu coba lagi.", "error");
      await muatUlangItems(orderId);
      setEditing(false);
      setActionLoading(false);
    };

    // 1. Hapus barang yang dibuang
    const idDipertahankan = editItems
      .filter((i) => i.id !== undefined)
      .map((i) => i.id as number);
    const idDihapus = items
      .filter((i) => !idDipertahankan.includes(i.id))
      .map((i) => i.id);

    if (idDihapus.length > 0) {
      const { error } = await supabase
        .from("items")
        .delete()
        .in("id", idDihapus);
      if (error) return gagal("Gagal menghapus barang: " + error.message + ".");
    }

    // 2. Perbarui barang yang diubah (harga dikosongkan agar vendor mengisi ulang)
    for (const edited of editItems) {
      if (edited.id === undefined) continue;
      const asli = items.find((i) => i.id === edited.id);
      if (!asli) continue;

      const berubah =
        asli.name !== edited.name.trim() ||
        Number(asli.qty) !== Number(edited.qty) ||
        asli.unit !== edited.unit;
      if (!berubah) continue;

      const { error } = await supabase
        .from("items")
        .update({
          name: edited.name.trim(),
          qty: Number(edited.qty),
          unit: edited.unit,
          price: null,
        })
        .eq("id", edited.id);
      if (error) return gagal("Gagal menyimpan perubahan: " + error.message + ".");
    }

    // 3. Tambahkan barang baru
    const barangBaru = editItems.filter((i) => i.id === undefined);
    if (barangBaru.length > 0) {
      const { error } = await supabase.from("items").insert(
        barangBaru.map((i) => ({
          order_id: orderId,
          name: i.name.trim(),
          qty: Number(i.qty),
          unit: i.unit,
          category: i.category,
          status: "requested",
        }))
      );
      if (error) return gagal("Gagal menambah barang: " + error.message + ".");
    }

    // 4. Kembalikan status ke 'sent' supaya vendor bisa menghitung ulang
    const { error: errOrder } = await supabase
      .from("orders")
      .update({ status: "sent" })
      .eq("id", orderId);
    if (errOrder) return gagal("Gagal mengirim perubahan: " + errOrder.message + ".");

    await muatUlangItems(orderId);
    setOrder({ ...order, status: "sent" });
    setRevised(true);
    setEditing(false);
    setEditItems([]);
    toast("Perubahan tersimpan. Kirim ulang link ke tukang sayur.", "success");
    setActionLoading(false);
  };

  /* ---------------- Tampilan ---------------- */

  if (loading) {
    return (
      <div className="min-h-dvh bg-stone-50">
        <Header loading />
        <main className="mx-auto max-w-lg space-y-3 px-4 pb-10 pt-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-dvh bg-stone-50">
        <Header title="Daftar tidak ditemukan" />
        <main className="mx-auto max-w-lg px-4 pb-10 pt-6">
          <div className="rounded-3xl border-2 border-dashed border-stone-300 bg-white px-6 py-10 text-center">
            <FileQuestion
              className="mx-auto h-12 w-12 text-stone-300"
              strokeWidth={1.5}
            />
            <p className="mt-4 text-lg font-bold text-stone-800">
              Daftar ini tidak ditemukan
            </p>
            <p className="mt-1 text-base text-stone-500">
              Mungkin sudah dihapus atau alamatnya keliru.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-base font-bold text-white hover:bg-emerald-700"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const total = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0),
    0
  );

  // Pesanan yang sedang direvisi: sudah pernah ada harga, atau baru saja diubah
  const isRevisi =
    revised || (order.status === "sent" && items.some((i) => Number(i.price) > 0));

  const waText = isRevisi
    ? `Halo, daftar belanja saya sudah saya ubah. Mohon hitung ulang harganya ya: ${linkVendor}`
    : `Halo, ini daftar belanja saya: ${linkVendor}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;

  const groups = groupByCategory(items);
  const hasCategory = groups.some((g) => g.category);
  const sudahAdaHarga = order.status !== "draft" && order.status !== "sent";

  const editGroups = groupByCategory(editItems);
  const hasEditCategory = editGroups.some((g) => g.category);
  const kategoriTersedia = Array.from(
    new Set(
      editItems
        .map((i) => i.category)
        .filter((c): c is string => Boolean(c))
    )
  );

  return (
    <div className="min-h-dvh bg-stone-50">
      <Header title={order.title} status={order.status} />

      <main className="mx-auto max-w-lg space-y-3 px-4 pb-12 pt-5">
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <StatusTimeline status={order.status} />
        </section>

        {/* ---------- MODE UBAH PESANAN ---------- */}
        {editing ? (
          <>
            <section className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-base leading-6 text-amber-900">
              <Info className="mt-0.5 h-5 w-5 shrink-0" />
              <span>
                Ubah jumlah, hapus, atau tambah barang. Setelah dikirim, tukang
                sayur akan menghitung ulang harganya.
              </span>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900">
                  <Pencil className="h-5 w-5 text-emerald-700" />
                  Ubah Barang
                </h2>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                  {editItems.length} barang
                </span>
              </div>

              {editItems.length === 0 && (
                <p className="mt-4 rounded-xl border-2 border-dashed border-stone-200 px-4 py-6 text-center text-base text-stone-500">
                  Semua barang dihapus. Tambahkan minimal satu barang.
                </p>
              )}

              {editGroups.map((group, gi) => (
                <div key={`${group.category ?? "_"}-${gi}`} className="mt-4">
                  {hasEditCategory && (
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-800">
                      <Tag className="h-4 w-4" />
                      {group.category ?? "Lainnya"}
                    </h3>
                  )}
                  <ul className="space-y-3">
                    {group.items.map((e) => {
                      const opsiSatuan = SATUAN.includes(e.unit)
                        ? SATUAN
                        : [...SATUAN, e.unit];
                      return (
                        <li
                          key={e.key}
                          className="rounded-xl border border-stone-200 bg-stone-50 p-3"
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="text"
                              aria-label="Nama barang"
                              value={e.name}
                              onChange={(ev) =>
                                ubahEditItem(e.key, { name: ev.target.value })
                              }
                              className={`${inputCls} min-w-0 flex-1 font-semibold`}
                            />
                            <button
                              type="button"
                              onClick={() => hapusEditItem(e.key)}
                              aria-label={`Hapus ${e.name}`}
                              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-red-200 bg-white text-red-600 transition hover:bg-red-50 active:scale-95"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="any"
                              aria-label="Jumlah"
                              value={e.qty}
                              onChange={(ev) =>
                                ubahEditItem(e.key, { qty: ev.target.value })
                              }
                              className={inputCls}
                            />
                            <select
                              aria-label="Satuan"
                              value={e.unit}
                              onChange={(ev) =>
                                ubahEditItem(e.key, { unit: ev.target.value })
                              }
                              className={inputCls}
                            >
                              {opsiSatuan.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900">
                <Plus className="h-5 w-5 text-emerald-700" />
                Tambah Barang Baru
              </h2>

              <div className="mt-3 space-y-3">
                <input
                  type="text"
                  aria-label="Nama barang baru"
                  placeholder="Nama barang"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={inputCls}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    aria-label="Jumlah barang baru"
                    placeholder="Jumlah"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    className={inputCls}
                  />
                  <select
                    aria-label="Satuan barang baru"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className={inputCls}
                  >
                    {SATUAN.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <input
                    type="text"
                    aria-label="Judul kelompok barang baru"
                    placeholder="Judul kelompok (boleh kosong)"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className={inputCls}
                  />
                  {kategoriTersedia.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {kategoriTersedia.map((k) => {
                        const aktif = newCategory === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setNewCategory(aktif ? "" : k)}
                            aria-pressed={aktif}
                            className={`min-h-10 rounded-full border-2 px-3 text-sm font-semibold transition active:scale-95 ${
                              aktif
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-stone-300 bg-white text-stone-700"
                            }`}
                          >
                            {k}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Button variant="secondary" onClick={tambahEditItem}>
                  <Plus className="h-5 w-5" strokeWidth={2.5} />
                  Tambah ke Daftar
                </Button>
              </div>
            </section>

            <section className="mt-3 space-y-3">
              <Button onClick={handleSimpanEdit} loading={actionLoading}>
                <Check className="h-5 w-5" strokeWidth={2.5} />
                Kirim Perubahan
              </Button>
              <Button
                variant="secondary"
                onClick={batalEdit}
                disabled={actionLoading}
              >
                Batal
              </Button>
            </section>
          </>
        ) : (
          <>
            {/* ---------- DAFTAR BARANG ---------- */}
            <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900">
                  <ShoppingBasket className="h-5 w-5 text-emerald-700" />
                  Daftar Barang
                </h2>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                  {items.length} barang
                </span>
              </div>

              {groups.map((group, gi) => (
                <div key={`${group.category ?? "_"}-${gi}`} className="mt-4">
                  {hasCategory && (
                    <h3 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-800">
                      <Tag className="h-4 w-4" />
                      {group.category ?? "Lainnya"}
                    </h3>
                  )}
                  <ul className="divide-y divide-stone-100">
                    {group.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-base font-bold text-stone-900">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-base text-stone-500">
                            {item.qty} {item.unit}
                          </p>
                        </div>
                        <p className="shrink-0 text-right text-base font-bold text-stone-800">
                          {item.price ? (
                            formatRupiah(Number(item.price))
                          ) : (
                            <span className="text-sm font-medium text-stone-400">
                              {sudahAdaHarga
                                ? "Tidak tersedia"
                                : "Belum ada harga"}
                            </span>
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            {sudahAdaHarga && (
              <section className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-bold text-emerald-900">
                    Total Tagihan
                  </span>
                  <span className="text-2xl font-extrabold text-emerald-900">
                    {formatRupiah(total)}
                  </span>
                </div>
              </section>
            )}

            {order.status === "sent" && linkVendor && (
              <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-bold text-stone-900">
                  <Link2 className="h-5 w-5 text-emerald-700" />
                  Link untuk Tukang Sayur
                </h3>
                <p className="mt-1 text-base leading-6 text-stone-500">
                  {isRevisi
                    ? "Kirim ulang link ini agar tukang sayur menghitung ulang harga."
                    : "Kirim link ini agar tukang sayur bisa mengisi harga."}
                </p>

                <div className="mt-3 flex gap-2">
                  <input
                    readOnly
                    value={linkVendor}
                    aria-label="Link untuk tukang sayur"
                    className="h-12 min-w-0 flex-1 rounded-xl border-2 border-stone-200 bg-stone-50 px-3 text-sm text-stone-600"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-xl border-2 border-stone-300 bg-white px-4 text-base font-semibold text-stone-700 transition hover:bg-stone-50 active:scale-95"
                  >
                    {copied ? (
                      <Check
                        className="h-5 w-5 text-emerald-600"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Copy className="h-5 w-5 text-stone-500" />
                    )}
                    {copied ? "Tersalin" : "Salin"}
                  </button>
                </div>

                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 text-base font-bold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.98]"
                >
                  <MessageCircle className="h-5 w-5" strokeWidth={2.25} />
                  Kirim via WhatsApp
                </a>
              </section>
            )}

            {/* ---------- TOMBOL AKSI ---------- */}
            <section className="mt-3 space-y-3">
              {order.status === "draft" && (
                <Button onClick={handleKirim} loading={actionLoading}>
                  <Link2 className="h-5 w-5" strokeWidth={2.25} />
                  Buat Link untuk Tukang Sayur
                </Button>
              )}

              {order.status === "sent" && (
                <div className="flex items-start gap-3 rounded-2xl bg-sky-50 px-4 py-3 text-base leading-6 text-sky-900">
                  <Hourglass className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>
                    {isRevisi
                      ? "Perubahan sudah disimpan. Tunggu tukang sayur menghitung ulang harga."
                      : "Link sudah dibuat. Tunggu tukang sayur mengisi harga."}
                  </span>
                </div>
              )}

              {order.status === "priced" && (
                <>
                  <Button onClick={handleApprove} loading={actionLoading}>
                    <Check className="h-5 w-5" strokeWidth={2.5} />
                    Setujui Harga
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={mulaiEdit}
                    disabled={actionLoading}
                  >
                    <Pencil className="h-5 w-5" strokeWidth={2.25} />
                    Ubah Pesanan
                  </Button>
                </>
              )}

              {order.status === "approved" && (
                <Button onClick={handleTransfer} loading={actionLoading}>
                  <Wallet className="h-5 w-5" strokeWidth={2.25} />
                  Saya Sudah Transfer
                </Button>
              )}

              {order.status === "paid" && (
                <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-base leading-6 text-emerald-900">
                  <PackageCheck className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>
                    Transfer dikonfirmasi. Menunggu tukang sayur mengirim
                    barang.
                  </span>
                </div>
              )}

              {order.status === "completed" && (
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-green-700 px-4 py-5 text-center text-lg font-bold text-white">
                  <PartyPopper className="h-6 w-6" />
                  Pesanan selesai. Terima kasih!
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
