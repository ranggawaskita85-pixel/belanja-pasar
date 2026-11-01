/**
 * Logika murni untuk riwayat harga dan perbandingan antar penjual.
 * Harga di tabel items adalah harga TOTAL untuk seluruh jumlah barang,
 * jadi perbandingan selalu memakai harga per satuan (total / jumlah),
 * dan hanya untuk satuan yang sama (kg dengan kg, bukan dengan ikat).
 */

export type BarisRiwayat = {
  order_id: string;
  item_key: string;
  item_name: string;
  unit: string;
  seller_name: string;
  seller_key: string;
  qty: number;
  total_price: number;
  unit_price: number;
  approved_at: string;
};

export type ItemHarga = {
  name: string;
  qty: number | string;
  unit: string;
  price: number | string | null;
};

/** Kunci pencocokan: spasi dirapikan, huruf kecil. */
export function kunciNama(nama: string) {
  return nama.trim().replace(/\s+/g, " ").toLowerCase();
}

function rapikan(nama: string) {
  return nama.trim().replace(/\s+/g, " ");
}

/**
 * Menyusun baris riwayat dari barang-barang yang sudah diberi harga.
 * Barang tanpa harga (tidak tersedia) dilewati. Barang yang sama dengan
 * satuan yang sama digabung: total harga dibagi total jumlah.
 */
export function susunBarisRiwayat(
  orderId: string,
  penjual: string,
  items: ItemHarga[],
  waktu: string = new Date().toISOString()
): BarisRiwayat[] {
  const namaPenjual = rapikan(penjual);
  if (!namaPenjual) return [];

  const grup = new Map<
    string,
    { name: string; unit: string; qty: number; total: number }
  >();

  for (const it of items) {
    const harga = Number(it.price);
    const qty = Number(it.qty);
    if (!(harga > 0) || !(qty > 0)) continue;

    const nama = rapikan(it.name);
    if (!nama) continue;

    const kunci = `${kunciNama(nama)}|${it.unit}`;
    const g = grup.get(kunci);
    if (g) {
      g.qty += qty;
      g.total += harga;
    } else {
      grup.set(kunci, { name: nama, unit: it.unit, qty, total: harga });
    }
  }

  return Array.from(grup.values()).map((g) => ({
    order_id: String(orderId),
    item_key: kunciNama(g.name),
    item_name: g.name,
    unit: g.unit,
    seller_name: namaPenjual,
    seller_key: kunciNama(namaPenjual),
    qty: g.qty,
    total_price: g.total,
    unit_price: g.total / g.qty,
    approved_at: waktu,
  }));
}

export type TawaranPenjual = {
  seller_name: string;
  seller_key: string;
  unit_price: number;
  approved_at: string;
};

/**
 * Harga terbaru yang pernah disetujui dari setiap penjual untuk satu
 * barang + satuan, diurutkan dari yang termurah. Baris milik pesanan
 * yang sedang dilihat (`kecualiOrderId`) tidak ikut dihitung.
 */
export function hargaPerPenjual(
  riwayat: BarisRiwayat[],
  namaBarang: string,
  unit: string,
  kecualiOrderId?: string
): TawaranPenjual[] {
  const kunci = kunciNama(namaBarang);
  const terbaru = new Map<string, BarisRiwayat>();

  for (const r of riwayat) {
    if (r.item_key !== kunci || r.unit !== unit) continue;
    if (kecualiOrderId !== undefined && String(r.order_id) === String(kecualiOrderId)) {
      continue;
    }
    const ada = terbaru.get(r.seller_key);
    if (!ada || r.approved_at > ada.approved_at) terbaru.set(r.seller_key, r);
  }

  return Array.from(terbaru.values())
    .map((r) => ({
      seller_name: r.seller_name,
      seller_key: r.seller_key,
      unit_price: Number(r.unit_price),
      approved_at: r.approved_at,
    }))
    .sort(
      (a, b) =>
        a.unit_price - b.unit_price ||
        (a.approved_at < b.approved_at ? 1 : -1)
    );
}

export type Selisih = {
  tipe: "murah" | "mahal" | "sama";
  persen: number;
  selisih: number;
};

/** Membandingkan harga per satuan penawaran baru dengan harga pembanding. */
export function bandingkan(hargaSatuan: number, pembanding: number): Selisih {
  const a = Math.round(hargaSatuan);
  const b = Math.round(pembanding);
  if (a === b) return { tipe: "sama", persen: 0, selisih: 0 };
  const selisih = a - b;
  return {
    tipe: selisih > 0 ? "mahal" : "murah",
    persen: b > 0 ? Math.round((Math.abs(selisih) / b) * 100) : 0,
    selisih: Math.abs(selisih),
  };
}
