import writeExcelFile from "write-excel-file/universal";
import { groupByCategory } from "@/app/components/itemUtils";

/* =====================================================================
 * Unduh Excel: per pesanan dan rekap beberapa pesanan.
 * Harga di tabel items adalah harga TOTAL untuk seluruh jumlah barang.
 * ===================================================================== */

export type OrderExcel = {
  id?: string;
  title: string;
  created_at?: string | null;
  seller_name?: string | null;
  status?: string;
};

export type ItemExcel = {
  id?: number | string;
  order_id?: string;
  name: string;
  qty: number | string;
  unit: string;
  price: number | string | null;
  category?: string | null;
};

// Tipe sel dibuat longgar agar tidak tergantung versi pustaka.
type Sel = unknown;
export type LembarExcel = {
  sheet: string;
  data: Sel[][];
  columns: { width: number }[];
};

const FORMAT_RP = "#,##0";
const HEADER = { fontWeight: "bold", backgroundColor: "#d1fae5" } as const;
const TEBAL = { fontWeight: "bold" } as const;

/** "2 November 2026" */
export function tanggalPanjang(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/** yyyy-mm-dd menurut zona waktu perangkat */
export function tanggalIsoLokal(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Tanggal sebagai sel tanggal Excel tanpa bergeser hari karena zona waktu. */
function selTanggal(iso?: string | null): Sel {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    value: new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())),
    type: Date,
    format: "dd/mm/yyyy",
  };
}

const angka = (v: number | string | null | undefined) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

function hargaSatuan(item: ItemExcel) {
  const harga = angka(item.price);
  const qty = angka(item.qty);
  return harga !== null && qty !== null ? Math.round(harga / qty) : null;
}

const selRp = (v: number | null, gaya: object = {}): Sel =>
  v === null ? null : { value: v, type: Number, format: FORMAT_RP, ...gaya };

/** Satu lembar rincian untuk satu pesanan. */
export function susunExcelPesanan(order: OrderExcel, items: ItemExcel[]): LembarExcel[] {
  const data: Sel[][] = [
    [{ value: order.title || "Daftar Belanja", ...TEBAL }],
    ["Tanggal", tanggalPanjang(order.created_at)],
    ["Penjual", order.seller_name?.trim() || "-"],
    [],
    [
      { value: "No", ...HEADER },
      { value: "Kelompok", ...HEADER },
      { value: "Barang", ...HEADER },
      { value: "Jumlah", ...HEADER },
      { value: "Satuan", ...HEADER },
      { value: "Harga (Rp)", ...HEADER },
      { value: "Harga per Satuan (Rp)", ...HEADER },
    ],
  ];

  const groups = groupByCategory(items);
  const adaKelompok = groups.some((g) => g.category);
  let no = 0;
  let total = 0;

  for (const g of groups) {
    let subtotal = 0;
    for (const item of g.items) {
      no += 1;
      const harga = angka(item.price);
      if (harga !== null) {
        subtotal += harga;
        total += harga;
      }
      data.push([
        no,
        g.category ?? "-",
        item.name,
        angka(item.qty) !== null ? { value: Number(item.qty), type: Number } : null,
        item.unit,
        selRp(harga),
        selRp(hargaSatuan(item)),
      ]);
    }
    if (adaKelompok) {
      data.push([
        null,
        null,
        { value: `Subtotal ${g.category ?? "Lainnya"}`, ...TEBAL },
        null,
        null,
        selRp(subtotal, TEBAL) ?? { value: 0, type: Number, format: FORMAT_RP, ...TEBAL },
        null,
      ]);
    }
  }

  data.push([]);
  data.push([
    null,
    null,
    { value: "TOTAL", ...TEBAL },
    null,
    null,
    { value: total, type: Number, format: FORMAT_RP, ...TEBAL },
    null,
  ]);

  return [
    {
      sheet: "Belanja",
      data,
      columns: [{ width: 5 }, { width: 18 }, { width: 28 }, { width: 10 }, { width: 10 }, { width: 16 }, { width: 22 }],
    },
  ];
}

