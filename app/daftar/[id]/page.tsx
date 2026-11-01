"use client";

export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Copy,
  Check,
  MessageCircle,
  Link2,
  Wallet,
  Pencil,
  Plus,
  Trash2,
  Hourglass,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import StatusBadge from "@/app/components/StatusBadge";
import StatusTimeline from "@/app/components/StatusTimeline";
import Button from "@/app/components/Button";
import {
  AppBar,
  Panel,
  BottomBar,
  TotalLine,
  Notice,
  IconButton,
  inputCls,
} from "@/app/components/Shell";
import { useUI } from "@/app/components/UIProvider";
import { SATUAN, groupByCategory } from "@/app/components/itemUtils";
import { hapusOrders } from "@/lib/hapus-order";
import { useBeforeUnload } from "@/app/components/useBeforeUnload";

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

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function RowSkeleton() {
  return (
    <div className="border-b border-zinc-200 bg-white px-4 py-3">
      <div className="h-4 w-1/2 animate-pulse rounded-sm bg-zinc-200" />
      <div className="mt-2 h-3 w-1/4 animate-pulse rounded-sm bg-zinc-200" />
    </div>
  );
}

function OrderTitle({ title, status }: { title: string; status?: string }) {
  return (
    <div className="border-b border-zinc-300 bg-white px-4 py-4">
      <h1 className="break-words text-xl font-bold text-zinc-900">{title}</h1>
      {status && (
        <div className="mt-2">
          <StatusBadge status={status} />
        </div>
      )}
    </div>
  );
}

