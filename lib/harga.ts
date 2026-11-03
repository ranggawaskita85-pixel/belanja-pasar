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

/* =====================================================================
 * Tahap E: perbandingan dua kolom antar penjual
 * ===================================================================== */

/**
 * Satuan yang punya rasio pasti. Selain ini, satuan hanya sama dengan
 * dirinya sendiri (satu ikat bayam tidak bisa diubah ke kg).
 * pcs dan buah dianggap sama.
 */
const FAMILI_SATUAN: Record<string, { famili: string; faktor: number }> = {
  kg: { famili: "massa", faktor: 1000 },
  gram: { famili: "massa", faktor: 1 },
  pcs: { famili: "hitung", faktor: 1 },
  buah: { famili: "hitung", faktor: 1 },
};

export function infoSatuan(unit: string) {
  const u = unit.trim().toLowerCase();
  return FAMILI_SATUAN[u] ?? { famili: u, faktor: 1 };
}

export function bisaDikonversi(dari: string, ke: string) {
  return infoSatuan(dari).famili === infoSatuan(ke).famili;
}

/** Mengubah harga per satuan asal menjadi harga per satuan tujuan; null jika tidak bisa. */
export function konversiHargaSatuan(
  hargaPerSatuanAsal: number,
  dari: string,
  ke: string
): number | null {
  if (!bisaDikonversi(dari, ke)) return null;
  return hargaPerSatuanAsal * (infoSatuan(ke).faktor / infoSatuan(dari).faktor);
}

export type SelKanan =
  | {
      status: "ada";
      /** harga untuk jumlah yang sama dengan kolom kiri, dibulatkan */
      harga: number;
      /** harga per satuan kolom kiri setelah dikonversi */
      hargaSatuan: number;
      unit: string;
      unitAsal: string;
      dikonversi: boolean;
      tanggal: string;
    }
  | { status: "kosong" }
  | { status: "satuan_beda"; unitAsal: string };

export type OpsiPenjual = {
  /** Teks di pilihan. Harga lama penjual yang sama diberi keterangan "(harga sebelumnya)". */
  label: string;
  seller_name: string;
  /** Kunci unik pilihan. Pilihan harga lama penjual yang sama memakai awalan "~". */
  seller_key: string;
  /** "lain" = penjual lain; "sendiri" = harga lama penjual pada pesanan ini */
  jenis: "lain" | "sendiri";
  varian?: "terakhir" | "termurah";
  /** sejajar dengan daftar barang di kolom kiri */
  sel: SelKanan[];
  jumlahAda: number;
  total: number;
  tanggalTerbaru: string;
};

export type HasilBanding = {
  /** Urutan bawaan: barang paling lengkap, lalu total terendah. */
  opsi: OpsiPenjual[];
};

type BarisKiri = {
  name: string;
  qty: number | string;
  unit: string;
  price: number | string | null;
};

type PilihHarga = "terbaru" | "termurah";

const lebihBaru = (a: BarisRiwayat, b: BarisRiwayat) =>
  a.approved_at < b.approved_at ? 1 : -1;

/** Satu sel kolom kanan untuk satu barang, dari baris riwayat satu penjual. */
function bangunSel(item: BarisKiri, baris: BarisRiwayat[], pilih: PilihHarga): SelKanan {
  const kunci = kunciNama(item.name);
  const untukBarang = baris.filter((r) => r.item_key === kunci);
  if (untukBarang.length === 0) return { status: "kosong" };

  const cocok = untukBarang.filter((r) => bisaDikonversi(r.unit, item.unit));
  if (cocok.length === 0) {
    return { status: "satuan_beda", unitAsal: [...untukBarang].sort(lebihBaru)[0].unit };
  }

  const perSatuan = (r: BarisRiwayat) =>
    konversiHargaSatuan(Number(r.unit_price), r.unit, item.unit) as number;

  const dipilih =
    pilih === "terbaru"
      ? [...cocok].sort(lebihBaru)[0]
      : [...cocok].sort((a, b) => perSatuan(a) - perSatuan(b) || lebihBaru(a, b))[0];

  const hargaSatuan = perSatuan(dipilih);
  const qty = Number(item.qty);

  return {
    status: "ada",
    harga: Math.round(hargaSatuan * (qty > 0 ? qty : 0)),
    hargaSatuan,
    unit: item.unit,
    unitAsal: dipilih.unit,
    dikonversi: infoSatuan(dipilih.unit).faktor !== infoSatuan(item.unit).faktor,
    tanggal: dipilih.approved_at,
  };
}

function bangunOpsi(
  items: BarisKiri[],
  baris: BarisRiwayat[],
  pilih: PilihHarga,
  info: Pick<OpsiPenjual, "label" | "seller_name" | "seller_key" | "jenis" | "varian">
): OpsiPenjual | null {
  const sel = items.map((item) => bangunSel(item, baris, pilih));
  const ada = sel.filter((s): s is Extract<SelKanan, { status: "ada" }> => s.status === "ada");
  if (ada.length === 0) return null;
  return {
    ...info,
    sel,
    jumlahAda: ada.length,
    total: ada.reduce((n, s) => n + s.harga, 0),
    tanggalTerbaru: ada.map((s) => s.tanggal).sort().slice(-1)[0],
  };
}

