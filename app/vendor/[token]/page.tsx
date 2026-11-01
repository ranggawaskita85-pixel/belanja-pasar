"use client";

import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Store, Send, PackageCheck, Hourglass } from "lucide-react";
import StatusBadge from "@/app/components/StatusBadge";
import StatusTimeline from "@/app/components/StatusTimeline";
import Button from "@/app/components/Button";
import {
  AppBar,
  Panel,
  BottomBar,
  TotalLine,
  Notice,
} from "@/app/components/Shell";
import { useUI } from "@/app/components/UIProvider";
import { groupByCategory } from "@/app/components/itemUtils";
import PopupInfo from "@/app/components/PopupInfo";

/** Selisih waktu cek berkala saat menunggu keputusan pembeli. */
const JEDA_CEK_MS = 10_000;

type Order = {
  id: string;
  title: string;
  status: string;
  disimpan_at?: string | null;
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

function RowSkeleton() {
  return (
    <div className="border-b border-zinc-200 bg-white px-4 py-3">
      <div className="h-4 w-1/2 animate-pulse rounded-sm bg-zinc-200" />
      <div className="mt-2 h-3 w-1/4 animate-pulse rounded-sm bg-zinc-200" />
    </div>
  );
}

/** Minta server mengirim notifikasi ke pembeli. Gagal pun tidak mengganggu vendor. */
function kabarkanPembeli(token: string, event: "priced" | "completed") {
  fetch("/api/push/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, event }),
    keepalive: true,
  }).catch(() => {});
}

const VendorTag = (
  <div className="flex items-center gap-1.5 pr-3 text-xs font-bold uppercase tracking-wide text-emerald-100">
    <Store className="h-4 w-4" strokeWidth={2} />
    Tukang Sayur
  </div>
);

