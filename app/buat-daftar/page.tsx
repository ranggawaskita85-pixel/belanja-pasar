"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function BuatDaftar() {
  const [title, setTitle] = useState("Belanja " + new Date().toLocaleDateString("id-ID"));
  const [items, setItems] = useState<any[]>([]);
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("kg");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  // Fungsi untuk menambah item ke daftar sementara (di layar)
  const tambahItem = () => {
    if (!itemName || !qty) return alert("Isi nama barang dan jumlahnya dulu ya!");
    setItems([...items, { name: itemName, qty: Number(qty), unit }]);
    setItemName("");
    setQty("");
  };

  // Fungsi untuk menyimpan semuanya ke database Supabase
  const simpanDaftar = async () => {
    if (items.length === 0) return alert("Daftar belanja masih kosong!");
    setLoading(true);

    // 1. Simpan judul daftar ke tabel 'orders'
    const { data: order, error: err1 } = await supabase
      .from("orders")
      .insert({ title, status: "draft" })
      .select()
      .single();

    if (err1) {
      alert("Gagal simpan pesanan: " + err1.message);
      setLoading(false);
      return;
    }

    // 2. Simpan semua item ke tabel 'items', hubungkan dengan ID pesanan di atas
    const itemsToInsert = items.map((i) => ({
      order_id: order.id,
      name: i.name,
      qty: i.qty,
      unit: i.unit,
      status: "requested",
    }));

    const { error: err2 } = await supabase.from("items").insert(itemsToInsert);

    if (err2) {
      alert("Gagal simpan item: " + err2.message);
      setLoading(false);
      return;
    }

    alert("Daftar belanja berhasil disimpan!");
    router.push("/"); // Kembali ke halaman utama
  };

  return (
    <div className="p-6 max-w-2xl mx-auto font-sans">
      <Link href="/" className="text-blue-500 hover:underline mb-4 inline-block">
        &larr; Kembali ke Beranda
      </Link>

      <h1 className="text-3xl font-bold mb-6">Buat Daftar Belanja</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Nama Daftar</label>
        <input
          type="text"
          className="border border-gray-300 p-3 w-full rounded-lg"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="border border-gray-200 p-4 rounded-xl bg-gray-50 mb-6">
        <h2 className="font-semibold text-lg mb-3">Tambah Barang</h2>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="text"
            placeholder="Nama barang (cth: Wortel)"
            className="border border-gray-300 p-2 flex-1 rounded-lg"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Jumlah"
            className="border border-gray-300 p-2 w-full sm:w-24 rounded-lg"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
          <select
            className="border border-gray-300 p-2 rounded-lg bg-white"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          >
            <option value="kg">kg</option>
            <option value="ikat">ikat</option>
            <option value="pcs">pcs</option>
            <option value="liter">liter</option>
          </select>
          <button
            onClick={tambahItem}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            + Tambah
          </button>
        </div>

        {/* Menampilkan daftar item yang sudah ditambahkan */}
        {items.length > 0 && (
          <ul className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {items.map((item, index) => (
              <li key={index} className="p-3 flex justify-between">
                <span>{item.name}</span>
                <span className="text-gray-500">{item.qty} {item.unit}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={simpanDaftar}
        disabled={loading}
        className="bg-green-600 text-white px-6 py-4 rounded-xl w-full font-bold text-lg hover:bg-green-700 disabled:bg-gray-400"
      >
        {loading ? "Menyimpan..." : "Simpan Daftar Belanja"}
      </button>
    </div>
  );
}
