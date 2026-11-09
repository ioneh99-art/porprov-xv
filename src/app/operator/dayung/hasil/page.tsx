'use client'
// src/app/operator/dayung/hasil/page.tsx
// PODSI Jabar — Hasil resmi Dayung per laga: start list (heat/final), peringkat,
// catatan waktu, selisih dari pemenang, medali, dan awak perahu lengkap.
// Sumber: situs panitia (tabel dayung_jabar_laga + dayung_jabar_peserta).

import { useEffect, useMemo, useState } from 'react'
import { Timer, RefreshCw, ExternalLink, MapPin } from 'lucide-react'
import {
  muatJabar, labelDisiplin, tanggalPanjang, waktuDibaca, WARNA_DISIPLIN, WARNA_MEDALI, SITUS_PANITIA,
  type JabarData, type JabarLaga, type JabarPeserta,
} from '@/lib/sport-plugins/dayung/jabar-data'

const ACCENT = '#38bdf8'
const kartu = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

function selisih(p: JabarPeserta, terbaik: number | null) {
  if (p.waktu_detik == null || terbaik == null || p.waktu_detik === terbaik) return null
  return `+${(p.waktu_detik - terbaik).toFixed(2)}`
}

function KartuLaga({ l, peserta, sorot }: { l: JabarLaga; peserta: JabarPeserta[]; sorot: string }) {
  const urut = [...peserta].sort((a, b) => (a.peringkat ?? 99) - (b.peringkat ?? 99) || a.urutan - b.urutan)
  const terbaik = urut.find(p => p.waktu_detik != null)?.waktu_detik ?? null
  const d = labelDisiplin(l.disiplin)
  return (
    <div className="rounded-2xl p-4" style={kartu}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: `${WARNA_DISIPLIN[d] ?? '#64748b'}20`, color: WARNA_DISIPLIN[d] ?? '#94a3b8' }}>{d}</span>
            <span className="text-sm font-bold text-white">{l.nomor}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{l.jam ?? 'jam belum ditentukan'}</span>
            <span>· {l.babak}{l.kode ? ` (${l.kode})` : ''}</span>
            {l.perebutan_medali && <span style={{ color: WARNA_MEDALI.emas }}>· perebutan medali</span>}
            {l.venue && <span className="flex items-center gap-0.5"><MapPin size={10} />{l.venue}</span>}
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${l.selesai ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700/50 text-slate-400'}`}>{l.selesai ? 'Selesai' : 'Terjadwal'}</span>
      </div>
      {urut.length === 0 ? <div className="text-[11px] text-slate-600">Peserta belum ditentukan panitia.</div> : (
        <table className="w-full text-xs">
          <tbody>
            {urut.map(p => (
              <tr key={p.urutan} className={`border-t border-white/5 ${sorot && p.kontingen === sorot ? 'bg-sky-500/10' : ''}`}>
                <td className="py-1.5 w-7 font-black text-center" style={{ color: p.medali ? WARNA_MEDALI[p.medali] : '#64748b' }}>{p.peringkat ?? '·'}</td>
                <td className="pr-2">
                  <div className="text-slate-200 font-medium">{p.kontingen}</div>
                  <div className="text-[10px] text-slate-500">{p.atlet_nama.join(', ') || '—'}</div>
                </td>
                <td className="text-right font-mono tabular-nums text-sky-300 w-20">{p.waktu ?? ''}</td>
                <td className="text-right font-mono tabular-nums text-slate-500 w-16 text-[10px]">{selisih(p, terbaik) ?? ''}</td>
                <td className="text-right w-16">{p.medali && <span className="text-[10px] font-bold capitalize" style={{ color: WARNA_MEDALI[p.medali] }}>{p.medali}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <a href={`${SITUS_PANITIA}/laga/${l.ref}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[10px] text-sky-400/80 hover:underline mt-2">Lihat di situs panitia <ExternalLink size={10} /></a>
    </div>
  )
}

export default function DayungHasilPage() {
  const [data, setData] = useState<JabarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fDisiplin, setFDisiplin] = useState('')
  const [fStatus, setFStatus] = useState<'' | 'selesai' | 'terjadwal'>('')
  const [fBabak, setFBabak] = useState<'' | 'final'>('')
  const [sorot, setSorot] = useState('')

  const load = async () => { setLoading(true); setData(await muatJabar()); setLoading(false) }
  useEffect(() => { load() }, [])

  const g = useMemo(() => {
    const laga = data?.laga ?? [], peserta = data?.peserta ?? []
    const perLaga = new Map<number, JabarPeserta[]>()
    peserta.forEach(p => perLaga.set(p.laga_ref, [...(perLaga.get(p.laga_ref) ?? []), p]))
    const disiplin = Array.from(new Set(laga.map(l => labelDisiplin(l.disiplin)))).sort()
    const kontingen = Array.from(new Set(peserta.map(p => p.kontingen))).sort()
    const tersaring = laga.filter(l =>
      (!fDisiplin || labelDisiplin(l.disiplin) === fDisiplin) &&
      (!fStatus || (fStatus === 'selesai') === l.selesai) &&
      (!fBabak || l.perebutan_medali) &&
      (!sorot || (perLaga.get(l.ref) ?? []).some(p => p.kontingen === sorot)))
    const perTanggal = new Map<string, JabarLaga[]>()
    tersaring.forEach(l => { const k = l.tanggal ?? ''; perTanggal.set(k, [...(perTanggal.get(k) ?? []), l]) })
    return { perLaga, disiplin, kontingen, perTanggal: Array.from(perTanggal.entries()), total: tersaring.length }
  }, [data, fDisiplin, fStatus, fBabak, sorot])

  const pilih = 'px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-white/10 text-slate-200'
  return (
    <div className="text-zinc-300 min-h-screen" style={{ background: 'linear-gradient(150deg,#02060f,#04121f)', margin: '-1.75rem', padding: '1.75rem' }}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}40` }}><Timer size={20} style={{ color: ACCENT }} /></div>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">HASIL RESMI DAYUNG</h1>
            <div className="text-[11px] text-slate-500">Per laga: start list, peringkat, waktu, medali · sumber situs panitia · dibaca {waktuDibaca(data?.dibaca ?? null)}</div>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Muat ulang
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <select value={fDisiplin} onChange={e => setFDisiplin(e.target.value)} className={pilih}>
          <option value="">Semua disiplin</option>{g.disiplin.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value as any)} className={pilih}>
          <option value="">Selesai & terjadwal</option><option value="selesai">Selesai</option><option value="terjadwal">Terjadwal</option>
        </select>
        <select value={fBabak} onChange={e => setFBabak(e.target.value as any)} className={pilih}>
          <option value="">Semua babak</option><option value="final">Final (perebutan medali)</option>
        </select>
        <select value={sorot} onChange={e => setSorot(e.target.value)} className={pilih}>
          <option value="">Semua kontingen</option>{g.kontingen.map(k => <option key={k}>{k}</option>)}
        </select>
        <span className="text-[11px] text-slate-500 self-center">{g.total} laga</span>
      </div>

      {!loading && g.total === 0 && <div className="rounded-2xl p-6 text-sm text-slate-400" style={kartu}>Tidak ada laga yang cocok.</div>}

      {g.perTanggal.map(([tgl, laga]) => (
        <div key={tgl} className="mb-6">
          <h2 className="text-[11px] uppercase tracking-widest font-bold mb-2" style={{ color: ACCENT }}>{tanggalPanjang(tgl || null)} · {laga.length} laga</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {laga.map(l => <KartuLaga key={l.ref} l={l} peserta={g.perLaga.get(l.ref) ?? []} sorot={sorot} />)}
          </div>
        </div>
      ))}
      <div className="text-[10px] text-slate-600">Laga Slalom, Rowing, dan DBR muncul di sini setelah panitia memasukkannya ke situs resmi.</div>
    </div>
  )
}
