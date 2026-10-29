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
  Send,
  Wallet,
  PackageCheck,
} from "lucide-react";
import StatusBadge from "@/app/components/StatusBadge";
import StatusTimeline from "@/app/components/StatusTimeline";
import Button from "@/app/components/Button";
import { useUI } from "@/app/components/UIProvider";

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

export default function DetailDaftar() {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkVendor, setLinkVendor] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
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
        .eq("order_id", params.id);

      if (itemsData) setItems(itemsData);
      setLoading(false);
    }

    getDetail();
  }, [params.id]);

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

  if (loading) {
    return (
      <main className="mx-auto min-h-dvh max-w-lg px-4 pb-10 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-800"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          Kembali
        </Link>
        <div className="mt-6 space-y-3">
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
        <p className="text-sm text-stone-500">Daftar tidak ditemukan.</p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-green-700 underline"
        >
          Kembali ke beranda
        </Link>
      </main>
    );
  }

  const total = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0),
    0
  );

  const waUrl = `https://wa.me/?text=${encodeURIComponent(
    `Halo, ini daftar belanja saya: ${linkVendor}`
  )}`;

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 pb-10 pt-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 transition hover:text-stone-800"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        Kembali
      </Link>

      <header className="mt-5">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          {order.title}
        </h1>
        <div className="mt-2">
          <StatusBadge status={order.status} />
        </div>
      </header>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <StatusTimeline status={order.status} />
      </section>

      <section className="mt-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-stone-900">
            Daftar Barang
          </h2>
          <span className="text-xs text-stone-400">
            {items.length} barang
          </span>
        </div>

        <ul className="mt-3 divide-y divide-stone-100">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900">
                  {item.name}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {item.qty} {item.unit}
                </p>
              </div>
              <p className="shrink-0 text-sm text-stone-700">
                {item.price ? (
                  formatRupiah(Number(item.price))
                ) : (
                  <span className="text-stone-400">Belum ada harga</span>
                )}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {order.status !== "draft" && order.status !== "sent" && (
        <section className="mt-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-900">
              Total Tagihan
            </span>
            <span className="text-lg font-semibold text-green-900">
              {formatRupiah(total)}
            </span>
          </div>
        </section>
      )}

      {order.status === "sent" && linkVendor && (
        <section className="mt-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-stone-900">
            Link untuk Tukang Sayur
          </h3>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            Kirim link ini agar tukang sayur bisa mengisi harga.
          </p>

          <div className="mt-3 flex gap-2">
            <input
              readOnly
              value={linkVendor}
              className="h-11 min-w-0 flex-1 rounded-lg border border-stone-300 bg-stone-50 px-3 text-xs text-stone-600"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-xs font-medium text-stone-700 transition hover:bg-stone-50"
            >
              {copied ? (
                <Check
                  className="h-4 w-4 text-green-700"
                  strokeWidth={1.75}
                />
              ) : (
                <Copy
                  className="h-4 w-4 text-stone-400"
                  strokeWidth={1.75}
                />
              )}
              {copied ? "Tersalin" : "Salin"}
            </button>
          </div>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white text-xs font-medium text-stone-700 transition hover:bg-stone-50"
          >
            <MessageCircle
              className="h-4 w-4 text-stone-400"
              strokeWidth={1.75}
            />
            Kirim via WhatsApp
          </a>
        </section>
      )}

      <section className="mt-6 space-y-3">
        {order.status === "draft" && (
          <Button onClick={handleKirim} loading={actionLoading}>
            <Send className="h-4 w-4" strokeWidth={1.75} />
            Kirim ke Tukang Sayur
          </Button>
        )}

        {order.status === "sent" && (
          <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
            Link sudah dibuat. Tunggu tukang sayur mengisi harga.
          </p>
        )}

        {order.status === "priced" && (
          <Button onClick={handleApprove} loading={actionLoading}>
            <Check className="h-4 w-4" strokeWidth={1.75} />
            Setujui Harga
          </Button>
        )}

        {order.status === "approved" && (
          <Button onClick={handleTransfer} loading={actionLoading}>
            <Wallet className="h-4 w-4" strokeWidth={1.75} />
            Saya Sudah Transfer
          </Button>
        )}

        {order.status === "paid" && (
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
            <PackageCheck
              className="mt-0.5 h-4 w-4 shrink-0"
              strokeWidth={1.75}
            />
            <span>
              Transfer dikonfirmasi. Menunggu tukang sayur mengirim barang.
            </span>
          </div>
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
