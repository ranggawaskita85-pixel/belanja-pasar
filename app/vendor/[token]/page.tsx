"use client";

import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Store, Send, PackageCheck } from "lucide-react";
import StatusBadge from "@/app/components/StatusBadge";
import StatusTimeline from "@/app/components/StatusTimeline";
import Button from "@/app/components/Button";
import { useUI } from "@/app/components/UIProvider";

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
};

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="h-4 w-1/3 animate-pulse rounded bg-stone-100" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-stone-100" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-stone-100" />
      </div>
    </div>
  );
}

export default function HalamanVendor() {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [simpanLoading, setSimpanLoading] = useState(false);
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
          .eq("order_id", orderData.id);

        if (itemsData) setItems(itemsData);
      }

      setLoading(false);
    }

    getData();
  }, [params.token]);

  const handlePriceChange = (id: number, price: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, price: price } : item
      )
    );
  };

  const handleSimpanHarga = async () => {
    const hasAnyPrice = items.some(
      (item) => Number(item.price) > 0
    );

    if (!hasAnyPrice) {
      toast("Isi minimal satu harga barang sebelum mengirim.", "error");
      return;
    }

    const ok = await confirm({
      title: "Kirim harga ke pembeli?",
      description:
        "Pastikan semua harga sudah benar. Harga tidak bisa diubah setelah dikirim.",
      confirmLabel: "Ya, kirim",
    });
    if (!ok) return;

    setSimpanLoading(true);

    for (const item of items) {
      if (item.price) {
        await supabase
          .from("items")
          .update({ price: Number(item.price) })
          .eq("id", item.id);
      }
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: "priced" })
      .eq("id", order?.id);

    if (!error && order) {
      setOrder({ ...order, status: "priced" });
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
      <main className="mx-auto min-h-dvh max-w-lg px-4 pb-10 pt-8">
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto min-h-dvh max-w-lg px-4 pb-10 pt-8">
        <p className="text-sm text-stone-500">
          Link tidak valid atau sudah kedaluwarsa.
        </p>
      </main>
    );
  }

  const total = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0),
    0
  );

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 pb-10 pt-8">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-green-700">
          <Store className="h-4 w-4" strokeWidth={1.75} />
          Untuk Tukang Sayur
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
          {order.title}
        </h1>
        <div className="mt-2">
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          Isi harga setiap barang. Kosongkan jika barang tidak tersedia.
        </p>
      </header>

      <section className="mb-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <StatusTimeline status={order.status} />
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <ul className="divide-y divide-stone-100">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900">
                  {item.name}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {item.qty} {item.unit}
                </p>
              </div>

              <div className="w-32 shrink-0">
                <label htmlFor={`price-${item.id}`} className="sr-only">
                  Harga {item.name}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                    Rp
                  </span>
                  <input
                    id={`price-${item.id}`}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="0"
                    value={item.price ?? ""}
                    onChange={(e) =>
                      handlePriceChange(item.id, e.target.value)
                    }
                    disabled={order.status !== "sent"}
                    className="h-11 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-right text-base font-medium text-stone-900 placeholder:text-stone-300 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/15 disabled:bg-stone-50 disabled:text-stone-400"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-stone-900">Total</span>
          <span className="text-lg font-semibold text-stone-900">
            {formatRupiah(total)}
          </span>
        </div>
      </section>

      <section className="mt-6 space-y-3">
        {order.status === "sent" && (
          <Button onClick={handleSimpanHarga} loading={simpanLoading}>
            <Send className="h-4 w-4" strokeWidth={1.75} />
            Kirim Harga ke Pembeli
          </Button>
        )}

        {order.status === "priced" && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            Harga sudah dikirim. Menunggu persetujuan pembeli.
          </p>
        )}

        {order.status === "approved" && (
          <p className="rounded-xl bg-indigo-50 px-4 py-3 text-sm leading-6 text-indigo-800">
            Pembeli menyetujui harga. Menunggu transfer.
          </p>
        )}

        {order.status === "paid" && (
          <Button onClick={handleSelesai} loading={simpanLoading}>
            <PackageCheck className="h-4 w-4" strokeWidth={1.75} />
            Konfirmasi Barang Sudah Dikirim
          </Button>
        )}

        {order.status === "completed" && (
          <div className="rounded-xl bg-green-800 px-4 py-4 text-center text-sm font-medium text-white">
            Pesanan selesai. Terima kasih!
          </div>
        )}
      </section>
    </main>
  );
}
