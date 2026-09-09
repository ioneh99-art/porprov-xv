'use client'
// src/components/konida/PapanKerjaData.tsx
// Papan pekerjaan data — apa yang belum beres, hari ini, siapa yang kena.
//
// Latar: dasbor dulu dibuka oleh panel hijau "Data Quality Engine · LIVE ·
// 99,3% AKURASI" berisi lima kartu tentang apa yang SUDAH diperbaiki mesin —
// dan angkanya ditulis mati di berkas halaman, jadi membeku sejak hari
// diketik. Daftar yang benar-benar perlu dikerjakan diletakkan DI BAWAHNYA,
// dengan huruf abu-abu 10 piksel, dan hanya empat butir yang ditampilkan.
//
// Susunannya terbalik: yang menenangkan besar dan di atas, yang menuntut
// kerja kecil dan di bawah. Orang teknis yang membukanya wajar menyimpulkan
// tidak ada pekerjaan. Papan ini menukar urutan itu.

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ClipboardList, Loader2, ChevronRight, CheckCircle2, ChevronDown, Wrench,
} from 'lucide-react'
import { ambilBersama } from '@/lib/ambil-bersama'

interface Pekerjaan {
  kunci: string; judul: string; jumlah: number; dari: number | null
  keterangan: string; akibat: string
  tingkat: 'kritis' | 'penting' | 'biasa'
  tautan: string; contoh: string[]
}

const RUPA = {
  kritis:  { warna: '#ef4444', latar: 'rgba(239,68,68,0.09)',  garis: 'rgba(239,68,68,0.28)',  label: 'HARUS DIBERESKAN' },
  penting: { warna: '#f97316', latar: 'rgba(249,115,22,0.08)', garis: 'rgba(249,115,22,0.25)', label: 'PERLU DIKERJAKAN' },
  biasa:   { warna: '#eab308', latar: 'rgba(234,179,8,0.07)',  garis: 'rgba(234,179,8,0.22)',  label: 'MENYUSUL' },
} as const

export default function PapanKerjaData({ accent = '#38bdf8' }: { accent?: string }) {
  const [data, setData]   = useState<any>(null)
  const [sibuk, setSibuk] = useState(true)
  const [buka, setBuka]   = useState<string | null>(null)
  const [semua, setSemua] = useState(false)

  useEffect(() => {
    let hidup = true
    ambilBersama('/api/konida/pekerjaan-data')
      .then(d => { if (hidup) setData(d) })
      .catch(() => {})
      .finally(() => { if (hidup) setSibuk(false) })
    return () => { hidup = false }
  }, [])

  if (sibuk) return (
    <div className="rounded-2xl border border-white/10 p-8 text-center">
      <Loader2 size={18} className="mx-auto animate-spin text-slate-600" />
    </div>
  )
  if (!data) return null

  const pekerjaan: Pekerjaan[] = data.pekerjaan ?? []
  const orang = pekerjaan.reduce((n, p) => n + p.jumlah, 0)
  const m = data.mesin ?? {}

  if (pekerjaan.length === 0) return (
    <div className="rounded-2xl p-5 flex items-center gap-3"
      style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
      <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
      <div>
        <div className="text-sm font-bold text-white">Tidak ada pekerjaan data yang tertunda</div>
        <div className="text-[11px] text-slate-400">
          Seluruh {data.total_atlet} atlet lolos semua pemeriksaan.
        </div>
      </div>
    </div>
  )

  const tampil = semua ? pekerjaan : pekerjaan.slice(0, 4)

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.22)' }}>

      {/* Kepala — angkanya sengaja besar. Ini yang harus terbaca lebih dulu. */}
      <div className="px-5 py-4 flex flex-wrap items-center gap-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <ClipboardList size={20} className="text-red-400 shrink-0" />
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-red-400">Pekerjaan Data</div>
          <div className="text-white font-bold text-sm mt-0.5">
            {pekerjaan.length} hal perlu dibereskan
            <span className="text-slate-500 font-normal"> · menyangkut {orang.toLocaleString('id-ID')} baris data</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4 shrink-0">
          {(['kritis', 'penting', 'biasa'] as const).map(t => {
            const n = pekerjaan.filter(p => p.tingkat === t).length
            if (!n) return null
            return (
              <div key={t} className="text-center">
                <div className="text-xl font-black leading-none" style={{ color: RUPA[t].warna }}>{n}</div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 mt-1">{RUPA[t].label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Butir pekerjaan */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {tampil.map(p => {
          const r = RUPA[p.tingkat]
          const terbuka = buka === p.kunci
          return (
            <div key={p.kunci} className="rounded-xl overflow-hidden"
              style={{ background: r.latar, border: `1px solid ${r.garis}` }}>
              <button onClick={() => setBuka(terbuka ? null : p.kunci)}
                className="w-full px-4 py-3 flex items-center gap-3.5 text-left">
                <div className="shrink-0 text-right" style={{ minWidth: 52 }}>
                  <div className="text-2xl font-black leading-none" style={{ color: r.warna }}>{p.jumlah}</div>
                  {p.dari ? <div className="text-[9px] text-slate-500 mt-0.5">dari {p.dari}</div> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: r.warna }}>
                    {r.label}
                  </div>
                  <div className="text-sm font-bold text-white leading-snug mt-0.5">{p.judul}</div>
                </div>
                {terbuka ? <ChevronDown size={15} className="text-slate-500 shrink-0" />
                         : <ChevronRight size={15} className="text-slate-500 shrink-0" />}
              </button>

              {terbuka && (
                <div className="px-4 pb-3.5 space-y-2.5">
                  <p className="text-[12px] text-slate-300 leading-relaxed">{p.keterangan}</p>
                  <p className="text-[12px] leading-relaxed" style={{ color: r.warna }}>
                    <b>Kalau dibiarkan:</b> <span className="text-slate-400">{p.akibat}</span>
                  </p>
                  {p.contoh.length > 0 && (
                    <div className="text-[11px] text-slate-500">
                      Contoh: <span className="text-slate-400">{p.contoh.join(' · ')}</span>
                      {p.jumlah > p.contoh.length && <span> — dan {p.jumlah - p.contoh.length} lainnya</span>}
                    </div>
                  )}
                  <Link href={p.tautan}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: `${r.warna}22`, color: r.warna, border: `1px solid ${r.warna}55` }}>
                    Buka halaman untuk membereskan <ChevronRight size={13} />
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {pekerjaan.length > 4 && (
        <div className="px-4 pb-3">
          <button onClick={() => setSemua(v => !v)}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/[0.06] text-slate-400">
            {semua ? 'Ringkas' : `Lihat semua (${pekerjaan.length})`}
          </button>
        </div>
      )}

      {/* Yang sudah dibereskan mesin — tetap ditampilkan, tapi di bawah dan kecil.
          Itu kabar baik, bukan pekerjaan. */}
      <div className="px-5 py-2.5 border-t flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>
        <span className="inline-flex items-center gap-1.5 text-slate-500">
          <Wrench size={11} style={{ color: accent }} /> Sudah dibereskan mesin sendiri:
        </span>
        <span className="text-slate-400"><b className="text-slate-200">{m.koreksi_total ?? 0}</b> koreksi otomatis</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-400">cabor {m.koreksi?.cabor ?? 0}</span>
        <span className="text-slate-400">tgl lahir {m.koreksi?.tgl_lahir ?? 0}</span>
        <span className="text-slate-400">gender {m.koreksi?.gender ?? 0}</span>
      </div>
    </div>
  )
}
