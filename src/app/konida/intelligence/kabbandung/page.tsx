'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const KONTINGEN_ID = 4
const ACCENT = '#a78bfa'

interface AtletIntel {
  id: number
  nama_lengkap: string
  cabor_nama_raw: string
  tes_fisik_rating: string | null
  tes_fisik_persen: number | null
  tes_fisik_status: string | null
  is_locked: boolean | null
  data_quality_status: string | null
  no_ktp: string | null
}

type Tab = 'elite' | 'matrix' | 'backlog' | 'anomali'

const RATING_BAR: Record<string, { color: string; bg: string; label: string }> = {
  '⭐ ELITE':       { color: '#fcd34d', bg: 'rgba(251,191,36,0.15)',  label: 'ELITE'       },
  '✅ READY':       { color: '#34d399', bg: 'rgba(16,185,129,0.15)', label: 'READY'       },
  '🟡 NEEDS WORK':  { color: '#fbbf24', bg: 'rgba(245,158,11,0.15)', label: 'NEEDS WORK' },
  '🔴 SUB-PAR':     { color: '#fb923c', bg: 'rgba(249,115,22,0.15)', label: 'SUB-PAR'    },
  '🚨 KRITIS':      { color: '#fb7185', bg: 'rgba(244,63,94,0.15)',  label: 'KRITIS'     },
}

function ani(delay = 0) {
  return {
    style: {
      opacity: 1,
      transform: 'none',
      transition: `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`,
    },
  }
}

