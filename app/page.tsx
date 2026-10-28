"use client";

import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Home() {
  const [orders, setOrders] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function getOrders() {
      // Mengambil data dari tabel 'orders', diurutkan dari yang terbaru
      const { data, error } = await supabase
        .from('orders')
        .select()
        .order('created_at', { ascending: false })

      if (data) setOrders(data)
      if (error) console.log(error)
    }
    getOrders()
  }, [])

  return (
    <div className="p-6 max-w-2xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-6">Daftar Belanja Saya</h1>

      <Link
        href="/buat-daftar"
        className="bg-blue-600 text-white px-6 py-3 rounded-xl inline-block font-bold text-lg mb-8 hover:bg-blue-700 w-full text-center"
      >
        + Buat Daftar Belanja Baru
      </Link>

      <div className="flex flex-col gap-4">
        {orders.length === 0 ? (
          <p className="text-gray-500 text-center">Belum ada daftar belanja.</p>
        ) : (
          orders.map((order) => (
            <Link
              key={order.id}
              href={`/daftar/${order.id}`} // Nanti kita buat halaman ini
              className="border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition bg-white"
            >
              <h2 className="text-xl font-semibold text-gray-800">{order.title}</h2>
              <p className="text-sm text-gray-500 mt-1">Status: {order.status}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
