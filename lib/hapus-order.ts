import type { createClient } from "@/lib/supabase";

type Db = ReturnType<typeof createClient>;

const UKURAN_BATCH = 50;

export type HasilHapus = {
  /** true jika tidak ada kegagalan */
  ok: boolean;
  pesan?: string;
  /** id daftar yang benar-benar terhapus */
  terhapus: string[];
};

/**
 * Menghapus daftar belanja beserta isinya.
 *
 * Urutan dibuat supaya tidak ada data yang hilang setengah-setengah:
 * 1. Coba hapus daftarnya dulu. Jika tabel items memakai ON DELETE CASCADE,
 *    isinya ikut terhapus otomatis.
 * 2. Jika ditolak karena masih ada isi barang, hapus isinya lalu ulangi.
 * 3. Jika database menolak tanpa pesan galat (izin hapus belum ada),
 *    hasilnya 0 baris. Itu dikenali sebagai gagal, dan isi barang tidak disentuh.
 */
export async function hapusOrders(
  db: Db,
  ids: string[]
): Promise<HasilHapus> {
  const terhapus: string[] = [];

  for (let i = 0; i < ids.length; i += UKURAN_BATCH) {
    const batch = ids.slice(i, i + UKURAN_BATCH);

    let hasil = await db.from("orders").delete().in("id", batch).select("id");

    if (hasil.error) {
      const { error: errItems } = await db
        .from("items")
        .delete()
        .in("order_id", batch);
      if (errItems) {
        return { ok: false, pesan: errItems.message, terhapus };
      }

      hasil = await db.from("orders").delete().in("id", batch).select("id");
      if (hasil.error) {
        return { ok: false, pesan: hasil.error.message, terhapus };
      }
    }

    if (!hasil.data || hasil.data.length === 0) {
      return {
        ok: false,
        pesan:
          "Database menolak penghapusan. Jalankan file SQL langkah 2 di Supabase.",
        terhapus,
      };
    }

    for (const row of hasil.data as { id: string }[]) {
      terhapus.push(row.id);
    }
  }

  return { ok: true, terhapus };
}
