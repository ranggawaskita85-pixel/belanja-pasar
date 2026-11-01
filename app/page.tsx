"use client";

import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ChevronRight, RefreshCw, Trash2 } from "lucide-react";
import StatusBadge from "@/app/components/StatusBadge";
import PushToggle from "@/app/components/PushToggle";
import { AppBar, BottomBar, IconButton } from "@/app/components/Shell";
import { useUI } from "@/app/components/UIProvider";
import { hapusOrders } from "@/lib/hapus-order";

type Order = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

type Filter = "semua" | "berjalan" | "selesai";

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatHariIni() {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function RowSkeleton() {
  return (
    <div className="border-b border-zinc-200 bg-white px-4 py-3">
      <div className="flex justify-between gap-3">
        <div className="h-4 w-1/2 animate-pulse rounded-sm bg-zinc-200" />
        <div className="h-4 w-20 animate-pulse rounded-sm bg-zinc-200" />
      </div>
      <div className="mt-2.5 h-6 w-36 animate-pulse rounded-sm bg-zinc-200" />
    </div>
  );
}

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("semua");
  const [hariIni, setHariIni] = useState("");
  const [hapusId, setHapusId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const supabase = createClient();
  const { confirm, toast } = useUI();

  async function getOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select()
      .order("created_at", { ascending: false });

    if (data) setOrders(data);
    if (error) console.log(error);
    setLoading(false);
  }

  useEffect(() => {
    getOrders();
    // Tanggal diisi setelah halaman tampil agar tidak beda dengan versi server.
    setHariIni(formatHariIni());
  }, []);

  const handleMuatUlang = async () => {
    setRefreshing(true);
    await getOrders();
    setHariIni(formatHariIni());
    setRefreshing(false);
  };

  const hapusSatu = async (order: Order) => {
    const ok = await confirm({
      title: "Hapus daftar ini?",
      description: `"${order.title}" beserta isinya akan dihapus permanen dan tidak bisa dikembalikan.`,
      confirmLabel: "Ya, hapus",
      destructive: true,
    });
    if (!ok) return;

    setHapusId(order.id);
    const hasil = await hapusOrders(supabase, [order.id]);
    if (hasil.terhapus.length > 0) {
      setOrders((prev) => prev.filter((o) => !hasil.terhapus.includes(o.id)));
      toast("Daftar dihapus.", "success");
    } else {
      toast("Gagal menghapus: " + (hasil.pesan ?? "tidak diketahui"), "error");
    }
    setHapusId(null);
  };

  const resetRiwayat = async () => {
    if (orders.length === 0) return;
    const ok = await confirm({
      title: "Reset semua riwayat?",
      description: `${orders.length} daftar belanja beserta isinya akan dihapus permanen, termasuk yang masih berjalan. Tindakan ini tidak bisa dibatalkan.`,
      confirmLabel: "Ya, hapus semua",
      destructive: true,
    });
    if (!ok) return;

    setResetting(true);
    const hasil = await hapusOrders(
      supabase,
      orders.map((o) => o.id)
    );
    if (hasil.terhapus.length > 0) {
      setOrders((prev) => prev.filter((o) => !hasil.terhapus.includes(o.id)));
    }
    if (hasil.ok) {
      toast("Semua riwayat dihapus.", "success");
    } else {
      toast(
        `Tidak semua terhapus (${hasil.terhapus.length} dari ${orders.length}): ${
          hasil.pesan ?? "tidak diketahui"
        }`,
        "error"
      );
    }
    setResetting(false);
  };

  const jumlahSelesai = orders.filter((o) => o.status === "completed").length;
  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "semua", label: "Semua", count: orders.length },
    { key: "berjalan", label: "Berjalan", count: orders.length - jumlahSelesai },
    { key: "selesai", label: "Selesai", count: jumlahSelesai },
  ];

  const tampil = orders.filter((o) =>
    filter === "semua"
      ? true
      : filter === "selesai"
        ? o.status === "completed"
        : o.status !== "completed"
  );

  return (
    <div className="min-h-dvh bg-zinc-100 pb-24">
      <AppBar
        title="Belanja Pasar"
        meta={hariIni}
        right={
          <>
            <IconButton
              label="Muat ulang"
              onClick={handleMuatUlang}
              disabled={refreshing || loading}
            >
              <RefreshCw
                className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
                strokeWidth={2.25}
              />
            </IconButton>
            <PushToggle />
          </>
        }
      />

      <main className="mx-auto max-w-lg">
        {/* Ringkasan sekaligus penyaring */}
        <div
          role="tablist"
          aria-label="Saring daftar"
          className="grid grid-cols-3 border-b border-zinc-300 bg-white"
        >
          {tabs.map((t) => {
            const aktif = filter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={aktif}
                onClick={() => setFilter(t.key)}
                className={`flex flex-col items-center border-b-4 py-3 transition ${
                  aktif
                    ? "border-emerald-700 text-zinc-900"
                    : "border-transparent text-zinc-500 hover:bg-zinc-50"
                }`}
              >
                <span className="text-2xl font-bold tabular-nums">
                  {loading ? "–" : t.count}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-b border-zinc-300 bg-zinc-50 pl-4 pr-2">
          <span className="py-2 text-xs font-bold uppercase tracking-wide text-zinc-600">
            Daftar Belanja
          </span>
          <button
            type="button"
            onClick={resetRiwayat}
            disabled={loading || resetting || orders.length === 0}
            className="inline-flex h-10 items-center gap-1.5 rounded-md px-2 text-xs font-bold uppercase tracking-wide text-red-700 hover:bg-red-50 active:bg-red-100 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2.25} />
            {resetting ? "Menghapus..." : "Reset Riwayat"}
          </button>
        </div>

        {loading ? (
          <div>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </div>
        ) : orders.length === 0 ? (
          <div className="border-b border-zinc-300 bg-white px-4 py-10 text-center">
            <p className="text-base font-semibold text-zinc-800">
              Belum ada daftar belanja.
            </p>
            <p className="mt-1 text-base text-zinc-500">
              Ketuk &quot;Daftar Baru&quot; di bawah untuk mulai.
            </p>
          </div>
        ) : tampil.length === 0 ? (
          <div className="border-b border-zinc-300 bg-white px-4 py-10 text-center text-base text-zinc-500">
            Tidak ada daftar di kelompok ini.
          </div>
        ) : (
          <ul>
            {tampil.map((order) => (
              <li
                key={order.id}
                className="flex items-stretch border-b border-zinc-200 bg-white"
              >
                <Link
                  href={`/daftar/${order.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2 active:bg-zinc-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-base font-semibold text-zinc-900">
                        {order.title}
                      </p>
                      <span className="shrink-0 text-sm tabular-nums text-zinc-500">
                        {formatTanggal(order.created_at)}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-zinc-400"
                    strokeWidth={2}
                  />
                </Link>
                <button
                  type="button"
                  onClick={() => hapusSatu(order)}
                  disabled={hapusId === order.id || resetting}
                  aria-label={`Hapus ${order.title}`}
                  className="flex w-12 shrink-0 items-center justify-center border-l border-zinc-100 text-zinc-400 hover:bg-red-50 hover:text-red-700 active:bg-red-100 disabled:opacity-40"
                >
                  <Trash2 className="h-5 w-5" strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <BottomBar>
        <Link
          href="/buat-daftar"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800 active:bg-emerald-900"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          Daftar Baru
        </Link>
      </BottomBar>
    </div>
  );
}
