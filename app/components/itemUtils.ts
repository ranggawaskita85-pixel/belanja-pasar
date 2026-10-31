export type CategoryGroup<T> = {
  category: string | null;
  items: T[];
};

/** Pilihan satuan barang. */
export const SATUAN = [
  "kg",
  "gram",
  "ikat",
  "pcs",
  "buah",
  "bungkus",
  "pack",
  "liter",
  "butir",
];

/** Judul cepat yang bisa diketuk di form. */
export const KATEGORI_CEPAT = ["Sayuran", "Buah", "Lauk", "Kue", "Bahan Baku"];

/**
 * Mengelompokkan barang berdasarkan judul (category).
 * Urutan kelompok mengikuti kemunculan pertama di daftar.
 */
export function groupByCategory<T extends { category?: string | null }>(
  items: T[]
): CategoryGroup<T>[] {
  const groups: CategoryGroup<T>[] = [];

  for (const item of items) {
    const cat = item.category?.trim() ? item.category.trim() : null;
    const existing = groups.find((g) => g.category === cat);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ category: cat, items: [item] });
    }
  }

  return groups;
}
