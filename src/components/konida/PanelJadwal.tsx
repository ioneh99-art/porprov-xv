'use client'
// src/components/konida/PanelJadwal.tsx
// Hitung mundur per cabor, bukan satu hitung mundur untuk semua.
//
// Sebelum ini seluruh persiapan bersandar pada satu tanggal: pembukaan
// 7 November. Padahal pertandingan pertama 28 Oktober, dan ada belasan cabor
// yang sudah turun sebelum PORPROV resmi dibuka. Panel ini menaruh yang
// paling dekat di paling atas, lengkap dengan berapa atletnya yang berkasnya
// belum siap — supaya urutan mengerjakan tidak lagi ditebak.

import { useState, useEffect } from 'react'
import { CalendarClock, Loader2, MapPin, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { ambilBersama } from '@/lib/ambil-bersama'

interface Kontak {
  cabor_disiplin: string; td_nama: string | null; td_hp: string | null
  ketua_nama: string | null; ketua_hp: string | null
}
interface Cabor {
  cabor: string; jumlah_nomor: number; mulai: string | null; selesai: string | null
  tuan_rumah: string | null; venue: string | null; hari_lagi: number | null
  atlet: number; tanpa_foto: number; elite: number; kontak: Kontak[]
}

const tgl = (s: string | null) => {
  if (!s) return '—'
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

/** Warna dari kedekatan hari — makin dekat makin panas. */
function rupa(h: number | null) {
  if (h == null)  return { warna: '#64748b', latar: 'rgba(100,116,139,0.10)' }
  if (h < 0)      return { warna: '#64748b', latar: 'rgba(100,116,139,0.10)' }
  if (h <= 30)    return { warna: '#ef4444', latar: 'rgba(239,68,68,0.10)' }
  if (h <= 55)    return { warna: '#f97316', latar: 'rgba(249,115,22,0.09)' }
  return { warna: '#38bdf8', latar: 'rgba(56,189,248,0.07)' }
}

export default function PanelJadwal({ accent = '#38bdf8' }: { accent?: string }) {
  const [d, setD] = useState<any>(null)
  const [sibuk, setSibuk] = useState(true)
  const [semua, setSemua] = useState(false)
  const [rinci, setRinci] = useState<string | null>(null)

  useEffect(() => {
    let hidup = true
    ambilBersama('/api/konida/jadwal')
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
  if (!d?.cabor?.length) return null

  const cabor: Cabor[] = d.cabor
  const tampil = semua ? cabor : cabor.slice(0, 8)
  const buka   = d.upacara?.find((u: any) => /PEMBUKAAN/i.test(u.nama))
  const tutup  = d.upacara?.find((u: any) => /PENUTUPAN/i.test(u.nama))
  const dini   = d.sebelum_pembukaan ?? []

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.07] flex flex-wrap items-center gap-4">
        <CalendarClock size={18} style={{ color: accent }} className="shrink-0" />
        <div className="min-w-0">
          <h3 className="text-white font-bold text-sm">Hitung Mundur per Cabor</h3>
          <p className="text-[11px] text-slate-500">
            {cabor.length} cabor terjadwal · jadwal resmi panitia PORPROV XV
          </p>
        </div>
        <div className="ml-auto flex items-center gap-5 shrink-0">
          <Angka label="Pertandingan pertama" nilai={d.hari_ke_pertandingan_pertama} sub={tgl(d.pertandingan_pertama)} warna="#ef4444" />
          {buka  && <Angka label="Pembukaan" nilai={buka.hari_lagi}  sub={tgl(buka.tanggal)}  warna="#f97316" />}
          {tutup && <Angka label="Penutupan" nilai={tutup.hari_lagi} sub={tgl(tutup.tanggal)} warna="#38bdf8" />}
        </div>
      </div>

      {dini.length > 0 && (
        <div className="px-5 py-3 flex gap-2.5 border-b border-white/[0.06]"
          style={{ background: 'rgba(239,68,68,0.07)' }}>
          <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-[12px] text-slate-300 leading-relaxed">
            <b className="text-red-400">{dini.length} cabor bertanding SEBELUM upacara pembukaan</b> —
            yang paling awal {tgl(dini[0].mulai)}. Kalau persiapan dipatok ke tanggal pembukaan,
            cabor-cabor ini ketinggalan.
          </p>
        </div>
      )}

      <div className="divide-y divide-white/[0.05]">
        {tampil.map(c => {
          const r = rupa(c.hari_lagi)
          return (
            <div key={c.cabor}>
            <button onClick={() => setRinci(rinci === c.cabor ? null : c.cabor)}
              className="w-full px-4 py-2.5 flex items-center gap-3.5 text-left hover:bg-white/[0.03] transition-colors">
              <div className="shrink-0 text-center rounded-lg px-2.5 py-1.5" style={{ background: r.latar, minWidth: 62 }}>
                <div className="text-lg font-black leading-none" style={{ color: r.warna }}>
                  {c.hari_lagi != null && c.hari_lagi >= 0 ? c.hari_lagi : '—'}
                </div>
                <div className="text-[8px] uppercase tracking-wider text-slate-500 mt-0.5">hari lagi</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate">
                  {c.cabor}
                  {c.jumlah_nomor > 1 && <span className="text-slate-500 font-normal"> · {c.jumlah_nomor} nomor</span>}
                </div>
                <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                  {tgl(c.mulai)}–{tgl(c.selesai)}
                  <MapPin size={10} className="shrink-0 ml-1" /> {c.tuan_rumah}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[11px] text-slate-400">{c.atlet} atlet</div>
                {c.tanpa_foto > 0 && (
                  <div className="text-[10px] text-red-400">{c.tanpa_foto} tanpa foto</div>
                )}
              </div>
              {rinci === c.cabor ? <ChevronDown size={14} className="text-slate-600 shrink-0" />
                                : <ChevronRight size={14} className="text-slate-600 shrink-0" />}
            </button>
            {rinci === c.cabor && (
              <div className="px-4 pb-3 pl-[78px] space-y-1.5">
                <div className="text-[11px] text-slate-500">
                  <span className="text-slate-600">Venue: </span>{c.venue || '—'}
                </div>
                {c.kontak?.length > 0 ? c.kontak.map((k, i) => (
                  <div key={i} className="text-[11px] text-slate-400 flex flex-wrap gap-x-3">
                    <span className="text-slate-600">{k.cabor_disiplin}</span>
                    {k.td_nama   && <span>TD: <b className="text-slate-300">{k.td_nama}</b> {k.td_hp}</span>}
                    {k.ketua_nama && <span>Panpel: <b className="text-slate-300">{k.ketua_nama}</b> {k.ketua_hp}</span>}
                  </div>
                )) : (
                  <div className="text-[11px] text-slate-600">
                    Kontak panitia cabor ini belum ada di daftar panitia provinsi.
                  </div>
                )}
              </div>
            )}
            </div>
          )
        })}
      </div>

      {cabor.length > 8 && (
        <div className="px-4 py-2.5 border-t border-white/[0.06]">
          <button onClick={() => setSemua(v => !v)}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/[0.06] text-slate-400 inline-flex items-center gap-1">
            {semua ? <>Ringkas <ChevronDown size={12} /></> : <>Lihat semua {cabor.length} cabor <ChevronRight size={12} /></>}
          </button>
        </div>
      )}
    </div>
  )
}

function Angka({ label, nilai, sub, warna }: {
  label: string; nilai: number | null; sub: string; warna: string
}) {
  return (
    <div className="text-center">
      <div className="text-2xl font-black leading-none" style={{ color: warna }}>
        {nilai != null && nilai >= 0 ? nilai : '—'}
      </div>
      <div className="text-[9px] uppercase tracking-wider text-slate-500 mt-1">{label}</div>
      <div className="text-[9px] text-slate-600">{sub}</div>
    </div>
  )
}
