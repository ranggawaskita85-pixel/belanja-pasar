import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;

  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("https://") ||
    typeof p256dh !== "string" ||
    typeof auth !== "string"
  ) {
    return NextResponse.json(
      { error: "Data langganan tidak valid." },
      { status: 400 }
    );
  }

  const admin = getAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Server belum dikonfigurasi (SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  const { error } = await admin
    .from("push_subscriptions")
    .upsert({ endpoint, p256dh, auth }, { onConflict: "endpoint" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
