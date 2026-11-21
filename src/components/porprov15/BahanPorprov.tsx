'use client'
// src/components/porprov15/BahanPorprov.tsx — tab "Bahan PORPROV berikutnya" di Rapor Kontingen:
// beban jadwal per hari, kalender hari × cabor, venue terpadat, dan nomor sepi peserta.
// Data /api/porprov15/bahan (gudang arsip situs panitia).

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, MapPin, Users } from 'lucide-react'
import { BATAS_SEPI, BATAS_TIPIS, type BahanPorprov as Data } from '@/lib/bahan-porprov'

const kartu = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const pilih = 'px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-white/10 text-slate-200'
const WARNA = { emas: '#F5C518', perak: '#cbd5e1', perunggu: '#d97706' } as Record<string, string>
const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const tgl = (s: string) => { const d = new Date(s + 'T00:00:00'); return `${HARI[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}` }
const tglPanjang = (s: string | null) => (s ? new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }) : '—')

export default function BahanPorprov({ namaKontingen, namaCabor, sorotSitusId, aksen }: {
  namaKontingen: Map<number, string>; namaCabor: Map<number, string>; sorotSitusId: number | null; aksen: string
}) {
  const [data, setData] = useState<Data | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [fSepi, setFSepi] = useState<'sepi' | 'tipis'>('sepi')
  const [fCabor, setFCabor] = useState('')
  const [semuaVenue, setSemuaVenue] = useState(false)

  useEffect(() => {
    fetch('/api/porprov15/bahan', { cache: 'no-store' }).then(async r => {
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Gagal memuat.')
      setData(j)
    }).catch(e => setGalat(e.message))
  }, [])

  const g = useMemo(() => {
    if (!data) return null
    const maksLaga = Math.max(1, ...data.hari.map(h => h.laga))
    const maksMedali = Math.max(1, ...data.hari.map(h => h.perebutanMedali))
    const puncak = [...data.hari].sort((a, b) => b.laga - a.laga)[0]
    const puncakMedali = [...data.hari].sort((a, b) => b.perebutanMedali - a.perebutanMedali)[0]
    // Kalender: cabor diurut dari tanggal mulai, lalu jumlah laga
    const caborKal = new Map<number, { mulai: string; total: number }>()
    data.hari.forEach(h => Object.entries(data.kalender[h.tanggal] ?? {}).forEach(([c, n]) => {
      const x = caborKal.get(Number(c)) ?? { mulai: h.tanggal, total: 0 }
      x.total += n; caborKal.set(Number(c), x)
    }))
    const urutCabor = Array.from(caborKal.entries()).sort((a, b) => a[1].mulai.localeCompare(b[1].mulai) || b[1].total - a[1].total).map(([c]) => c)
    const maksSel = Math.max(1, ...Object.values(data.kalender).flatMap(k => Object.values(k)))
    const caborSepi = Array.from(new Set(data.nomorSepi.map(n => n.caborSitusId).filter((x): x is number => x != null)))
      .map(c => [c, namaCabor.get(c) ?? `Cabor ${c}`] as const).sort((a, b) => a[1].localeCompare(b[1]))
    const nomor = data.nomorSepi.filter(n => (fSepi === 'sepi' ? n.peserta <= BATAS_SEPI : n.peserta > BATAS_SEPI) && (!fCabor || String(n.caborSitusId) === fCabor))
    const maksSepi = Math.max(1, ...data.sepiPerKontingen.map(s => s.medaliSepi))
    return { maksLaga, maksMedali, puncak, puncakMedali, urutCabor, caborKal, maksSel, caborSepi, nomor, maksSepi }
  }, [data, fSepi, fCabor, namaCabor])

  if (galat) return <div className="rounded-2xl p-6 text-sm text-red-300" style={kartu}>{galat}</div>
  if (!data || !g) return <div className="rounded-2xl p-6 text-sm text-slate-400" style={kartu}>Menghitung jadwal, venue, dan peserta nomor…</div>

  const r = data.ringkas
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {([
          ['Masa pertandingan', `${r.hari} hari`, `${tglPanjang(r.mulai)} – ${tglPanjang(r.selesai)}`],
          ['Laga dimainkan', r.laga.toLocaleString('id-ID'), `${r.dibatalkan} laga dibatalkan`],
          ['Venue dipakai', String(r.venue), g.puncak ? `hari terpadat ${tgl(g.puncak.tanggal)}: ${g.puncak.venue} venue` : ''],
          ['Nomor sepi peserta', String(r.nomorSepi), `≤ ${BATAS_SEPI} peserta · ${r.nomorTipis} nomor lagi ${BATAS_SEPI + 1}–${BATAS_TIPIS} peserta`],
        ] as const).map(([l, v, s]) => (
          <div key={l} className="rounded-xl px-3 py-2.5" style={kartu}>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{l}</div>
            <div className="text-lg font-black text-white tabular-nums">{v}</div>
            <div className="text-[10px] text-slate-500">{s}</div>
          </div>
        ))}
      </div>

      {/* Beban per hari */}
      <div className="rounded-2xl p-4" style={kartu}>
        <div className="flex items-center gap-2 mb-1"><CalendarDays size={15} style={{ color: aksen }} /><span className="text-sm font-bold text-white">Beban jadwal per hari</span></div>
        <div className="text-[11px] text-slate-500 mb-3">
          Batang = jumlah laga; titik emas = laga perebutan medali. Hari terpadat <b className="text-slate-300">{g.puncak && tgl(g.puncak.tanggal)}</b> ({g.puncak?.laga.toLocaleString('id-ID')} laga),
          perebutan medali terbanyak <b className="text-slate-300">{g.puncakMedali && tgl(g.puncakMedali.tanggal)}</b> ({g.puncakMedali?.perebutanMedali} laga) — beban panitia, wasit, dan venue tertinggi.
        </div>
        <div className="overflow-x-auto">
          <div className="flex items-end gap-1 h-44 min-w-[640px]">
            {data.hari.map(h => (
              <div key={h.tanggal} className="flex-1 flex flex-col items-center justify-end h-full group relative" title={`${tgl(h.tanggal)} · ${h.laga} laga · ${h.perebutanMedali} perebutan medali · ${h.cabor} cabor · ${h.venue} venue${h.dibatalkan ? ` · ${h.dibatalkan} batal` : ''}`}>
                <div className="text-[9px] tabular-nums text-slate-500 mb-0.5">{h.laga}</div>
                <div className="w-full rounded-t relative" style={{ height: `${(h.laga / g.maksLaga) * 100}%`, background: h === g.puncak ? aksen : `${aksen}80`, minHeight: 2 }}>
                  {h.perebutanMedali > 0 && <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full" style={{ bottom: `${(h.perebutanMedali / g.maksLaga) * 100}%`, background: WARNA.emas, boxShadow: '0 0 0 2px rgba(0,0,0,.4)' }} />}
                </div>
                <div className="text-[9px] text-slate-500 mt-1 whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{tgl(h.tanggal)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs min-w-[560px]">
            <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 text-left"><th className="py-1.5">Tanggal</th><th className="text-right">Laga</th><th className="text-right">Perebutan medali</th><th className="text-right">Cabor</th><th className="text-right">Venue</th><th className="text-right">Dibatalkan</th></tr></thead>
            <tbody>
              {data.hari.map(h => (
                <tr key={h.tanggal} className="border-t border-white/5" style={h === g.puncak ? { background: `${aksen}12` } : {}}>
                  <td className="py-1.5 text-slate-200">{tgl(h.tanggal)}</td>
                  <td className="text-right tabular-nums text-slate-200">{h.laga.toLocaleString('id-ID')}</td>
                  <td className="text-right tabular-nums" style={{ color: WARNA.emas }}>{h.perebutanMedali}</td>
                  <td className="text-right tabular-nums text-slate-400">{h.cabor}</td>
                  <td className="text-right tabular-nums text-slate-400">{h.venue}</td>
                  <td className="text-right tabular-nums text-slate-500">{h.dibatalkan || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kalender hari × cabor */}
      <div className="rounded-2xl p-4" style={kartu}>
        <div className="text-sm font-bold text-white mb-1">Kalender cabor</div>
        <div className="text-[11px] text-slate-500 mb-3">Baris = cabor (diurut dari tanggal mulai), kolom = hari. Makin terang makin banyak laga hari itu — terlihat cabor yang menumpuk di hari yang sama.</div>
        <div className="overflow-auto max-h-[70vh]">
          <table className="text-[10px] border-separate" style={{ borderSpacing: 2 }}>
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 bg-slate-950 min-w-[140px]" />
                {data.hari.map(h => <th key={h.tanggal} className="sticky top-0 z-10 bg-slate-950 font-medium text-slate-400 px-0.5 whitespace-nowrap">{tgl(h.tanggal).split(' ')[1]}</th>)}
              </tr>
            </thead>
            <tbody>
              {g.urutCabor.map(c => (
                <tr key={c}>
                  <td className="sticky left-0 z-10 bg-slate-950 pr-2 whitespace-nowrap text-slate-200">{namaCabor.get(c) ?? `Cabor ${c}`}</td>
                  {data.hari.map(h => {
                    const n = data.kalender[h.tanggal]?.[c] ?? 0
                    const t = n / g.maksSel
                    return <td key={h.tanggal} className="w-7 h-5 text-center rounded tabular-nums" title={`${namaCabor.get(c)} · ${tgl(h.tanggal)} · ${n} laga`}
                      style={{ background: n ? `rgba(56,189,248,${0.18 + 0.82 * Math.sqrt(t)})` : 'rgba(255,255,255,0.03)', color: t > 0.3 ? '#0f172a' : '#cbd5e1' }}>{n || ''}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Venue */}
      <div className="rounded-2xl p-4 overflow-x-auto" style={kartu}>
        <div className="flex items-center gap-2 mb-1"><MapPin size={15} style={{ color: aksen }} /><span className="text-sm font-bold text-white">Venue terpadat</span></div>
        <div className="text-[11px] text-slate-500 mb-3">Jumlah laga, hari terpakai, dan puncak laga dalam sehari. Puncak tinggi = antrean pertandingan panjang di satu tempat.</div>
        <table className="w-full text-xs min-w-[640px]">
          <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 text-left"><th className="py-1.5">Venue</th><th>Klaster</th><th className="text-right">Laga</th><th className="text-right">Hari</th><th className="text-right">Puncak/hari</th><th className="pl-4">Cabor</th></tr></thead>
          <tbody>
            {(semuaVenue ? data.venue : data.venue.slice(0, 15)).map(v => (
              <tr key={v.nama} className="border-t border-white/5">
                <td className="py-1.5 text-slate-200">{v.nama}</td>
                <td className="text-slate-500">{v.klaster ?? '—'}</td>
                <td className="text-right tabular-nums text-slate-200">{v.laga.toLocaleString('id-ID')}</td>
                <td className="text-right tabular-nums text-slate-400">{v.hari}</td>
                <td className="text-right tabular-nums text-slate-300">{v.puncak ? <>{v.puncak.laga} <span className="text-slate-500 text-[10px]">({tgl(v.puncak.tanggal)})</span></> : '—'}</td>
                <td className="pl-4 text-slate-400">{v.cabor.map(c => namaCabor.get(c) ?? c).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.venue.length > 15 && <button onClick={() => setSemuaVenue(v => !v)} className="mt-2 text-[11px] underline text-slate-400">{semuaVenue ? 'Tampilkan 15 teratas' : `Tampilkan semua ${data.venue.length} venue`}</button>}
      </div>

      {/* Nomor sepi */}
      <div className="rounded-2xl p-4" style={kartu}>
        <div className="flex items-center gap-2 mb-1"><Users size={15} style={{ color: aksen }} /><span className="text-sm font-bold text-white">Nomor sepi peserta</span></div>
        <div className="text-[11px] text-slate-500 mb-3">
          Nomor dengan {BATAS_SEPI} peserta atau kurang: setiap peserta pasti naik podium. Bahan menilai kelayakan nomor dipertandingkan,
          dan seberapa besar medali tiap kontingen berasal dari nomor seperti ini.
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Medali dari nomor ≤ {BATAS_SEPI} peserta, per kontingen</div>
            <div className="space-y-1">
              {data.sepiPerKontingen.map(s => (
                <div key={s.kontingenSitusId} className="flex items-center gap-2 text-xs" style={s.kontingenSitusId === sorotSitusId ? { color: aksen } : {}}>
                  <div className="w-24 sm:w-36 shrink-0 truncate text-slate-200" style={s.kontingenSitusId === sorotSitusId ? { color: aksen, fontWeight: 700 } : {}}>{namaKontingen.get(s.kontingenSitusId) ?? s.kontingenSitusId}</div>
                  <div className="flex-1 min-w-[24px] h-2 rounded-full bg-white/5"><div className="h-2 rounded-full" style={{ width: `${(s.medaliSepi / g.maksSepi) * 100}%`, background: aksen }} /></div>
                  <div className="shrink-0 text-right tabular-nums text-slate-400 text-[10px] sm:text-xs whitespace-nowrap">{s.medaliSepi} medali <span style={{ color: WARNA.emas }}>({s.emasSepi} emas)</span> · {Math.round((s.medaliSepi / s.medaliTotal) * 100)}%</div>
                </div>
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 mb-2">
              <select value={fSepi} onChange={e => setFSepi(e.target.value as any)} className={pilih}>
                <option value="sepi">≤ {BATAS_SEPI} peserta ({r.nomorSepi})</option>
                <option value="tipis">{BATAS_SEPI + 1}–{BATAS_TIPIS} peserta ({r.nomorTipis})</option>
              </select>
              <select value={fCabor} onChange={e => setFCabor(e.target.value)} className={pilih}>
                <option value="">Semua cabor</option>{g.caborSepi.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
              </select>
              <span className="text-[11px] text-slate-500 self-center">{g.nomor.length} nomor</span>
            </div>
            <div className="max-h-[420px] overflow-y-auto space-y-1 pr-1">
              {g.nomor.map(n => (
                <div key={n.situsId} className="rounded-lg px-2.5 py-1.5 bg-white/[0.02] border border-white/5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-200 truncate">{namaCabor.get(n.caborSitusId ?? -1) ?? ''} · {n.nama}</span>
                    <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-slate-300">{n.peserta} peserta</span>
                  </div>
                  <div className="flex flex-wrap gap-x-2 text-[10px] mt-0.5">
                    {n.medali.map((m, i) => (
                      <span key={i} style={{ color: m.kontingenSitusId === sorotSitusId ? aksen : WARNA[m.medali] }}>
                        {m.medali === 'emas' ? '●' : m.medali === 'perak' ? '◐' : '○'} {namaKontingen.get(m.kontingenSitusId ?? -1) ?? '—'}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