export default function IntelligenceKabBandung() {
  const [atlets,  setAtlets]  = useState<AtletIntel[]>([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<Tab>('elite')
  const [filterCabor, setFilterCabor] = useState('Semua')

  useEffect(() => {
    async function load() {
      let all: AtletIntel[] = []
      for (let p = 0; ; p++) {
        const { data } = await sb.from('atlet')
          .select('id,nama_lengkap,cabor_nama_raw,tes_fisik_rating,tes_fisik_persen,tes_fisik_status,is_locked,data_quality_status,no_ktp')
          .eq('kontingen_id', KONTINGEN_ID)
          .range(p * 1000, (p + 1) * 1000 - 1)
        if (!data || data.length === 0) break
        all = all.concat(data as AtletIntel[])
        if (data.length < 1000) break
      }
      setAtlets(all)
      setLoading(false)
    }
    void load()
  }, [])

  // ── Elite roster ─────────────────────────────────────────
  const eliteAtlets = useMemo(() =>
    atlets
      .filter(a => a.tes_fisik_rating === '⭐ ELITE')
      .sort((a, b) => (b.tes_fisik_persen || 0) - (a.tes_fisik_persen || 0))
  , [atlets])

  // ── Cabor map ────────────────────────────────────────────
  type CRow = { nama:string; total:number; tested:number; sumSkor:number; elite:number; ready:number; needs:number; subpar:number; kritis:number; tdk:number }
  const caborMap = useMemo(() => {
    const m: Record<string, CRow> = {}
    atlets.forEach(a => {
      const c = a.cabor_nama_raw || 'Lainnya'
      if (!m[c]) m[c] = { nama:c, total:0, tested:0, sumSkor:0, elite:0, ready:0, needs:0, subpar:0, kritis:0, tdk:0 }
      m[c].total++
      if (a.tes_fisik_persen != null) {
        m[c].tested++
        m[c].sumSkor += a.tes_fisik_persen
        if (a.tes_fisik_rating === '⭐ ELITE')         m[c].elite++
        else if (a.tes_fisik_rating === '✅ READY')     m[c].ready++
        else if (a.tes_fisik_rating === '🟡 NEEDS WORK') m[c].needs++
        else if (a.tes_fisik_rating === '🔴 SUB-PAR')   m[c].subpar++
        else if (a.tes_fisik_rating === '🚨 KRITIS')    m[c].kritis++
        else if (a.tes_fisik_rating === '⚠️ Tidak Hadir') m[c].tdk++
      }
    })
    return Object.values(m).sort((a, b) => b.total - a.total)
  }, [atlets])

  const caborNames = useMemo(() => ['Semua', ...caborMap.map(c => c.nama)], [caborMap])

  const eliteFiltered = useMemo(() =>
    filterCabor === 'Semua' ? eliteAtlets : eliteAtlets.filter(a => a.cabor_nama_raw === filterCabor)
  , [eliteAtlets, filterCabor])

  // ── Matrix sorted ────────────────────────────────────────
  const matrixSorted = useMemo(() =>
    [...caborMap]
      .filter(c => c.tested > 0)
      .sort((a, b) => (b.sumSkor / b.tested) - (a.sumSkor / a.tested))
  , [caborMap])

  // ── Backlog sorted ───────────────────────────────────────
  const backlogSorted = useMemo(() =>
    [...caborMap]
      .filter(c => c.total >= 5)
      .map(c => ({ ...c, belum: c.total - c.tested, coverage: Math.round(c.tested / c.total * 100) }))
      .sort((a, b) => b.belum - a.belum)
  , [caborMap])

  // ── Anomali ──────────────────────────────────────────────
  const anomali = useMemo(() =>
    atlets.filter(a => a.is_locked && a.tes_fisik_persen != null)
  , [atlets])

  const tabs: { id: Tab; label: string; count: string }[] = [
    { id:'elite',   label:'⭐ ELITE Roster',       count: `${eliteAtlets.length} atlet`     },
    { id:'matrix',  label:'📊 Performance Matrix',  count: `${matrixSorted.length} cabor`    },
    { id:'backlog', label:'⚡ Backlog Action',       count: `${backlogSorted.length} cabor`  },
    { id:'anomali', label:'🔬 Anomali',              count: `${anomali.length} terdeteksi`   },
  ]

  return (
    <div className="min-h-screen text-zinc-300 font-sans"
      style={{ background: 'linear-gradient(135deg,#06020f 0%,#0a0516 100%)' }}>

      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl border-b border-zinc-800/60 px-6 py-4"
        style={{ background: 'rgba(6,2,15,0.93)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/konida/dashboard/kabbandung"
              className="p-2 rounded-xl hover:bg-white/10 transition-colors text-zinc-500 hover:text-white">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-black text-white flex items-center gap-2">
                🎯 Strategic Intelligence
              </h1>
              <p className="text-[11px] font-mono mt-0.5 text-zinc-600">
                Insight Biomotorik + Data Quality · Kontingen Kab. Bandung
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              <span className="text-xs font-mono px-2 py-1 rounded-lg"
                style={{ background: 'rgba(167,139,250,0.1)', color: ACCENT, border: '1px solid rgba(167,139,250,0.2)' }}>
                {atlets.length} atlet
              </span>
            )}
            <button onClick={() => window.location.reload()}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors text-zinc-500">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh] text-zinc-600 text-sm">
          Memuat intelligence data…
        </div>
      ) : (
        <main className="max-w-6xl mx-auto px-6 py-6 space-y-5">

          {/* Summary strip */}
          <div {...ani(0)} className="grid grid-cols-6 gap-3">
            {[
              { emoji:'⭐', v: eliteAtlets.length,                                         l:'ELITE'          },
              { emoji:'✅', v: atlets.filter(a=>a.tes_fisik_rating==='✅ READY').length,   l:'READY'          },
              { emoji:'🟡', v: atlets.filter(a=>a.tes_fisik_rating==='🟡 NEEDS WORK').length, l:'NEEDS WORK' },
              { emoji:'🔴', v: atlets.filter(a=>a.tes_fisik_rating==='🔴 SUB-PAR').length, l:'SUB-PAR'       },
              { emoji:'🚨', v: atlets.filter(a=>a.tes_fisik_rating==='🚨 KRITIS').length,  l:'KRITIS'        },
              { emoji:'⏳', v: atlets.filter(a=>a.tes_fisik_persen==null).length,          l:'Belum Tes'     },
            ].map(s => (
              <div key={s.l} className="p-3 rounded-xl text-center"
                style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-base mb-0.5">{s.emoji}</div>
                <div className="text-xl font-black text-white">{s.v}</div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div {...ani(40)} className="flex gap-1 p-1 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: tab === t.id ? 'rgba(167,139,250,0.2)' : 'transparent',
                  color: tab === t.id ? ACCENT : 'rgba(255,255,255,0.35)',
                  border: tab === t.id ? '1px solid rgba(167,139,250,0.3)' : '1px solid transparent',
                }}>
                <span className="block">{t.label}</span>
                <span className="block text-[9px] opacity-60 mt-0.5">{t.count}</span>
              </button>
            ))}
          </div>

          {/* ── TAB: ELITE ROSTER ── */}
          {tab === 'elite' && (
            <div {...ani(60)}>
              <div className="flex items-center gap-3 mb-4">
                <select value={filterCabor} onChange={e => setFilterCabor(e.target.value)}
                  className="text-xs rounded-lg px-3 py-1.5 text-white outline-none"
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}>
                  {caborNames.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="text-xs text-zinc-600">{eliteFiltered.length} atlet ELITE</span>
              </div>
              <div className="space-y-2">
                {eliteFiltered.map((a, i) => (
                  <div key={a.id} className="flex items-center gap-4 p-3 rounded-xl"
                    style={{ background:'rgba(251,191,36,0.05)', border:'1px solid rgba(251,191,36,0.12)' }}>
                    <span className="text-zinc-600 font-mono text-xs w-7 text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{a.nama_lengkap}</p>
                      <p className="text-[11px] text-zinc-500">{a.cabor_nama_raw}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-amber-400">{a.tes_fisik_persen}%</p>
                      <p className="text-[9px] text-zinc-600 uppercase tracking-widest">⭐ ELITE</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: PERFORMANCE MATRIX ── */}
          {tab === 'matrix' && (
            <div {...ani(60)} className="space-y-2">
              <p className="text-xs text-zinc-600 mb-3">Diurutkan dari rata-rata skor tertinggi. Hanya cabor yang sudah ada tes fisiknya.</p>
              {matrixSorted.map((c, i) => {
                const avg = Math.round(c.sumSkor / c.tested)
                const bars = [
                  { key:'elite', v:c.elite, color:'#fcd34d', label:'ELITE' },
                  { key:'ready', v:c.ready, color:'#34d399', label:'READY' },
                  { key:'needs', v:c.needs, color:'#fbbf24', label:'NEEDS' },
                  { key:'subpar', v:c.subpar, color:'#fb923c', label:'SUB-PAR' },
                  { key:'kritis', v:c.kritis, color:'#fb7185', label:'KRITIS' },
                ]
                return (
                  <div key={c.nama} className="p-4 rounded-xl"
                    style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-zinc-600 font-mono text-xs w-5 shrink-0">{i + 1}</span>
                      <span className="text-white text-sm font-semibold flex-1 truncate">{c.nama}</span>
                      <span className="text-[10px] text-zinc-500">{c.tested}/{c.total} tested</span>
                      <span className="font-black text-base" style={{ color: avg >= 80 ? '#fcd34d' : avg >= 65 ? '#34d399' : avg >= 50 ? '#fbbf24' : '#fb7185' }}>
                        {avg}%
                      </span>
                    </div>
                    {/* Stacked bar */}
                    <div className="h-2 rounded-full overflow-hidden flex gap-px">
                      {bars.map(b => b.v > 0 && (
                        <div key={b.key} title={`${b.label}: ${b.v}`}
                          className="h-full" style={{ width:`${b.v / c.tested * 100}%`, background:b.color }} />
                      ))}
                      {c.tdk > 0 && (
                        <div title={`Tidak Hadir: ${c.tdk}`}
                          className="h-full" style={{ width:`${c.tdk / c.tested * 100}%`, background:'#52525b' }} />
                      )}
                    </div>
                    {/* Legend */}
                    <div className="flex gap-3 mt-1.5">
                      {bars.map(b => b.v > 0 && (
                        <span key={b.key} className="text-[9px]" style={{ color: b.color }}>
                          {b.label} {b.v}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── TAB: BACKLOG ACTION ── */}
          {tab === 'backlog' && (
            <div {...ani(60)}>
              <p className="text-xs text-zinc-600 mb-4">Cabor dengan jumlah atlet ≥5, diurutkan dari yang paling banyak belum tes fisik.</p>
              <div className="space-y-2">
                {backlogSorted.map(c => (
                  <div key={c.nama} className="p-4 rounded-xl"
                    style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${c.coverage < 20 ? 'rgba(244,63,94,0.25)' : c.coverage < 50 ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: c.coverage === 0 ? 'rgba(244,63,94,0.2)' : c.coverage < 20 ? 'rgba(244,63,94,0.15)' : c.coverage < 50 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                          color:      c.coverage === 0 ? '#fb7185'              : c.coverage < 20 ? '#f87171'              : c.coverage < 50 ? '#fbbf24'              : '#34d399',
                        }}>
                        {c.coverage === 0 ? '🔴 0%' : `${c.coverage}%`}
                      </span>
                      <span className="text-white text-sm font-semibold flex-1">{c.nama}</span>
                      <span className="text-xs text-zinc-500">{c.belum} belum / {c.total} total</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{
                        width: `${c.coverage}%`,
                        background: c.coverage < 20 ? '#f87171' : c.coverage < 50 ? '#fbbf24' : '#34d399',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: ANOMALI ── */}
          {tab === 'anomali' && (
            <div {...ani(60)}>
              <div className="p-4 rounded-xl mb-4"
                style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-xs text-amber-300 font-semibold mb-1">Definisi Anomali</p>
                <p className="text-xs text-amber-500/80">
                  Atlet yang sudah mengikuti tes fisik (ada skor) namun data identitas dikunci karena NIK invalid.
                  Perlu verifikasi KTP/Akta Kelahiran ke KONI sebelum data bisa diproses resmi.
                </p>
              </div>
              {anomali.length === 0 ? (
                <div className="text-center text-zinc-600 text-sm py-12">
                  Tidak ada anomali terdeteksi ✓
                </div>
              ) : (
                <div className="space-y-2">
                  {anomali.map(a => (
                    <div key={a.id} className="p-4 rounded-xl"
                      style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(245,158,11,0.25)' }}>
                      <div className="flex items-start gap-4">
                        <span className="text-2xl">🔬</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">{a.nama_lengkap}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{a.cabor_nama_raw}</p>
                          {a.no_ktp && <p className="text-[11px] text-zinc-600 font-mono mt-1">NIK: {a.no_ktp}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-black text-amber-400">{a.tes_fisik_persen}%</p>
                          <p className="text-[10px] text-amber-500">{a.tes_fisik_rating}</p>
                          <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded font-bold"
                            style={{ background:'rgba(239,68,68,0.15)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.3)' }}>
                            🔐 NIK LOCKED
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      )}
    </div>
  )
}
