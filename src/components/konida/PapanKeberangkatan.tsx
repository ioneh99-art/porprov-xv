'use client'
// src/components/konida/PapanKeberangkatan.tsx
// Rombongan keberangkatan — dikelompokkan per kota tujuan, bukan per cabor.
//
// Yang menentukan logistik bukan cabang olahraganya, tapi kotanya: satu bus,
// satu penginapan, satu tanggal berangkat untuk semua cabor yang tujuannya
// sama. Bekasi menampung 31 cabor, Bogor 18 — sementara Pangandaran cuma
// satu. Selama jadwal masih berupa daftar cabor, pengelompokan itu harus
// dilakukan di kepala orang setiap kali.

import { useState, useEffect } from 'react'
import { Bus, Loader2, ChevronDown, ChevronRight, MapPin, UserCheck } from 'lucide-react'

interface Cabor { cabor: string; mulai: string | null; venue: string | null; atlet: number; tanpa_foto: number; elite: number }
interface Rombongan {
  kota: string; mulai: string | null; selesai: string | null; hari_lagi: number | null
  jumlah_cabor: number; atlet: number; elite: number; tanpa_foto: number
  contact_person: string | null; cabor: Cabor[]
}

const tgl = (s: string | null) => {
  if (!s) return '—'
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export default function PapanKeberangkatan({ accent = '#38bdf8' }: { accent?: string }) {
  const [d, setD] = useState<any>(null)
  const [sibuk, setSibuk] = useState(true)
  const [buka, setBuka] = useState<string | null>(null)

  useEffect(() => {
    let hidup = true
    fetch('/api/konida/jadwal')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('gagal')))
      .then(x => { if (hidup) setD(x) })
      .catch(() => {})
      .finally(() => { if (hidup) setSibuk(false) })
    return () => { hidup = false }
  }, [])

  if (sibuk) return (
    <div className="rounded-2xl border border-white/10 p-8 text-center">
      <Loader2 size={18} className="mx-auto animate-spin text-slate-600" />
    </div>
  )
  const rombongan: Rombongan[] = d?.rombongan ?? []
  if (!rombongan.length) return null

  const totalAtlet = rombongan.reduce((n, r) => n + r.atlet, 0)
  const tanpaKontak = rombongan.filter(r => !r.contact_person).length

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.07] flex flex-wrap items-center gap-3">
        <Bus size={18} style={{ color: accent }} className="shrink-0" />
        <div className="min-w-0">
          <h3 className="text-white font-bold text-sm">Papan Keberangkatan</h3>
          <p className="text-[11px] text-slate-500">
            {rombongan.length} kota tujuan · {totalAtlet.toLocaleString('id-ID')} atlet ·
            urut dari yang paling dulu berangkat
          </p>
        </div>
        {tanpaKontak > 0 && (
          <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0"
            style={{ background: 'rgba(249,115,22,0.12)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)' }}>
            {tanpaKontak} rombongan belum ada penanggung jawab
          </span>
        )}
      </div>

      <div className="divide-y divide-white/[0.05]">
        {rombongan.map(r => {
          const terbuka = buka === r.kota
          const dekat = r.hari_lagi != null && r.hari_lagi <= 45
          return (
            <div key={r.kota}>
              <button onClick={() => setBuka(terbuka ? null : r.kota)}
                className="w-full px-4 py-3 flex items-center gap-3.5 text-left hover:bg-white/[0.03] transition-colors">
                <div className="shrink-0 text-center rounded-lg px-2.5 py-1.5"
                  style={{ background: dekat ? 'rgba(239,68,68,0.10)' : 'rgba(56,189,248,0.07)', minWidth: 58 }}>
                  <div className="text-base font-black leading-none"
                    style={{ color: dekat ? '#ef4444' : accent }}>
                    {r.hari_lagi != null && r.hari_lagi >= 0 ? r.hari_lagi : '—'}
                  </div>
                  <div className="text-[8px] uppercase tracking-wider text-slate-500 mt-0.5">hari lagi</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                    <MapPin size={12} className="text-slate-500 shrink-0" /> {r.kota}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {r.jumlah_cabor} cabor · {r.atlet} atlet
                    {r.elite > 0 && <span className="text-amber-400"> · {r.elite} ELITE</span>}
                    {' · '}{tgl(r.mulai)}–{tgl(r.selesai)}
                  </div>
                </div>
                <div className="shrink-0 text-right hidden sm:block">
                  {r.contact_person
                    ? <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                        <UserCheck size={11} /> {r.contact_person}
                      </span>
                    : <span className="text-[10px] text-orange-400/80">belum ada penanggung jawab</span>}
                  {r.tanpa_foto > 0 && <div className="text-[10px] text-red-400">{r.tanpa_foto} tanpa foto</div>}
                </div>
                {terbuka ? <ChevronDown size={15} className="text-slate-600 shrink-0" />
                         : <ChevronRight size={15} className="text-slate-600 shrink-0" />}
              </button>

              {terbuka && (
                <div className="px-4 pb-3 pl-[86px] space-y-1">
                  {r.cabor.map(c => (
                    <div key={c.cabor} className="flex items-center gap-3 text-[12px] py-1">
                      <span className="text-slate-500 w-14 shrink-0">{tgl(c.mulai)}</span>
                      <span className="text-slate-200 flex-1 truncate">{c.cabor}</span>
                      <span className="text-slate-500 w-16 text-right shrink-0">{c.atlet} atlet</span>
                      {c.tanpa_foto > 0 && (
                        <span className="text-[10px] text-red-400 w-24 text-right shrink-0">
                          {c.tanpa_foto} tanpa foto
                        </span>
                      )}
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-600 pt-1.5">
                    Kota diambil dari kolom akomodasi bila ada; selebihnya dari kota tuan rumah.
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
