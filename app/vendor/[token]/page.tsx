"use client";

import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function HalamanVendor() {
  const [order, setOrder] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [simpanLoading, setSimpanLoading] = useState(false)

  const supabase = createClient()
  const params = useParams()

  useEffect(() => {
    async function getData() {
      const { data: orderData } = await supabase.from('orders').select().eq('public_token', params.token).single()
      if (orderData) {
        setOrder(orderData)
        const { data: itemsData } = await supabase.from('items').select().eq('order_id', orderData.id)
        if (itemsData) setItems(itemsData)
      }
      setLoading(false)
    }
    getData()
  }, [params.token])

  const handlePriceChange = (id: number, price: string) => {
    setItems(items.map(item => item.id === id ? { ...item, price: price } : item))
  }

  const handleSimpanHarga = async () => {
    setSimpanLoading(true)
    for (const item of items) {
      if (item.price) {
        await supabase.from('items').update({ price: Number(item.price) }).eq('id', item.id)
      }
    }
    await supabase.from('orders').update({ status: 'priced' }).eq('id', order.id)
    setOrder({ ...order, status: 'priced' })
    setSimpanLoading(false)
  }

  // Fungsi baru: Vendor menandai pesanan selesai
  const handleSelesai = async () => {
    setSimpanLoading(true)
    await supabase.from('orders').update({ status: 'completed' }).eq('id', order.id)
    setOrder({ ...order, status: 'completed' })
    setSimpanLoading(false)
  }

  if (loading) return <div className="p-6 text-center">Memuat...</div>
  if (!order) return <div className="p-6 text-center">Link tidak valid.</div>

  const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0)

  return (
    <div className="p-4 max-w-lg mx-auto font-sans text-gray-900">
      <div className="bg-blue-600 text-white p-4 rounded-xl mb-6">
        <h1 className="text-xl font-bold">Daftar Belanja</h1>
        <p className="text-blue-100">{order.title}</p>
        <p className="text-xs mt-2 bg-blue-700 inline-block px-2 py-1 rounded">Status: {order.status.toUpperCase()}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6 shadow-sm">
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.id} className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-gray-800">{item.name}</span>
                <span className="text-sm bg-gray-100 px-2 py-1 rounded">{item.qty} {item.unit}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">Rp</span>
                <input
                  type="number"
                  placeholder="0"
                  className="border border-gray-300 p-2 w-full rounded-lg text-lg disabled:bg-gray-100"
                  value={item.price || ''}
                  onChange={(e) => handlePriceChange(item.id, e.target.value)}
                  disabled={order.status !== 'sent'} // Hanya bisa diedit saat status 'sent'
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl mb-6 flex justify-between items-center">
        <span className="font-semibold text-gray-600">Total:</span>
        <span className="text-2xl font-bold text-gray-800">Rp {total.toLocaleString('id-ID')}</span>
      </div>

      {/* Tombol Aksi Vendor Berdasarkan Status */}
      {order.status === 'sent' && (
        <button onClick={handleSimpanHarga} disabled={simpanLoading} className="bg-green-600 text-white px-6 py-4 rounded-xl w-full font-bold hover:bg-green-700 disabled:bg-gray-400">
          {simpanLoading ? "Mengirim..." : "Kirim Harga ke Pembeli"}
        </button>
      )}

      {order.status === 'priced' && (
        <div className="bg-gray-100 text-gray-600 text-center p-4 rounded-xl font-semibold">
          Menunggu persetujuan harga dari pembeli.
        </div>
      )}

      {order.status === 'approved' && (
        <div className="bg-orange-100 text-orange-800 text-center p-4 rounded-xl font-semibold">
          Pembeli menyetujui harga. Menunggu transfer.
        </div>
      )}

      {order.status === 'paid' && (
        <button onClick={handleSelesai} disabled={simpanLoading} className="bg-blue-600 text-white px-6 py-4 rounded-xl w-full font-bold hover:bg-blue-700 shadow-md">
          {simpanLoading ? "Memproses..." : "Pembeli Sudah Transfer (Kirim Barang)"}
        </button>
      )}

      {order.status === 'completed' && (
        <div className="bg-green-100 text-green-800 text-center p-4 rounded-xl font-bold">
          Pesanan Selesai. Terima kasih!
        </div>
      )}
    </div>
  )
}