export type PesananLengkap = { order: OrderExcel; items: ItemExcel[] };

/** Rekap: lembar "Rekap" (satu baris per pesanan) dan "Rincian" (semua barang). */
export function susunExcelRekap(
  daftar: PesananLengkap[],
  dari: string,
  sampai: string
): LembarExcel[] {
  const urut = [...daftar].sort((a, b) =>
    String(a.order.created_at ?? "").localeCompare(String(b.order.created_at ?? ""))
  );

  const rekap: Sel[][] = [
    [{ value: `Rekap Belanja ${dari} s/d ${sampai}`, ...TEBAL }],
    [],
    [
      { value: "Tanggal", ...HEADER },
      { value: "Judul", ...HEADER },
      { value: "Penjual", ...HEADER },
      { value: "Jumlah Barang", ...HEADER },
      { value: "Total (Rp)", ...HEADER },
    ],
  ];
  const rincian: Sel[][] = [
    [
      { value: "Tanggal", ...HEADER },
      { value: "Judul", ...HEADER },
      { value: "Penjual", ...HEADER },
      { value: "Kelompok", ...HEADER },
      { value: "Barang", ...HEADER },
      { value: "Jumlah", ...HEADER },
      { value: "Satuan", ...HEADER },
      { value: "Harga (Rp)", ...HEADER },
      { value: "Harga per Satuan (Rp)", ...HEADER },
    ],
  ];

  let totalSemua = 0;
  let barangSemua = 0;

  for (const { order, items } of urut) {
    const totalOrder = items.reduce((n, i) => n + (angka(i.price) ?? 0), 0);
    totalSemua += totalOrder;
    barangSemua += items.length;

    rekap.push([
      selTanggal(order.created_at),
      order.title,
      order.seller_name?.trim() || "-",
      items.length,
      { value: totalOrder, type: Number, format: FORMAT_RP },
    ]);

    for (const item of items) {
      rincian.push([
        selTanggal(order.created_at),
        order.title,
        order.seller_name?.trim() || "-",
        item.category?.trim() || "-",
        item.name,
        angka(item.qty) !== null ? { value: Number(item.qty), type: Number } : null,
        item.unit,
        selRp(angka(item.price)),
        selRp(hargaSatuan(item)),
      ]);
    }
  }

  rekap.push([]);
  rekap.push([
    null,
    { value: "TOTAL", ...TEBAL },
    null,
    { value: barangSemua, type: Number, ...TEBAL },
    { value: totalSemua, type: Number, format: FORMAT_RP, ...TEBAL },
  ]);

  return [
    { sheet: "Rekap", data: rekap, columns: [{ width: 14 }, { width: 30 }, { width: 20 }, { width: 14 }, { width: 18 }] },
    {
      sheet: "Rincian",
      data: rincian,
      columns: [{ width: 14 }, { width: 28 }, { width: 18 }, { width: 16 }, { width: 26 }, { width: 10 }, { width: 10 }, { width: 16 }, { width: 22 }],
    },
  ];
}

/** Nama file yang aman: huruf kecil, angka, tanda hubung. */
export function namaFileAman(teks: string) {
  const s = teks
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "belanja";
}

export async function buatBlobExcel(lembar: LembarExcel[]): Promise<Blob> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await writeExcelFile(lembar as any).toBlob();
}

/** Memicu unduhan di browser. */
export function unduhBlob(blob: Blob, namaFile: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function unduhExcelPesanan(order: OrderExcel, items: ItemExcel[]) {
  const blob = await buatBlobExcel(susunExcelPesanan(order, items));
  unduhBlob(blob, `belanja-${namaFileAman(order.title)}-${tanggalIsoLokal(order.created_at)}.xlsx`);
}

export async function unduhExcelRekap(daftar: PesananLengkap[], dari: string, sampai: string) {
  const blob = await buatBlobExcel(susunExcelRekap(daftar, dari, sampai));
  unduhBlob(blob, `rekap-belanja-${dari}_${sampai}.xlsx`);
}
