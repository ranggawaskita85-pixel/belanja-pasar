"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { IconButton } from "@/app/components/Shell";
import { useUI } from "@/app/components/UIProvider";

type PushState = "loading" | "unsupported" | "denied" | "off" | "on";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export default function PushToggle() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const { toast, confirm } = useUI();

  useEffect(() => {
    async function init() {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setState("unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        if (Notification.permission === "denied") {
          setState("denied");
          return;
        }
        const sub = await reg.pushManager.getSubscription();
        setState(sub ? "on" : "off");
      } catch {
        setState("unsupported");
      }
    }
    init();
  }, []);

  const aktifkan = async () => {
    if (!VAPID_PUBLIC_KEY) {
      toast(
        "Kunci notifikasi belum dipasang di server. Lihat panduan pemasangan.",
        "error"
      );
      return;
    }

    setBusy(true);
    try {
      const izin = await Notification.requestPermission();
      if (izin !== "granted") {
        setState(izin === "denied" ? "denied" : "off");
        toast("Izin notifikasi tidak diberikan.", "error");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        throw new Error(info?.error ?? "Gagal menyimpan langganan.");
      }

      setState("on");
      toast(
        "Notifikasi aktif. Anda akan diberi tahu saat tukang sayur bertindak.",
        "success"
      );
    } catch (e) {
      const pesan = e instanceof Error ? e.message : "Terjadi kesalahan.";
      toast("Gagal mengaktifkan notifikasi: " + pesan, "error");
    } finally {
      setBusy(false);
    }
  };

  const matikan = async () => {
    const ok = await confirm({
      title: "Matikan notifikasi?",
      description:
        "Anda tidak akan diberi tahu lagi saat tukang sayur mengirim harga atau menyelesaikan pesanan.",
      confirmLabel: "Ya, matikan",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("off");
      toast("Notifikasi dimatikan.", "info");
    } catch {
      toast("Gagal mematikan notifikasi.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleClick = () => {
    if (state === "on") return matikan();
    if (state === "off") return aktifkan();
    if (state === "denied") {
      toast(
        "Notifikasi diblokir. Buka pengaturan situs di browser (ikon gembok), lalu izinkan Notifikasi.",
        "error"
      );
      return;
    }
    if (state === "unsupported") {
      const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      toast(
        iOS
          ? "Di iPhone: ketuk Bagikan, pilih Tambahkan ke Layar Utama, lalu buka aplikasi dari ikon itu dan aktifkan lagi."
          : "Browser ini belum mendukung notifikasi.",
        "error"
      );
    }
  };

  const label =
    state === "on"
      ? "Notifikasi aktif (ketuk untuk mematikan)"
      : "Aktifkan notifikasi";

  return (
    <IconButton
      label={label}
      onClick={handleClick}
      disabled={busy || state === "loading"}
    >
      {state === "on" ? (
        <Bell className="h-5 w-5" strokeWidth={2.25} />
      ) : (
        <BellOff className="h-5 w-5 opacity-80" strokeWidth={2} />
      )}
      {state === "on" && (
        <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-emerald-800 bg-lime-300" />
      )}
      {state === "denied" && (
        <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-emerald-800 bg-red-400" />
      )}
    </IconButton>
  );
}