export default function DetailDaftar() {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkVendor, setLinkVendor] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
  const router = useRouter();
  const { confirm, toast } = useUI();
  useBeforeUnload(editing);

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

  useEffect(() => {
    getDetail();
  }, [params.id]);

  const handleMuatUlang = async () => {
    setRefreshing(true);
    await getDetail();
    setRefreshing(false);
  };

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

  const handleBatalkanPesanan = async () => {
    const ok = await confirm({
      title: "Batalkan pesanan ini?",
      description:
        "Daftar beserta isinya akan dihapus permanen. Link yang sudah dikirim ke tukang sayur tidak berlaku lagi.",
      confirmLabel: "Ya, batalkan",
      cancelLabel: "Tidak",
      destructive: true,
    });
    if (!ok || !order) return;

    setActionLoading(true);
    const hasil = await hapusOrders(supabase, [order.id]);
    if (hasil.terhapus.length > 0) {
      toast("Pesanan dibatalkan.", "success");
      router.push("/");
    } else {
      toast("Gagal membatalkan: " + (hasil.pesan ?? "tidak diketahui"), "error");
      setActionLoading(false);
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
      if (error)
        return gagal("Gagal menyimpan perubahan: " + error.message + ".");
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
    if (errOrder)
      return gagal("Gagal mengirim perubahan: " + errOrder.message + ".");

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
      <div className="min-h-dvh bg-zinc-100">
        <AppBar title="Detail Daftar" backHref="/" />
        <main className="mx-auto max-w-lg space-y-3">
          <div className="border-b border-zinc-300 bg-white px-4 py-4">
            <div className="h-6 w-2/3 animate-pulse rounded-sm bg-zinc-200" />
            <div className="mt-3 h-6 w-36 animate-pulse rounded-sm bg-zinc-200" />
          </div>
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-dvh bg-zinc-100">
        <AppBar title="Detail Daftar" backHref="/" />
        <main className="mx-auto max-w-lg pt-3">
          <Panel>
            <div className="px-4 py-8 text-center">
              <p className="text-lg font-bold text-zinc-900">
                Daftar tidak ditemukan
              </p>
              <p className="mt-1 text-base text-zinc-500">
                Mungkin sudah dihapus atau alamatnya keliru.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex h-12 items-center justify-center rounded-md bg-emerald-700 px-6 text-base font-semibold text-white hover:bg-emerald-800"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </Panel>
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
    revised ||
    (order.status === "sent" && items.some((i) => Number(i.price) > 0));

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
      editItems.map((i) => i.category).filter((c): c is string => Boolean(c))
    )
  );

  return (
    <div className="min-h-dvh bg-zinc-100 pb-44">
      <AppBar
        title="Detail Daftar"
        backHref="/"
        homeDirty={editing}
        right={
          <IconButton
            label="Muat ulang"
            onClick={handleMuatUlang}
            disabled={refreshing || editing || actionLoading}
          >
            <RefreshCw
              className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
              strokeWidth={2.25}
            />
          </IconButton>
        }
      />

      <main className="mx-auto max-w-lg space-y-3">
        <OrderTitle title={order.title} status={order.status} />

        <Panel>
          <div className="px-4 py-3">
            <StatusTimeline status={order.status} />
          </div>
        </Panel>

        {editing ? (
          /* ---------- MODE UBAH PESANAN ---------- */
          <>
            <Notice tone="warn">
              Ubah jumlah, hapus, atau tambah barang. Setelah dikirim, tukang
              sayur akan menghitung ulang harganya.
            </Notice>

            <Panel title="Ubah Barang" aside={`${editItems.length} barang`}>
              {editItems.length === 0 && (
                <p className="px-4 py-6 text-center text-base text-zinc-500">
                  Semua barang dihapus. Tambahkan minimal satu barang.
                </p>
              )}

              {editGroups.map((group, gi) => (
                <div key={`${group.category ?? "_"}-${gi}`}>
                  {hasEditCategory && (
                    <div className="bg-zinc-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-700">
                      {group.category ?? "Lainnya"}
                    </div>
                  )}
                  <ul className="divide-y divide-zinc-200">
                    {group.items.map((e) => {
                      const opsiSatuan = SATUAN.includes(e.unit)
                        ? SATUAN
                        : [...SATUAN, e.unit];
                      return (
                        <li key={e.key} className="space-y-2 px-4 py-3">
                          <div className="flex items-center gap-2">
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
                              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-zinc-300 text-zinc-500 hover:bg-red-50 hover:text-red-700 active:bg-red-100"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
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
                              className={`${inputCls} tabular-nums`}
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
            </Panel>

            <Panel title="Tambah Barang Baru">
              <div className="space-y-3 px-4 py-3">
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
                    className={`${inputCls} tabular-nums`}
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
                            className={`h-10 rounded-md border px-3 text-sm font-semibold transition ${
                              aktif
                                ? "border-emerald-700 bg-emerald-700 text-white"
                                : "border-zinc-400 bg-white text-zinc-700"
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
            </Panel>
          </>
        ) : (
          /* ---------- TAMPILAN BIASA ---------- */
          <>
            <Panel title="Daftar Barang" aside={`${items.length} barang`}>
              {groups.map((group, gi) => {
                const subtotal = group.items.reduce(
                  (s, i) => s + (Number(i.price) || 0),
                  0
                );
                return (
                  <div key={`${group.category ?? "_"}-${gi}`}>
                    {hasCategory && (
                      <div className="flex items-center justify-between gap-3 bg-zinc-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-700">
                        <span>{group.category ?? "Lainnya"}</span>
                        {sudahAdaHarga && (
                          <span className="tabular-nums">
                            {formatRupiah(subtotal)}
                          </span>
                        )}
                      </div>
                    )}
                    <ul className="divide-y divide-zinc-200">
                      {group.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-4 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="break-words text-base font-semibold text-zinc-900">
                              {item.name}
                            </p>
                            <p className="mt-0.5 text-sm tabular-nums text-zinc-500">
                              {item.qty} {item.unit}
                            </p>
                          </div>
                          <p className="shrink-0 text-right text-base font-semibold tabular-nums text-zinc-900">
                            {item.price ? (
                              formatRupiah(Number(item.price))
                            ) : (
                              <span className="text-sm font-medium text-zinc-400">
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
                );
              })}
            </Panel>

            {order.status === "sent" && linkVendor && (
              <Panel title="Link untuk Tukang Sayur">
                <div className="space-y-3 px-4 py-3">
                  <p className="text-base leading-6 text-zinc-600">
                    {isRevisi
                      ? "Kirim ulang link ini agar tukang sayur menghitung ulang harga."
                      : "Kirim link ini agar tukang sayur bisa mengisi harga."}
                  </p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={linkVendor}
                      aria-label="Link untuk tukang sayur"
                      className="h-12 min-w-0 flex-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-md border border-zinc-400 bg-white px-4 text-base font-semibold text-zinc-800 hover:bg-zinc-50 active:bg-zinc-100"
                    >
                      {copied ? (
                        <Check
                          className="h-5 w-5 text-emerald-700"
                          strokeWidth={2.5}
                        />
                      ) : (
                        <Copy className="h-5 w-5 text-zinc-500" />
                      )}
                      {copied ? "Tersalin" : "Salin"}
                    </button>
                  </div>
                </div>
              </Panel>
            )}

            {order.status === "sent" && (
              <Notice tone="info">
                {isRevisi
                  ? "Perubahan sudah disimpan. Tunggu tukang sayur menghitung ulang harga."
                  : "Link sudah dibuat. Tunggu tukang sayur mengisi harga."}
              </Notice>
            )}

            {order.status === "paid" && (
              <Notice tone="ok">
                Transfer dikonfirmasi. Menunggu tukang sayur mengirim barang.
              </Notice>
            )}

            {order.status === "completed" && (
              <Notice tone="ok">Pesanan selesai. Terima kasih!</Notice>
            )}
          </>
        )}
      </main>

      {/* ---------- BILAH AKSI BAWAH ---------- */}
      <BottomBar>
        {editing ? (
          <>
            <TotalLine label="Jumlah barang" value={String(editItems.length)} />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                block={false}
                className="px-6"
                onClick={batalEdit}
                disabled={actionLoading}
              >
                Batal
              </Button>
              <Button
                block={false}
                className="flex-1"
                onClick={handleSimpanEdit}
                loading={actionLoading}
              >
                <Check className="h-5 w-5" strokeWidth={2.5} />
                Kirim Perubahan
              </Button>
            </div>
          </>
        ) : (
          <>
            {sudahAdaHarga ? (
              <TotalLine label="Total tagihan" value={formatRupiah(total)} />
            ) : (
              <TotalLine label="Jumlah barang" value={String(items.length)} />
            )}

            {order.status === "draft" && (
              <Button onClick={handleKirim} loading={actionLoading}>
                <Link2 className="h-5 w-5" strokeWidth={2.25} />
                Buat Link untuk Tukang Sayur
              </Button>
            )}

            {order.status === "sent" && linkVendor && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-green-700 text-base font-semibold text-white hover:bg-green-800 active:bg-green-900"
              >
                <MessageCircle className="h-5 w-5" strokeWidth={2.25} />
                Kirim via WhatsApp
              </a>
            )}

            {order.status === "sent" && !linkVendor && (
              <div className="flex items-center gap-2 text-base text-zinc-600">
                <Hourglass className="h-5 w-5" />
                Menunggu tukang sayur
              </div>
            )}

            {(order.status === "draft" || order.status === "sent") && (
              <button
                type="button"
                onClick={handleBatalkanPesanan}
                disabled={actionLoading}
                className="flex h-10 w-full items-center justify-center rounded-md text-sm font-bold uppercase tracking-wide text-red-700 hover:bg-red-50 active:bg-red-100 disabled:opacity-40"
              >
                Batalkan Pesanan
              </button>
            )}

            {order.status === "priced" && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  block={false}
                  className="px-4"
                  onClick={mulaiEdit}
                  disabled={actionLoading}
                >
                  <Pencil className="h-5 w-5" strokeWidth={2.25} />
                  Ubah Pesanan
                </Button>
                <Button
                  block={false}
                  className="flex-1"
                  onClick={handleApprove}
                  loading={actionLoading}
                >
                  <Check className="h-5 w-5" strokeWidth={2.5} />
                  Setujui Harga
                </Button>
              </div>
            )}

            {order.status === "approved" && (
              <Button onClick={handleTransfer} loading={actionLoading}>
                <Wallet className="h-5 w-5" strokeWidth={2.25} />
                Saya Sudah Transfer
              </Button>
            )}

            {order.status === "paid" && (
              <div className="flex items-center gap-2 text-base text-zinc-600">
                <PackageCheck className="h-5 w-5" />
                Menunggu barang dikirim
              </div>
            )}
          </>
        )}
      </BottomBar>
    </div>
  );
}
