import { createClient } from "@supabase/supabase-js";

/**
 * Klien Supabase khusus server (route handler di app/api).
 * JANGAN diimpor dari komponen "use client" karena memakai kunci rahasia.
 */
export function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
