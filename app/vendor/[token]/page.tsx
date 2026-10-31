"use client";

import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Store,
  Send,
  PackageCheck,
  Tag,
  ShoppingBasket,
  FileQuestion,
  Info,
  Hourglass,
  PartyPopper,
} from "lucide-react";
import StatusBadge from "@/app/components/StatusBadge";
import StatusTimeline from "@/app/components/StatusTimeline";
import Button from "@/app/components/Button";
import { useUI } from "@/app/components/UIProvider";
import { groupByCategory } from "@/app/components/itemUtils";

type Order = {
  id: string;
  title: string;
  status: string;
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
  note,
}: {
  title?: string;
  status?: string;
  loading?: boolean;
  note?: string;
}) {
  return (
    <header className="rounded-b-3xl bg-gradient-to-br from-emerald-600 to-green-800 px-5 pb-7 pt-8 shadow-md">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-emerald-100">
          <Store className="h-5 w-5" strokeWidth={2} />
          Untuk Tukang Sayur
        </div>
        {loading ? (
          <>
            <div className="mt-4 h-8 w-2/3 animate-pulse rounded-lg bg-white/25" />
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
            {note && (
              <p className="mt-3 text-base leading-7 text-emerald-50">{note}</p>
            )}
          </>
        )}
      </div>
    </header>
  );
}

