'use client'
// src/app/konida/atlet/kabbandung/idcard/page.tsx
// KONIDA Kab. Bandung — Cetak ID Card atlet pakai template resmi PORPROV XV.
// Admin pilih atlet → kartu (template + data + QR) → Cetak (102x126mm, depan+belakang).

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import Link from 'next/link'
import { Printer, Search, CreditCard, ArrowLeft, User } from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
const KONTINGEN_ID = 4

interface Atlet {
  id: number
  nama_lengkap: string
  nama_asal_daerah: string | null
  cabor_nama_raw: string | null
  no_registrasi_koni: number | null
  foto_url: string | null
  status_registrasi: string | null
}

export default function CetakIdCardPage() {
  const [list, setList] = useState<Atlet[] | null>(null)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Atlet | null>(null)
  const [qr, setQr] = useState('')

  useEffect(() => {
    sb.from('atlet')
      .select('id,nama_lengkap,nama_asal_daerah,cabor_nama_raw,no_registrasi_koni,foto_url,status_registrasi')
      .eq('kontingen_id', KONTINGEN_ID)
      .order('cabor_nama_raw', { ascending: true })
      .order('nama_lengkap', { ascending: true })
      .then(({ data }) => setList((data as Atlet[]) ?? []))
  }, [])

  useEffect(() => {
    if (!sel) { setQr(''); return }
    const payload = `PORPROV-XV|ATLET|REG:${sel.no_registrasi_koni ?? '-'}|${sel.nama_lengkap}|${sel.cabor_nama_raw ?? ''}`
    QRCode.toDataURL(payload, { margin: 0, width: 300, color: { dark: '#1b2a7a', light: '#ffffff' } })
      .then(setQr).catch(() => setQr(''))
  }, [sel])

  const filtered = useMemo(() => {
    if (!list) return []
    const s = q.trim().toLowerCase()
    if (!s) return list.slice(0, 40)
    return list.filter(a =>
      a.nama_lengkap?.toLowerCase().includes(s) ||
      a.cabor_nama_raw?.toLowerCase().includes(s)
    ).slice(0, 40)
  }, [list, q])

  return (
    <div className="min-h-screen" style={{ background: '#f1f5f9', color: '#0f172a' }}>
      <style>{`
        @media print {
          @page { size: 102mm 126mm; margin: 0; }
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; left: 0; top: 0; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .idcard { box-shadow: none !important; margin: 0 !important; page-break-after: always; break-after: page; }
          .idcard:last-child { page-break-after: auto; break-after: auto; }
        }
        .idcard {
          width: 102mm; aspect-ratio: 804 / 993; position: relative; container-type: inline-size;
          background-size: cover; background-position: center; background-repeat: no-repeat;
          border-radius: 2mm; overflow: hidden; box-shadow: 0 8px 24px rgba(15,23,42,.18);
        }
        .ov { position: absolute; font-family: system-ui, sans-serif; font-weight: 700; color: #1b2a7a;
          line-height: 1.05; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ov-nama   { left: 5%; top: 45.3%; width: 51%; font-size: 4.3cqw; }
        .ov-daerah { left: 5%; top: 55.4%; width: 51%; font-size: 3.7cqw; font-weight: 600; }
        .ov-cabor  { left: 5%; top: 65.4%; width: 51%; font-size: 3.7cqw; font-weight: 600; }
        .ov-foto   { left: 60.3%; top: 41.5%; width: 33.6%; height: 39.1%; object-fit: cover; }
        .ov-qr { position: absolute; left: 5%; top: 81.2%; width: 15%; aspect-ratio: 1;
          background: #fff; border-radius: 1mm; padding: 0.6mm; box-shadow: 0 0 0 0.4mm rgba(27,42,122,.15); }
      `}</style>

      <div className="max-w-6xl mx-auto p-5 md:p-8">
        {/* header */}
        <div className="no-print flex items-center gap-3 mb-6">
          <Link href="/konida/atlet/kabbandung" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50">
            <ArrowLeft size={16} className="text-slate-600" />
          </Link>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#1b2a7a15', color: '#1b2a7a' }}>
            <CreditCard size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold">Cetak ID Card Atlet</h1>
            <p className="text-xs text-slate-500">Template resmi PORPROV XV · Kab. Bandung</p>
          </div>
        </div>

        <div className="grid md:grid-cols-[320px_1fr] gap-6">
          {/* daftar atlet */}
          <div className="no-print">
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama / cabor…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400" />
            </div>
            <div className="text-[11px] text-slate-400 mb-2 px-1">
              {list === null ? 'Memuat…' : `${filtered.length} ditampilkan${q ? '' : ' (ketik untuk cari lain)'} · ${list.length} atlet`}
            </div>
            <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
              {filtered.map(a => (
                <button key={a.id} onClick={() => setSel(a)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                    sel?.id === a.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}>
                  <div className="text-sm font-semibold text-slate-800 truncate">{a.nama_lengkap}</div>
                  <div className="text-[11px] text-slate-500 truncate">{a.cabor_nama_raw || '—'} · {a.nama_asal_daerah || '—'}</div>
                </button>
              ))}
            </div>
          </div>

          {/* pratinjau + cetak */}
          <div>
            {!sel ? (
              <div className="no-print flex flex-col items-center justify-center text-center py-20 px-6 rounded-2xl border border-dashed border-slate-300 bg-white">
                <User size={30} className="text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">Pilih atlet di kiri untuk melihat & mencetak kartunya.</p>
              </div>
            ) : (
              <>
                <div className="no-print flex items-center justify-between mb-4">
                  <div className="text-sm text-slate-600">Kartu untuk <b className="text-slate-900">{sel.nama_lengkap}</b></div>
                  <button onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white"
                    style={{ background: '#1b2a7a' }}>
                    <Printer size={16} /> Cetak
                  </button>
                </div>

                <div id="print-area" className="flex flex-col items-center gap-8">
                  {/* DEPAN */}
                  <div className="idcard" style={{ backgroundImage: 'url(/idcard/tpl-a-front.png)' }}>
                    {sel.foto_url && <img className="ov ov-foto" src={sel.foto_url} alt="" />}
                    <div className="ov ov-nama">{sel.nama_lengkap}</div>
                    <div className="ov ov-daerah">{sel.nama_asal_daerah || '—'}</div>
                    <div className="ov ov-cabor">{sel.cabor_nama_raw || '—'}</div>
                    {qr && <img className="ov-qr" src={qr} alt="QR" />}
                  </div>
                  {/* BELAKANG */}
                  <div className="idcard" style={{ backgroundImage: 'url(/idcard/tpl-back.png)' }} />
                </div>

                <p className="no-print text-xs text-slate-400 mt-4 text-center">
                  QR &amp; data ditumpangkan otomatis. Cetak → ukuran kartu 102×126&nbsp;mm (depan &amp; belakang = 2 halaman).
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
