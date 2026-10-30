"use client";

import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  ChevronRight,
  ShoppingBasket,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
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
    <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-stone-100" />
      <div className="min-w-0 flex-1">
        <div className="h-4 w-2/3 animate-pulse rounded bg-stone-100" />
        <div className="mt-3 h-6 w-28 animate-pulse rounded-full bg-stone-100" />
        <div className="mt-3 h-3 w-24 animate-pulse rounded bg-stone-100" />
      </div>
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
    <div className="min-h-dvh bg-stone-50">
      {/* Header hijau */}
      <header className="rounded-b-3xl bg-gradient-to-br from-emerald-600 to-green-800 px-5 pb-8 pt-8 shadow-md">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
              <ShoppingBasket className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
            <p className="text-lg font-bold tracking-tight text-white">
              Belanja Pasar
            </p>
          </div>

          <h1 className="mt-6 text-3xl font-extrabold leading-tight tracking-tight text-white">
            Daftar Belanja Saya
          </h1>
          <p className="mt-2 text-base leading-7 text-emerald-50">
            Buat daftar, kirim ke tukang sayur, dan pantau harganya.
          </p>

          <Link
            href="/buat-daftar"
            className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 text-lg font-bold text-stone-900 shadow-lg shadow-green-900/20 transition hover:bg-amber-300 active:scale-[0.98]"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
            Buat Daftar Baru
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-12 pt-7">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900">
              <ClipboardList className="h-5 w-5 text-emerald-700" />
              Daftar Terbaru
            </h2>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
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
            <div className="rounded-3xl border-2 border-dashed border-emerald-200 bg-white px-6 py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <ShoppingBasket
                  className="h-8 w-8 text-emerald-600"
                  strokeWidth={1.75}
                />
              </div>
              <p className="mt-4 text-lg font-bold text-stone-800">
                Belum ada daftar belanja
              </p>
              <p className="mt-1 text-base text-stone-500">
                Yuk buat yang pertama! Tekan tombol kuning di atas.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/daftar/${order.id}`}
                    className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md active:scale-[0.98]"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                      <ShoppingBasket
                        className="h-6 w-6 text-emerald-700"
                        strokeWidth={1.75}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold text-stone-900">
                        {order.title}
                      </p>
                      <div className="mt-2">
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-500">
                        <CalendarDays className="h-4 w-4" />
                        {formatTanggal(order.created_at)}
                      </p>
                    </div>

                    <ChevronRight
                      className="h-6 w-6 shrink-0 text-stone-300"
                      strokeWidth={2}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
