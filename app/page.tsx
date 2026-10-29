"use client";

import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ChevronRight, ShoppingBasket } from "lucide-react";
import StatusBadge from "@/app/components/StatusBadge";

type Order = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="h-4 w-1/2 animate-pulse rounded bg-stone-100" />
      <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-stone-100" />
    </div>
  );
}

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getOrders() {
      const { data, error } = await supabase
        .from("orders")
        .select()
        .order("created_at", { ascending: false });

      if (data) setOrders(data);
      if (error) console.log(error);
      setLoading(false);
    }

    getOrders();
  }, []);

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 pb-10 pt-8">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-green-700">
          Belanja Pasar
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
          Daftar Belanja Saya
        </h1>
        <p className="mt-1 text-sm leading-6 text-stone-500">
          Buat daftar, kirim ke tukang sayur, dan pantau harganya.
        </p>
      </header>

      <Link
        href="/buat-daftar"
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-800 px-4 text-sm font-medium text-white transition hover:bg-green-900 active:scale-[0.99]"
      >
        <Plus className="h-5 w-5" strokeWidth={1.75} />
        Buat Daftar Baru
      </Link>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-stone-900">
            Daftar Terbaru
          </h2>
          <span className="text-xs text-stone-400">
            {loading ? "…" : `${orders.length} daftar`}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
            <ShoppingBasket
              className="mx-auto h-8 w-8 text-stone-300"
              strokeWidth={1.5}
            />
            <p className="mt-3 text-sm text-stone-500">
              Belum ada daftar belanja.
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Mulai dengan menekan tombol di atas.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/daftar/${order.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-stone-300 active:scale-[0.99]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900">
                      {order.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={order.status} />
                      <span className="text-[11px] text-stone-400">
                        {formatTanggal(order.created_at)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-stone-300"
                    strokeWidth={1.75}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
