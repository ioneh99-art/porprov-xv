'use client'
// src/app/operator/dayung/klasemen/page.tsx
// PODSI Jabar — Klasemen medali Dayung per kontingen, menyegar sendiri tiap 10 detik
// (cocok untuk layar besar). Dua sumber:
//   Resmi  = medali di situs panitia.
//   Demo   = laga final yang diisi di Input Waktu (mode demo) memakai hasil isian itu;
//            laga lain tetap memakai hasil resmi.

import { useEffect, useMemo, useState } from 'react'
import { Trophy, Maximize2, FlaskConical, Clock } from 'lucide-react'
import { urutkanDemo, type Medali } from '@/lib/dayung-jabar'
import { muatJabar, muatDemo, klasemenKontingen, WARNA_MEDALI, type JabarData, type DemoWaktu, type JabarPeserta } from '@/lib/sport-plugins/dayung/jabar-data'

const ACCENT = '#38bdf8'
const kartu = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

export default function DayungKlasemenPage() {
  const [data, setData] = useState<JabarData | null>(null)
  const [demo, setDemo] = useState<DemoWaktu[]>([])
  const [mode, setMode] = useState<'resmi' | 'demo'>('resmi')
  const [jam, setJam] = useState('')

  const load = async () => {
    const [d, w] = await Promise.all([muatJabar(), muatDemo()])
    setData(d); setDemo(w); setJam(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  }
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t) }, [])
  useEffect(() => { if (demo.length > 0) setMode('demo') }, [demo.length > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  const s = useMemo(() => {
    const laga = data?.laga ?? [], peserta = data?.peserta ?? []
    const lagaDemo = new Set(demo.map(d => d.laga_ref))
    // Peserta gabungan: untuk laga final berisian demo, medali dari isian demo
    const gabung: JabarPeserta[] = peserta.map(p => {
      if (mode !== 'demo' || !lagaDemo.has(p.laga_ref)) return p
      const l = laga.find(x => x.ref === p.laga_ref)
      const isi = peserta.filter(x => x.laga_ref === p.laga_ref).map(x => {
        const d = demo.find(y => y.laga_ref === x.laga_ref && y.urutan === x.urutan)
        return { urutan: x.urutan, waktuDetik: d?.waktu_detik ?? null, status: d?.status ?? 'ok' as const }
      })
      const h = urutkanDemo(isi, !!l?.perebutan_medali).find(x => x.urutan === p.urutan)
      return { ...p, medali: (h?.medali ?? null) as Medali | null }
    })
    const klasemen = klasemenKontingen(gabung)
    const finalSelesai = laga.filter(l => l.perebutan_medali && (gabung.some(p => p.laga_ref === l.ref && p.medali)))
    const terbaru = [...demo].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
    const lagaTerbaru = terbaru ? laga.find(l => l.ref === terbaru.laga_ref) : null
    const totalFinal = new Set(laga.filter(l => l.perebutan_medali).map(l => l.nomor)).size
    return { klasemen, finalSelesai: finalSelesai.length, totalFinal, lagaDemo: lagaDemo.size, lagaTerbaru, terbaru }
  }, [data, demo, mode])

  const layarPenuh = () => document.documentElement.requestFullscreen?.()

  return (
    <div className="text-zinc-300 min-h-screen" style={{ background: 'linear-gradient(150deg,#02060f,#04121f)', margin: '-1.75rem', padding: '1.75rem' }}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${WARNA_MEDALI.emas}15`, border: `1px solid ${WARNA_MEDALI.emas}40` }}><Trophy size={22} style={{ color: WARNA_MEDALI.emas }} /></div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">KLASEMEN MEDALI DAYUNG</h1>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">PORPROV XV Jawa Barat 2026 · <Clock size={10} /> diperbarui {jam} · otomatis tiap 10 detik</div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-xl overflow-hidden border border-white/10 text-xs font-bold">
            <button onClick={() => setMode('resmi')} className={`px-3 py-2 ${mode === 'resmi' ? 'bg-sky-500/20 text-sky-200' : 'bg-white/5 text-slate-400'}`}>Resmi</button>
            <button onClick={() => setMode('demo')} className={`px-3 py-2 flex items-center gap-1 ${mode === 'demo' ? 'bg-amber-500/20 text-amber-200' : 'bg-white/5 text-slate-400'}`}><FlaskConical size={11} /> Demo{s.lagaDemo ? ` (${s.lagaDemo})` : ''}</button>
          </div>
          <button onClick={layarPenuh} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10"><Maximize2 size={12} /> Layar penuh</button>
        </div>
      </div>

      {mode === 'demo' && (
        <div className="rounded-xl px-4 py-2.5 mb-4 text-xs font-bold flex flex-wrap gap-x-3" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: '#fbbf24' }}>
          <span className="flex items-center gap-1.5"><FlaskConical size={14} /> MODE DEMO — {s.lagaDemo} laga memakai waktu isian demo, laga lain memakai hasil resmi.</span>
          {s.lagaTerbaru && <span className="text-amber-200/80 font-normal">Terakhir diisi: {s.lagaTerbaru.nomor} ({s.lagaTerbaru.babak}) oleh {s.terbaru?.diisi_oleh ?? '-'}</span>}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-5 max-w-xl">
        <div className="rounded-2xl p-3.5" style={kartu}><div className="text-[9px] uppercase tracking-wider text-slate-500">Kontingen bermedali</div><div className="text-2xl font-black text-white">{s.klasemen.length}</div></div>
        <div className="rounded-2xl p-3.5" style={kartu}><div className="text-[9px] uppercase tracking-wider text-slate-500">Final berhasil</div><div className="text-2xl font-black text-white">{s.finalSelesai}</div></div>
        <div className="rounded-2xl p-3.5" style={kartu}><div className="text-[9px] uppercase tracking-wider text-slate-500">Medali emas</div><div className="text-2xl font-black" style={{ color: WARNA_MEDALI.emas }}>{s.klasemen.reduce((a, r) => a + r.emas, 0)}</div></div>
      </div>

      <div className="rounded-2xl p-5" style={kartu}>
        {s.klasemen.length === 0 ? <div className="text-sm text-slate-500">Belum ada medali.</div> : (
          <table className="w-full">
            <thead><tr className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/10">
              <th className="text-left py-2 w-12">#</th><th className="text-left">Kontingen</th>
              <th className="text-center w-20" style={{ color: WARNA_MEDALI.emas }}>Emas</th>
              <th className="text-center w-20" style={{ color: WARNA_MEDALI.perak }}>Perak</th>
              <th className="text-center w-24" style={{ color: WARNA_MEDALI.perunggu }}>Perunggu</th>
              <th className="text-center w-20">Total</th>
            </tr></thead>
            <tbody>
              {s.klasemen.map((r, i) => (
                <tr key={r.kontingen} className="border-b border-white/5">
                  <td className="py-3 text-xl font-black" style={{ color: i < 3 ? [WARNA_MEDALI.emas, WARNA_MEDALI.perak, WARNA_MEDALI.perunggu][i] : '#475569' }}>{i + 1}</td>
                  <td className="text-lg font-bold text-white">{r.kontingen}</td>
                  <td className="text-center text-2xl font-black tabular-nums text-white">{r.emas}</td>
                  <td className="text-center text-2xl font-black tabular-nums text-white">{r.perak}</td>
                  <td className="text-center text-2xl font-black tabular-nums text-white">{r.perunggu}</td>
                  <td className="text-center text-xl tabular-nums text-slate-400">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
