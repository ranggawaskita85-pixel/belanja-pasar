import { NextResponse } from "next/server";
import webpush from "web-push";
import { getAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type Aksi = "priced" | "completed";

// Status yang membuktikan aksi vendor memang sudah terjadi.
const STATUS_VALID: Record<Aksi, string[]> = {
  priced: ["priced", "approved", "paid", "completed"],
  completed: ["completed"],
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = body?.token;
  const aksi = body?.event as Aksi | undefined;

  if (
    typeof token !== "string" ||
    token.length < 8 ||
    (aksi !== "priced" && aksi !== "completed")
  ) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const admin = getAdmin();
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!admin || !publicKey || !privateKey) {
    return NextResponse.json(
      { error: "Server belum dikonfigurasi untuk notifikasi." },
      { status: 500 }
    );
  }

  // Hanya pemegang link vendor yang sah yang boleh memicu notifikasi.
  const { data: order } = await admin
    .from("orders")
    .select("id, title, status")
    .eq("public_token", token)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }
  if (!STATUS_VALID[aksi].includes(order.status)) {
    return NextResponse.json(
      { error: "Status pesanan tidak sesuai." },
      { status: 409 }
    );
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
    publicKey,
    privateKey
  );

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  const judul = aksi === "priced" ? "Harga sudah masuk" : "Pesanan selesai";
  const isi =
    aksi === "priced"
      ? `Tukang sayur sudah mengirim harga untuk "${order.title}". Ketuk untuk melihat dan menyetujui.`
      : `Tukang sayur menandai "${order.title}" sudah dikirim.`;

  const payload = JSON.stringify({
    title: judul,
    body: isi,
    url: `/daftar/${order.id}`,
    tag: `order-${order.id}-${aksi}`,
  });

  let terkirim = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60 * 24 }
        );
        terkirim += 1;
      } catch (err) {
        const kode = (err as { statusCode?: number }).statusCode;
        // Langganan sudah tidak berlaku (aplikasi dihapus / izin dicabut).
        if (kode === 404 || kode === 410) {
          await admin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", s.endpoint);
        }
      }
    })
  );

  return NextResponse.json({ ok: true, terkirim });
}