export default function HalamanVendor() {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [simpanLoading, setSimpanLoading] = useState(false);
  // true jika saat halaman dibuka, sudah ada harga lama (pembeli mengubah pesanan)
  const [revisi, setRevisi] = useState(false);
  const [terimaKasih, setTerimaKasih] = useState(false);
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
        if (orderData.status === "priced" && orderData.disimpan_at) {
          setTerimaKasih(true);
        }
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

  // Selagi menunggu keputusan pembeli, cek berkala. Pembeli bisa menekan
  // Simpan (muncul pesan terima kasih) atau Batal (link tidak berlaku lagi).
  const statusSekarang = order?.status;
  const disimpanSekarang = order?.disimpan_at;
  useEffect(() => {
    if (statusSekarang !== "priced") return;

    const cek = async () => {
      if (document.visibilityState === "hidden") return;

      const { data, error } = await supabase
        .from("orders")
        .select()
        .eq("public_token", params.token)
        .maybeSingle();

      if (error) return; // gangguan jaringan: jangan anggap link tidak valid
      if (!data) {
        setOrder(null); // pesanan dibatalkan pembeli
        return;
      }

      if (data.status !== statusSekarang) {
        // Pembeli mengubah pesanan (atau menyetujui): muat ulang isinya.
        const { data: itemsBaru } = await supabase
          .from("items")
          .select()
          .eq("order_id", data.id)
          .order("id", { ascending: true });
        if (itemsBaru) {
          setItems(itemsBaru);
          setRevisi(
            data.status === "sent" &&
              itemsBaru.some((i: Item) => Number(i.price) > 0)
          );
        }
        setOrder(data);
      } else if ((data.disimpan_at ?? null) !== (disimpanSekarang ?? null)) {
        setOrder(data);
        if (data.disimpan_at) setTerimaKasih(true);
      }
    };

    const timer = setInterval(cek, JEDA_CEK_MS);
    return () => clearInterval(timer);
  }, [statusSekarang, disimpanSekarang, params.token, supabase]);

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

    // Pembeli mungkin sudah membatalkan pesanan setelah halaman ini dibuka.
    const { data: masihAda, error: errCek } = await supabase
      .from("orders")
      .select("id")
      .eq("public_token", params.token)
      .maybeSingle();
    if (!errCek && !masihAda) {
      toast("Link ini sudah tidak berlaku.", "error");
      setOrder(null);
      return;
    }

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
      kabarkanPembeli(String(params.token), "priced");
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
      kabarkanPembeli(String(params.token), "completed");
      toast("Pesanan ditandai selesai.", "success");
    } else {
      toast("Gagal menandai selesai.", "error");
    }
    setSimpanLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-zinc-100">
        <AppBar title="Pesanan Masuk" right={VendorTag} />
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
        <AppBar title="Pesanan Masuk" right={VendorTag} />
        <main className="mx-auto max-w-lg pt-3">
          <Panel>
            <div className="px-4 py-8 text-center">
              <p className="text-lg font-bold text-zinc-900">
                Link tidak valid atau sudah kedaluwarsa
              </p>
              <p className="mt-1 text-base text-zinc-500">
                Minta pembeli mengirim ulang link yang benar.
              </p>
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

  const groups = groupByCategory(items);
  const hasCategory = groups.some((g) => g.category);
  const bisaIsiHarga = order.status === "sent";

  return (
    <div className="min-h-dvh bg-zinc-100 pb-40">
      <AppBar title="Pesanan Masuk" right={VendorTag} />

      <main className="mx-auto max-w-lg space-y-3">
        <div className="border-b border-zinc-300 bg-white px-4 py-4">
          <h1 className="break-words text-xl font-bold text-zinc-900">
            {order.title}
          </h1>
          <div className="mt-2">
            <StatusBadge status={order.status} />
          </div>
          {bisaIsiHarga && (
            <p className="mt-3 text-base leading-6 text-zinc-600">
              Isi harga setiap barang. Kosongkan jika barang tidak tersedia.
            </p>
          )}
        </div>

        {bisaIsiHarga && revisi && (
          <Notice tone="warn">
            Pembeli mengubah pesanan. Barang yang diubah atau baru harganya
            kosong, mohon isi ulang. Cek juga harga lainnya.
          </Notice>
        )}

        <Panel>
          <div className="px-4 py-3">
            <StatusTimeline status={order.status} />
          </div>
        </Panel>

        <Panel title="Daftar Barang" aside={`${items.length} barang`}>
          {groups.map((group, gi) => (
            <div key={`${group.category ?? "_"}-${gi}`}>
              {hasCategory && (
                <div className="bg-zinc-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-700">
                  {group.category ?? "Lainnya"}
                </div>
              )}
              <ul className="divide-y divide-zinc-200">
                {group.items.map((item) => {
                  const perluDiisi =
                    bisaIsiHarga && revisi && !(Number(item.price) > 0);
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-base font-semibold text-zinc-900">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-sm tabular-nums text-zinc-500">
                          {item.qty} {item.unit}
                        </p>
                        {perluDiisi && (
                          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                            Perlu diisi
                          </p>
                        )}
                      </div>

                      <div className="w-40 shrink-0">
                        <label
                          htmlFor={`price-${item.id}`}
                          className="sr-only"
                        >
                          Harga {item.name}
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">
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
                            className={`h-12 w-full rounded-md border pl-9 pr-3 text-right text-lg font-bold tabular-nums text-zinc-900 placeholder:text-zinc-300 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/25 disabled:bg-zinc-100 disabled:text-zinc-500 ${
                              perluDiisi
                                ? "border-amber-500 bg-amber-50"
                                : "border-zinc-400 bg-white"
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
        </Panel>

        {order.status === "priced" && (
          <Notice tone="warn">
            Harga sudah dikirim. Menunggu persetujuan pembeli. Jika pembeli
            mengubah pesanan, buka link ini lagi untuk menghitung ulang.
          </Notice>
        )}

        {order.status === "approved" && (
          <Notice tone="info">
            Pembeli menyetujui harga. Menunggu transfer.
          </Notice>
        )}

        {order.status === "completed" && (
          <Notice tone="ok">Pesanan selesai. Terima kasih!</Notice>
        )}
      </main>

      {terimaKasih && order.status === "priced" && (
        <PopupInfo
          pesan="Terima kasih, nanti akan diinformasikan kembali."
          onTutup={() => setTerimaKasih(false)}
        />
      )}

      <BottomBar>
        <TotalLine label="Total" value={formatRupiah(total)} />

        {order.status === "sent" && (
          <Button onClick={handleSimpanHarga} loading={simpanLoading}>
            <Send className="h-5 w-5" strokeWidth={2.25} />
            {revisi ? "Kirim Harga Baru ke Pembeli" : "Kirim Harga ke Pembeli"}
          </Button>
        )}

        {order.status === "paid" && (
          <Button onClick={handleSelesai} loading={simpanLoading}>
            <PackageCheck className="h-5 w-5" strokeWidth={2.25} />
            Konfirmasi Barang Sudah Dikirim
          </Button>
        )}

        {(order.status === "priced" || order.status === "approved") && (
          <div className="flex items-center gap-2 text-base text-zinc-600">
            <Hourglass className="h-5 w-5" />
            {order.status === "priced"
              ? "Menunggu persetujuan pembeli"
              : "Menunggu transfer pembeli"}
          </div>
        )}
      </BottomBar>
    </div>
  );
}
