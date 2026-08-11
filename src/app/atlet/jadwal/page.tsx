'use client'
// src/app/atlet/jadwal/page.tsx — Jadwal Tanding
// Sumber data jadwal per-atlet belum tersedia → tampilkan status informatif (bukan 404).

import { Calendar, Clock } from 'lucide-react'
import { C, useMe, Loading, PageHeader, Card, EmptyState } from '@/components/atlet/portal-ui'

export default function JadwalPage() {
  const { me, loading } = useMe()
  if (loading || !me) return <Loading/>

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto">
      <PageHeader icon={Calendar} title="Jadwal Tanding" subtitle={`Cabor ${me.cabor_nama_raw || '—'}`}/>

      <Card className="mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:`${C.blue}1a`, color:C.blue }}>
            <Clock size={18}/>
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color:C.text }}>Jadwal belum dirilis</div>
            <div className="text-xs" style={{ color:C.muted }}>Nomor & venue pertandingan akan tampil di sini setelah panitia merilis jadwal resmi.</div>
          </div>
        </div>
      </Card>

      <Card>
        <EmptyState icon={Calendar} title="Belum ada jadwal untuk cabormu"
          desc={`Saat jadwal PORPROV XV untuk ${me.cabor_nama_raw || 'cabor kamu'} dipublikasikan, daftar nomor pertandingan, tanggal, dan lokasi akan otomatis muncul di halaman ini.`}/>
      </Card>
    </div>
  )
}