const samaIsi = (a: OpsiPenjual, b: OpsiPenjual) =>
  a.sel.length === b.sel.length &&
  a.sel.every((s, i) => {
    const t = b.sel[i];
    if (s.status !== t.status) return false;
    return s.status !== "ada" || (t.status === "ada" && s.harga === t.harga);
  });

/**
 * Menyusun kolom kanan untuk setiap pembanding:
 *  - setiap penjual LAIN yang punya riwayat harga (harga terbarunya), dan
 *  - harga lama penjual YANG SAMA dari pesanan sebelumnya: "harga sebelumnya"
 *    (yang terakhir) dan, jika berbeda, "termurah sebelumnya".
 * Setiap sel dikonversi ke satuan dan jumlah kolom kiri. Baris dari pesanan
 * ini sendiri tidak pernah dihitung (agar tidak membandingkan dengan dirinya).
 */
export function susunPerbandingan(
  items: BarisKiri[],
  riwayat: BarisRiwayat[],
  opsi: { orderId?: string; penjualSendiri?: string } = {}
): HasilBanding {
  const namaSendiri = rapikan(opsi.penjualSendiri ?? "");
  const kunciSendiri = namaSendiri ? kunciNama(namaSendiri) : "";
  const kunciBarang = items.map((i) => kunciNama(i.name));

  const perPenjual = new Map<string, BarisRiwayat[]>();
  const barisSendiri: BarisRiwayat[] = [];

  for (const r of riwayat) {
    if (opsi.orderId !== undefined && String(r.order_id) === String(opsi.orderId)) continue;
    if (!kunciBarang.includes(r.item_key)) continue;
    if (kunciSendiri && r.seller_key === kunciSendiri) {
      barisSendiri.push(r);
      continue;
    }
    const daftar = perPenjual.get(r.seller_key);
    if (daftar) daftar.push(r);
    else perPenjual.set(r.seller_key, [r]);
  }

  const hasil: OpsiPenjual[] = [];

  for (const [sellerKey, baris] of perPenjual) {
    const o = bangunOpsi(items, baris, "terbaru", {
      label: baris[0].seller_name,
      seller_name: baris[0].seller_name,
      seller_key: sellerKey,
      jenis: "lain",
    });
    if (o) hasil.push(o);
  }

  // Harga lama penjual yang sama
  if (barisSendiri.length > 0) {
    const terakhir = bangunOpsi(items, barisSendiri, "terbaru", {
      label: `${namaSendiri} (harga sebelumnya)`,
      seller_name: namaSendiri,
      seller_key: "~terakhir",
      jenis: "sendiri",
      varian: "terakhir",
    });
    const termurah = bangunOpsi(items, barisSendiri, "termurah", {
      label: `${namaSendiri} (termurah sebelumnya)`,
      seller_name: namaSendiri,
      seller_key: "~termurah",
      jenis: "sendiri",
      varian: "termurah",
    });
    if (terakhir) hasil.push(terakhir);
    // Pilihan "termurah" hanya ditambahkan jika memang berbeda dari yang terakhir
    if (termurah && (!terakhir || !samaIsi(terakhir, termurah))) hasil.push(termurah);
  }

  hasil.sort(
    (a, b) =>
      b.jumlahAda - a.jumlahAda ||
      a.total - b.total ||
      a.label.localeCompare(b.label, "id")
  );

  return { opsi: hasil };
}

export type RingkasanBanding = {
  totalKiri: number;
  totalKanan: number;
  /** barang yang belum diberi harga oleh penjual di kolom kiri */
  kiriKosong: string[];
  /** barang yang tidak ada / satuannya tak bisa dikonversi di kolom kanan */
  kananKosong: string[];
  /** hanya barang yang sama-sama punya harga di kedua sisi */
  sebanding: { jumlah: number; totalKiri: number; totalKanan: number };
};

export function hitungRingkasan(items: BarisKiri[], sel: SelKanan[]): RingkasanBanding {
  let totalKiri = 0;
  let totalKanan = 0;
  const kiriKosong: string[] = [];
  const kananKosong: string[] = [];
  const sebanding = { jumlah: 0, totalKiri: 0, totalKanan: 0 };

  items.forEach((item, i) => {
    const kiri = Number(item.price);
    const adaKiri = kiri > 0;
    const s = sel[i];
    const adaKanan = s?.status === "ada";

    if (adaKiri) totalKiri += kiri;
    else kiriKosong.push(item.name);

    if (adaKanan) totalKanan += (s as Extract<SelKanan, { status: "ada" }>).harga;
    else kananKosong.push(item.name);

    if (adaKiri && adaKanan) {
      sebanding.jumlah += 1;
      sebanding.totalKiri += kiri;
      sebanding.totalKanan += (s as Extract<SelKanan, { status: "ada" }>).harga;
    }
  });

  return { totalKiri, totalKanan, kiriKosong, kananKosong, sebanding };
}

export type ArahSelisih = {
  /** kananMurah = penjual lain lebih murah (merah); kananMahal = lebih mahal (hijau) */
  tipe: "kananMurah" | "kananMahal" | "sama";
  selisih: number;
};

export function arahSelisih(totalKiri: number, totalKanan: number): ArahSelisih {
  const d = Math.round(totalKiri) - Math.round(totalKanan);
  if (d === 0) return { tipe: "sama", selisih: 0 };
  return { tipe: d > 0 ? "kananMurah" : "kananMahal", selisih: Math.abs(d) };
}