export default function HalamanVendor() {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [simpanLoading, setSimpanLoading] = useState(false);
  // true jika saat halaman dibuka, sudah ada harga lama (pembeli mengubah pesanan)
  const [revisi, setRevisi] = useState(false);
  const supabase = createClient();
  const params = useParams();
  const { confirm, toast } = useUI();

  useEffect(() => {
    async function getData() {
      const { data: orderData } = await supabase
        .from("orders")
        .select()
        .eq("public_token", params.token)
        .single();

      if (orderData) {
        setOrder(orderData);
        const { data: itemsData } = await supabase
          .from("items")
          .select()
          .eq("order_id", orderData.id)
          .order("id", { ascending: true });

        if (itemsData) {
          setItems(itemsData);
          setRevisi(
            orderData.status === "sent" &&
              itemsData.some((i: Item) => Number(i.price) > 0)
          );
        }
      }

      setLoading(false);
    }

    getData();
  }, [params.token]);

  const handlePriceChange = (id: number, price: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, price: price } : item))
    );
  };

  const handleSimpanHarga = async () => {
    const hasAnyPrice = items.some((item) => Number(item.price) > 0);

    if (!hasAnyPrice) {
      toast("Isi minimal satu harga barang sebelum mengirim.", "error");
      return;
    }

    const ok = await confirm({
      title: "Kirim harga ke pembeli?",
      description:
        "Pastikan semua harga sudah benar. Jika pembeli mengubah pesanan, Anda akan diminta menghitung ulang.",
      confirmLabel: "Ya, kirim",
    });
    if (!ok) return;

    setSimpanLoading(true);

    // Semua barang disimpan. Harga kosong berarti barang tidak tersedia
    // (harga lama dihapus supaya tidak ikut terhitung).
    for (const item of items) {
      const harga = Number(item.price);
      const { error: errItem } = await supabase
        .from("items")
        .update({ price: harga > 0 ? harga : null })
        .eq("id", item.id);

      if (errItem) {
        toast("Gagal menyimpan harga: " + errItem.message, "error");
        setSimpanLoading(false);
        return;
      }
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: "priced" })
      .eq("id", order?.id);

    if (!error && order) {
      setOrder({ ...order, status: "priced" });
      setRevisi(false);
      toast("Harga berhasil dikirim ke pembeli.", "success");
    } else {
      toast("Gagal mengirim harga.", "error");
    }

    setSimpanLoading(false);
  };

  const handleSelesai = async () => {
    const ok = await confirm({
      title: "Konfirmasi barang sudah dikirim",
      description:
        "Tekan tombol ini setelah barang benar-benar sampai ke pembeli.",
      confirmLabel: "Ya, sudah dikirim",
    });
    if (!ok) return;

    setSimpanLoading(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: "completed" })
      .eq("id", order?.id);

    if (!error && order) {
      setOrder({ ...order, status: "completed" });
      toast("Pesanan ditandai selesai.", "success");
    } else {
      toast("Gagal menandai selesai.", "error");
    }
    setSimpanLoading(false);
  };

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
        <Header title="Link tidak ditemukan" />
        <main className="mx-auto max-w-lg px-4 pb-10 pt-6">
          <div className="rounded-3xl border-2 border-dashed border-stone-300 bg-white px-6 py-10 text-center">
            <FileQuestion
              className="mx-auto h-12 w-12 text-stone-300"
              strokeWidth={1.5}
            />
            <p className="mt-4 text-lg font-bold text-stone-800">
              Link tidak valid atau sudah kedaluwarsa
            </p>
            <p className="mt-1 text-base text-stone-500">
              Minta pembeli mengirim ulang link yang benar.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const total = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0),
    0
  );

  const groups = groupByCategory(items);
  const hasCategory = groups.some((g) => g.category);
  const bisaIsiHarga = order.status === "sent";

  return (
    <div className="min-h-dvh bg-stone-50">
      <Header
        title={order.title}
        status={order.status}
        note={
          bisaIsiHarga
            ? "Isi harga setiap barang. Kosongkan jika barang tidak tersedia."
            : undefined
        }
      />

      <main className="mx-auto max-w-lg space-y-3 px-4 pb-12 pt-5">
        {bisaIsiHarga && revisi && (
          <section className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-base leading-6 text-amber-900">
            <Info className="mt-0.5 h-5 w-5 shrink-0" />
            <span>
              Pembeli mengubah pesanan. Barang yang diubah atau baru harganya
              kosong, mohon isi ulang. Cek juga harga lainnya.
            </span>
          </section>
        )}

        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <StatusTimeline status={order.status} />
        </section>

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
                {group.items.map((item) => {
                  const perluDiisi =
                    bisaIsiHarga && revisi && !(Number(item.price) > 0);
                  return (
                    <li key={item.id} className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-lg font-bold text-stone-900">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-base text-stone-500">
                            {item.qty} {item.unit}
                          </p>
                        </div>
                        {perluDiisi && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-sm font-semibold text-amber-900">
                            Isi harga
                          </span>
                        )}
                      </div>

                      <div className="mt-2">
                        <label
                          htmlFor={`price-${item.id}`}
                          className="sr-only"
                        >
                          Harga {item.name}
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-stone-400">
                            Rp
                          </span>
                          <input
                            id={`price-${item.id}`}
                            type="number"
                            inputMode="numeric"
                            min="0"
                            placeholder={bisaIsiHarga ? "0" : "—"}
                            value={item.price ?? ""}
                            onChange={(e) =>
                              handlePriceChange(item.id, e.target.value)
                            }
                            disabled={!bisaIsiHarga}
                            className={`h-14 w-full rounded-xl border-2 bg-white pl-12 pr-4 text-right text-xl font-bold text-stone-900 placeholder:text-stone-300 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/15 disabled:bg-stone-100 disabled:text-stone-500 ${
                              perluDiisi
                                ? "border-amber-400"
                                : "border-stone-300"
                            }`}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-base font-bold text-emerald-900">Total</span>
            <span className="text-2xl font-extrabold text-emerald-900">
              {formatRupiah(total)}
            </span>
          </div>
        </section>

        <section className="mt-3 space-y-3">
          {order.status === "sent" && (
            <Button onClick={handleSimpanHarga} loading={simpanLoading}>
              <Send className="h-5 w-5" strokeWidth={2.25} />
              {revisi ? "Kirim Harga Baru ke Pembeli" : "Kirim Harga ke Pembeli"}
            </Button>
          )}

          {order.status === "priced" && (
            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-base leading-6 text-amber-900">
              <Hourglass className="mt-0.5 h-5 w-5 shrink-0" />
              <span>
                Harga sudah dikirim. Menunggu persetujuan pembeli. Jika pembeli
                mengubah pesanan, buka link ini lagi untuk menghitung ulang.
              </span>
            </div>
          )}

          {order.status === "approved" && (
            <div className="flex items-start gap-3 rounded-2xl bg-indigo-50 px-4 py-3 text-base leading-6 text-indigo-900">
              <Hourglass className="mt-0.5 h-5 w-5 shrink-0" />
              <span>Pembeli menyetujui harga. Menunggu transfer.</span>
            </div>
          )}

          {order.status === "paid" && (
            <Button onClick={handleSelesai} loading={simpanLoading}>
              <PackageCheck className="h-5 w-5" strokeWidth={2.25} />
              Konfirmasi Barang Sudah Dikirim
            </Button>
          )}

          {order.status === "completed" && (
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-green-700 px-4 py-5 text-center text-lg font-bold text-white">
              <PartyPopper className="h-6 w-6" />
              Pesanan selesai. Terima kasih!
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
