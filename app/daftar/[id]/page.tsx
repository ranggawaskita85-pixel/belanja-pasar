"use client";

import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function DetailDaftar() {
  const [order, setOrder] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [linkVendor, setLinkVendor] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = createClient()
  const params = useParams()

  useEffect(() => {
    async function getDetail() {
      const { data: orderData } = await supabase.from('orders').select().eq('id', params.id).single()
      if (orderData) {
        setOrder(orderData)
        if (orderData.public_token) setLinkVendor(`${window.location.origin}/vendor/${orderData.public_token}`)
      }
      const { data: itemsData } = await supabase.from('items').select().eq('order_id', params.id)
      if (itemsData) setItems(itemsData)
      setLoading(false)
    }
    getDetail()
  }, [params.id])

  const handleKirim = async () => {
    setActionLoading(true)
    const token = crypto.randomUUID()
    const { error } = await supabase.from('orders').update({ public_token: token, status: 'sent' }).eq('id', params.id)

    if (!error) {
      setLinkVendor(`${window.location.origin}/vendor/${token}`)
      setOrder({ ...order, status: 'sent', public_token: token })
    } else {
      alert("Gagal membuat link: " + error.message)
    }
    setActionLoading(false)
  }

  const handleApprove = async () => {
    setActionLoading(true)
    const { error } = await supabase.from('orders').update({ status: 'approved' }).eq('id', order.id)
    if (!error) setOrder({ ...order, status: 'approved' })
    setActionLoading(false)
  }

  // Fungsi baru: Pembeli menandai sudah transfer
  const handleTransfer = async () => {
    setActionLoading(true)
    const { error } = await supabase.from('orders').update({ status: 'paid' }).eq('id', order.id)
    if (!error) setOrder({ ...order, status: 'paid' })
    setActionLoading(false)
  }

  if (loading) return <div className="p-6 text-center">Memuat data...</div>
  if (!order) return <div className="p-6 text-center">Daftar tidak ditemukan.</div>

  const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0)

  return (
    <div className="p-6 max-w-2xl mx-auto font-sans text-gray-900">
      <Link href="/" className="text-blue-500 hover:underline mb-4 inline-block">&larr; Kembali</Link>

      <h1 className="text-3xl font-bold mb-2">{order.title}</h1>
      <p className="text-gray-500 mb-6">Status: <span className="font-semibold">{order.status.toUpperCase()}</span></p>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6 shadow-sm">
        <div className="bg-gray-50 p-4 border-b border-gray-200 font-semibold flex justify-between">
          <span>Daftar Barang ({items.length})</span>
          <span>Harga</span>
        </div>
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.id} className="p-4 flex justify-between items-center">
              <div>
                <span className="font-medium text-gray-800 block">{item.name}</span>
                <span className="text-sm text-gray-500">{item.qty} {item.unit}</span>
              </div>
              {item.price ? (
                <span className="font-semibold">Rp {Number(item.price).toLocaleString('id-ID')}</span>
              ) : (
                <span className="text-sm text-gray-400 italic">Belum ada harga</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Tampilkan Total Jika Harga Sudah Diisi */}
      {order.status !== 'draft' && order.status !== 'sent' && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex justify-between items-center mb-6">
          <span className="font-semibold text-blue-900">Total Tagihan:</span>
          <span className="text-2xl font-bold text-blue-900">Rp {total.toLocaleString('id-ID')}</span>
        </div>
      )}

      {/* Tombol Aksi Berdasarkan Status */}
      <div className="flex flex-col gap-3">
        {order.status === 'priced' && (
          <button onClick={handleApprove} disabled={actionLoading} className="bg-blue-600 text-white px-6 py-4 rounded-xl w-full font-bold hover:bg-blue-700 disabled:bg-gray-400">
            {actionLoading ? "Memproses..." : "Setujui Harga"}
          </button>
        )}

        {order.status === 'approved' && (
          <button onClick={handleTransfer} disabled={actionLoading} className="bg-orange-500 text-white px-6 py-4 rounded-xl w-full font-bold hover:bg-orange-600 disabled:bg-gray-400 shadow-md">
            {actionLoading ? "Memproses..." : "Saya Sudah Transfer"}
          </button>
        )}

        {order.status === 'paid' && (
          <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 p-4 rounded-xl text-center font-semibold">
            Menunggu tukang sayur mengirim barang...
          </div>
        )}

        {order.status === 'completed' && (
          <div className="bg-green-100 border border-green-300 text-green-800 p-4 rounded-xl text-center font-bold text-lg">
            🎉 Pesanan Selesai!
          </div>
        )}

        {/* Tampilan Tombol Link Vendor (Muncul jika DRAFT atau belum ada link) */}
        {(order.status === 'draft' || !order.public_token) && (
          <button onClick={handleKirim} disabled={actionLoading} className="bg-green-600 text-white px-6 py-4 rounded-xl w-full font-bold hover:bg-green-700 disabled:bg-gray-400">
            {actionLoading ? "Memproses..." : "Buat Link & Kirim ke Tukang Sayur"}
          </button>
        )}
      </div>

      {/* Tampilan Link WA */}
      {order.public_token && order.status !== 'draft' && order.status !== 'completed' && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mt-6">
          <p className="text-sm text-blue-800 font-semibold mb-2">Link untuk Tukang Sayur:</p>
          <div className="bg-white p-3 rounded border text-sm text-gray-600 break-all mb-3">{linkVendor}</div>
          <a href={`https://wa.me/?text=Halo%20Pak%2FBu%2C%20ini%20daftar%20belanjaannya%20ya%3A%20${linkVendor}`} target="_blank" rel="noreferrer" className="bg-green-500 text-white px-4 py-2 rounded-lg block text-center font-semibold hover:bg-green-600">
            Kirim via WhatsApp
          </a>
        </div>
      )}
    </div>
  )
}

