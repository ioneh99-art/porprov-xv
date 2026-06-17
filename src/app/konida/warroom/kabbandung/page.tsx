'use client'
// src/app/konida/warroom/kabbandung/page.tsx — v3 STRATEGIC INTELLIGENCE
// Layer:
//  1. Header + KPI Strip + Alert Laga Aktif
//  2. Peta Kompetitor + Top 5 Klasemen (side-by-side, dari Dashboard)
//  3. Target Realisasi + Medal Prediction (combined)
//  4. Strategic Actions (catch-up plan)
//  5. Jadwal Berikutnya

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Monitor, Clock, Target, TrendingUp,
  RefreshCw, Zap, MapPin, Crown,
} from 'lucide-react'
import PetaKompetitor from '@/components/PetaKompetitor'
import {
  StrategicActionsCard,
  generateStrategicActions,
} from '@/components/konida/WarRoomHelpers'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ACCENT = '#38bdf8'

// Referensi historis POPDA XIV Jawa Barat 2025 (simaung.jabarprov.go.id · 24 Sep 2025)
// Kab. Bandung meraih peringkat #2 dari 27 kontingen
const POPDA_REF = { rank:2, emas:23, perak:10, perunggu:14, total:47 }

// TODO: isi data laga aktif dari DB saat PORPROV mulai (7 Nov 2026)
const LAGA_LIVE: {cabor:string;laga:string;venue:string;status:string}[] = []

function LiveClock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
    setT(fmt())
    const i = setInterval(() => setT(fmt()), 1000)
    return () => clearInterval(i)
  }, [])
  return <span className="tabular-nums font-mono font-bold tracking-wider" style={{color:ACCENT}}>{t}</span>
}

export default function PageWarRoom() {
  const [klasemen, setKlasemen] = useState<any[]>([])
  const [summary,  setSummary]  = useState({ total:0, verified:0, emas:0, perak:0, perunggu:0, total_medali:0 })
  const [loading,  setLoading]  = useState(true)
  const [animIn,   setAnimIn]   = useState(false)
  const [pulse,    setPulse]    = useState(true)

  const [tesFisikSum, setTesFisikSum] = useState({topAtlet:0, lowAtlet:0, weakCabors:0})

  useEffect(() => { const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])
  useEffect(() => { const i=setInterval(()=>setPulse(p=>!p),800); return()=>clearInterval(i) },[])

  useEffect(() => {
    async function load() {
      try {
        const [k, m, a, tf] = await Promise.allSettled([
          sb.from('klasemen_medali')
            .select('emas,perak,perunggu,total,kontingen(nama)')
            .order('emas',  { ascending:false })
            .order('perak', { ascending:false })
            .limit(27),
          sb.from('klasemen_medali')
            .select('emas,perak,perunggu,total')
            .eq('kontingen_id', 4)
            .maybeSingle(),
          (async () => {
            let all: any[] = []
            for (let p = 0; ; p++) {
              const { data, error } = await sb.from('atlet').select('status_registrasi,status_verifikasi,cabor_nama_raw').eq('kontingen_id', 4).range(p * 1000, (p + 1) * 1000 - 1)
              if (error) return { data: null, error }
              if (!data || data.length === 0) break
              all = all.concat(data)
              if (data.length < 1000) break
            }
            return { data: all, error: null }
          })(),
          sb.from('atlet_tes_fisik')
            .select('kesimpulan_persen,status_tes,cabor_nama,atlet_id')
            .eq('kontingen_id', 4).eq('tahap', 3),
        ])

        if (k.status==='fulfilled' && k.value.data) {
          const raw = k.value.data as any[]
          setKlasemen(raw.map(r => ({
            nama:     (r.kontingen as any)?.nama ?? '-',
            emas:     r.emas    ?? 0,
            perak:    r.perak   ?? 0,
            perunggu: r.perunggu ?? 0,
            total:    r.total   ?? 0,
          })))
        }

        if (m.status==='fulfilled' && m.value.data) {
          const d = m.value.data
          setSummary(prev => ({
            ...prev,
            emas:         d.emas        ?? 0,
            perak:        d.perak       ?? 0,
            perunggu:     d.perunggu    ?? 0,
            total_medali: d.total       ?? 0,
          }))
        }

        if (a.status==='fulfilled' && a.value.data) {
          const atlets = a.value.data as any[]
          setSummary(prev => ({
            ...prev,
            total:    atlets.length,
            verified: atlets.filter(x => x.status_registrasi==='Verified' || x.status_registrasi==='Posted').length,
          }))

          const caborAtletMap: Record<string, number> = {}
          atlets.forEach(x => {
            const c = x.cabor_nama_raw || 'Lainnya'
            caborAtletMap[c] = (caborAtletMap[c] || 0) + 1
          })

          if (tf.status==='fulfilled' && tf.value.data) {
            const tfData = tf.value.data
            const valid = tfData.filter((t:any) => t.status_tes === 'Hadir' && t.kesimpulan_persen != null)

            const caborFitnessMap: Record<string,{sum:number;n:number}> = {}
            valid.forEach((t:any) => {
              const c = t.cabor_nama || 'Unknown'
              if (!caborFitnessMap[c]) caborFitnessMap[c] = {sum:0,n:0}
              caborFitnessMap[c].sum += t.kesimpulan_persen
              caborFitnessMap[c].n++
            })

            setTesFisikSum({
              topAtlet:   valid.filter((t:any) => t.kesimpulan_persen >= 80).length,
              lowAtlet:   valid.filter((t:any) => t.kesimpulan_persen < 40).length,
              weakCabors: Object.values(caborFitnessMap).filter(c => c.n>=2 && c.sum/c.n < 55).length,
            })
          }
        }
      } catch (e) {
        console.error('[WarRoom load error]', e)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const myRank = klasemen.findIndex(k =>
    String(k.nama ?? '').toUpperCase() === 'KAB. BANDUNG'
  ) + 1

  // TODO: isi target medali resmi dari Bupati Kab. Bandung
  const TARGET = { emas: 0, perak: 0, perunggu: 0 }

  const ani = (d=0) => ({
    style:     { transitionDelay:`${d}ms`, transition:'all 0.8s cubic-bezier(0.16,1,0.3,1)' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#020a14]">
      <div className="text-center">
        <div className="w-12 h-12 border-2 rounded-full animate-spin mx-auto mb-4"
          style={{ borderColor:`${ACCENT}25`, borderTopColor:ACCENT }}/>
        <p className="font-mono text-xs uppercase tracking-widest" style={{ color:ACCENT }}>Memuat War Room...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen text-zinc-300 font-sans" style={{ background:'linear-gradient(145deg, #02060f 0%, #04121f 100%)' }}>

      <div className="fixed inset-0 pointer-events-none opacity-30 mix-blend-overlay" style={{ zIndex:0,
        backgroundImage:`linear-gradient(${ACCENT}06 1px,transparent 1px),linear-gradient(90deg,${ACCENT}06 1px,transparent 1px)`,
        backgroundSize:'60px 60px' }}/>

      {/* ═════════ HEADER ═════════ */}
      <header className="sticky top-0 z-40 px-6 py-4 backdrop-blur-xl border-b shadow-lg"
        style={{ background:'rgba(2,10,20,0.85)', borderColor:`${ACCENT}15` }}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background:`${ACCENT}15`, border:`1px solid ${ACCENT}40` }}>
              <Monitor size={18} style={{color:ACCENT}}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-3 flex-wrap">
                WAR ROOM — KAB. BANDUNG
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                  <div className={`w-1.5 h-1.5 rounded-full bg-red-400 transition-opacity ${pulse?'opacity-100':'opacity-30'}`}/>
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">LIVE · {LAGA_LIVE.length} Laga</span>
                </span>
              </h1>
              <p className="text-[11px] font-mono uppercase tracking-widest mt-1" style={{ color:`${ACCENT}90` }}>
                Strategic Intelligence · PORPROV XV 2026
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/30 border border-white/5">
              <Clock size={14} style={{ color:ACCENT }}/><LiveClock/>
            </div>
            <button onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-white/10 transition-colors border border-white/10 bg-white/5 text-zinc-300">
              <RefreshCw size={11}/> Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 space-y-6">

        {/* ════ 1. KPI STRIP — 5 panel ════ */}
        <div {...ani(0)} className="grid grid-cols-5 gap-2">
          {([
            { l:'Ranking',      v:`#${POPDA_REF.rank}`, c:'#ffd700', sub:'POPDA XIV',  icon:'👑' },
            { l:'Medali Emas',  v:summary.emas,               c:'#ffd700', sub:`/ ${TARGET.emas}`,  icon:'🥇' },
            { l:'Total Medali', v:summary.total_medali,       c:'#3b82f6', sub:'semua jenis',       icon:'🏅' },
            { l:'Laga Live',    v:LAGA_LIVE.length,           c:'#ef4444', sub:'berlangsung',       icon:null  },
            { l:'Total Atlet',  v:summary.total,              c:ACCENT,    sub:`${summary.verified} ok`, icon:'⚡' },
          ] as const).map(s => (
            <div key={s.l} className="rounded-xl px-3 py-2.5 relative overflow-hidden flex items-center gap-2.5"
              style={{ background:`${s.c}08`, border:`1px solid ${s.c}20` }}>
              <div className="absolute top-0 left-0 bottom-0 w-[2px] rounded-full"
                style={{ background:s.c }}/>
              <div className="pl-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  {s.icon === null
                    ? <div className={`w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 transition-opacity ${pulse?'opacity-100':'opacity-30'}`}/>
                    : <span className="text-xs leading-none shrink-0">{s.icon}</span>
                  }
                  <span className="text-[9px] font-semibold uppercase tracking-widest truncate" style={{ color:`${s.c}99` }}>{s.l}</span>
                </div>
                <div className="text-lg font-black leading-none" style={{ color: s.c }}>{s.v}</div>
                <div className="text-[9px] text-zinc-600 mt-0.5 truncate">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ════ 2. LAGA AKTIF ════ */}
        {LAGA_LIVE.length > 0 && (
          <div {...ani(15)} className="rounded-3xl p-5 relative overflow-hidden"
            style={{ background:'rgba(239,68,68,0.04)', border:'1px solid rgba(239,68,68,0.25)' }}>
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20"
              style={{ background:'#ef4444' }}/>
            <div className="relative flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full bg-red-400 ${pulse?'opacity-100':'opacity-20'} transition-opacity`}
                  style={{ boxShadow:'0 0 8px rgba(239,68,68,0.8)' }}/>
                <h2 className="text-sm font-black text-red-400 uppercase tracking-widest">
                  🚨 {LAGA_LIVE.length} Laga Sedang Berlangsung
                </h2>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Real-time</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 relative">
              {LAGA_LIVE.map((l, i) => (
                <div key={i} className="rounded-xl p-3 transition-all hover:scale-[1.02]"
                  style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"/>
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-400">LIVE</span>
                  </div>
                  <div className="text-sm font-bold text-white mb-1">{l.cabor}</div>
                  <div className="text-[11px] text-zinc-300">{l.laga}</div>
                  <div className="text-[10px] text-zinc-500 mt-1 font-mono">📍 {l.venue}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ 3. MISSION INTELLIGENCE — Gap · Target · Klasemen ════ */}
        <div {...ani(30)} className="rounded-3xl overflow-hidden relative"
          style={{ background:'rgba(2,10,20,0.65)', border:`1px solid ${ACCENT}18` }}>
          <div className="px-5 py-3 flex items-center gap-3 border-b"
            style={{ background:'rgba(0,0,0,0.25)', borderColor:`${ACCENT}12` }}>
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color:ACCENT }}>Mission Intelligence</span>
            <span className="h-3 w-px bg-white/10"/>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">Gap ke Puncak · Target Bupati · Top Klasemen</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.05]">

            {/* ── Col 1: Gap ke Puncak ── */}
            {myRank > 1 && klasemen[myRank-1] && klasemen[0] ? (()=> {
              const gapEmas  = klasemen[0].emas  - klasemen[myRank-1].emas
              const gapTotal = klasemen[0].total - klasemen[myRank-1].total
              const pctToTop = klasemen[0].emas > 0 ? Math.round((klasemen[myRank-1].emas / klasemen[0].emas) * 100) : 0
              return (
                <div className="p-5 relative overflow-hidden" style={{ background:'rgba(239,68,68,0.05)' }}>
                  <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
                    style={{ backgroundImage:`repeating-linear-gradient(-45deg,#ef4444 0,#ef4444 1px,transparent 0,transparent 12px)` }}/>
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp size={11} className="text-red-400"/>
                      <span className="text-[9px] font-black uppercase tracking-widest text-red-400">Gap ke Puncak</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-black transition-opacity ${pulse?'opacity-100':'opacity-40'}`}
                        style={{ background:'rgba(239,68,68,0.2)', color:'#ef4444' }}>⚠ KRITIS</span>
                    </div>
                    <div className="flex items-end gap-3 mb-3">
                      <div>
                        <div className="text-5xl font-black leading-none text-red-400"
                          style={{ textShadow:'0 0 28px rgba(239,68,68,0.55)' }}>-{gapEmas}</div>
                        <div className="text-[10px] text-zinc-500 mt-1">🥇 emas dari <span className="text-zinc-400 font-semibold">{klasemen[0].nama}</span></div>
                      </div>
                      <div className="text-zinc-700 text-lg mb-0.5">/</div>
                      <div>
                        <div className="text-3xl font-black leading-none text-amber-400"
                          style={{ textShadow:'0 0 20px rgba(251,191,36,0.4)' }}>-{gapTotal}</div>
                        <div className="text-[10px] text-zinc-500 mt-1">🏅 total</div>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background:'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width:`${pctToTop}%`, background:'linear-gradient(to right,#ef4444,#fbbf24)', boxShadow:'0 0 10px rgba(239,68,68,0.5)' }}/>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap size={9} className="text-red-400"/>
                      <span className="text-[9px] font-bold text-red-400">{pctToTop}% dari #1 · +{gapEmas} emas dibutuhkan</span>
                    </div>
                  </div>
                </div>
              )
            })() : (
              <div className="p-5 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-black leading-none mb-2" style={{ color:ACCENT, textShadow:`0 0 24px ${ACCENT}60` }}>🏆 #1</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Posisi Puncak</div>
                </div>
              </div>
            )}

            {/* ── Col 2: Referensi POPDA XIV 2025 ── */}
            <div className="p-5" style={{ background:'rgba(99,102,241,0.04)' }}>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Target size={11} className="text-indigo-400"/>
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Referensi Historis</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest"
                  style={{ background:'rgba(99,102,241,0.18)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.35)' }}>
                  📊 POPDA XIV 2025
                </span>
              </div>

              {/* Peringkat POPDA */}
              <div className="mb-4 p-3 rounded-xl" style={{ background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)' }}>
                <div className="text-[9px] text-indigo-300/60 uppercase tracking-widest mb-1">Peringkat POPDA XIV Jabar</div>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black leading-none text-indigo-300"
                    style={{ textShadow:'0 0 24px rgba(99,102,241,0.5)' }}>#{POPDA_REF.rank}</span>
                  <div className="mb-1">
                    <div className="text-[10px] text-zinc-400 font-semibold">dari 27 kontingen</div>
                    <div className="text-[9px] text-zinc-600">24 Sep 2025</div>
                  </div>
                </div>
              </div>

              {/* Medali POPDA vs PORPROV XV saat ini */}
              <div className="space-y-2.5">
                {([
                  { l:'Emas',     popda:POPDA_REF.emas,     now:summary.emas,     c:'#ffd700' as const, icon:'🥇' },
                  { l:'Perak',    popda:POPDA_REF.perak,    now:summary.perak,    c:'#c0c0c0' as const, icon:'🥈' },
                  { l:'Perunggu', popda:POPDA_REF.perunggu, now:summary.perunggu, c:'#cd7f32' as const, icon:'🥉' },
                ]).map(m => (
                  <div key={m.l}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm leading-none">{m.icon}</span>
                        <span className="text-[11px] font-bold text-zinc-300">{m.l}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="text-zinc-500">PORPROV: <span className="text-zinc-300 font-bold">{m.now}</span></span>
                        <span className="font-black" style={{ color:m.c }}>POPDA: {m.popda}</span>
                      </div>
                    </div>
                    {/* Bar: progress PORPROV vs POPDA reference */}
                    <div className="h-1 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full" style={{
                        width:`${Math.min(m.popda > 0 ? (m.now/m.popda)*100 : 0, 100)}%`,
                        background:m.c, opacity:0.6
                      }}/>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-2.5 border-t border-indigo-500/10">
                <div className="text-[9px] text-zinc-600 leading-relaxed">
                  Sumber: simaung.jabarprov.go.id<br/>
                  <span className="text-indigo-400/50">* POPDA = Pekan Olahraga Pelajar Daerah · beda kategori/cabor dengan PORPROV</span>
                </div>
              </div>
            </div>

            {/* ── Col 3: Top 5 Klasemen ── */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Crown size={11} className="text-yellow-400"/>
                  <span className="text-[9px] font-black uppercase tracking-widest text-yellow-400">Top Klasemen</span>
                </div>
                <span className="text-[8px] font-mono font-bold border border-yellow-500/20 text-yellow-500/70 px-2 py-0.5 rounded-full">
                  #{POPDA_REF.rank} / {klasemen.length||27}
                </span>
              </div>
              <div className="space-y-1.5">
                {klasemen.slice(0, 5).map((k, i) => {
                  const isUs = String(k.nama ?? '').toUpperCase().includes('BANDUNG')
                  return (
                    <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-colors"
                      style={{
                        background: isUs ? `${ACCENT}10` : 'rgba(255,255,255,0.025)',
                        borderColor: isUs ? `${ACCENT}40` : 'rgba(255,255,255,0.05)',
                      }}>
                      <span className="text-xs w-6 text-center font-black shrink-0"
                        style={{ color: i<3 ? ['#ffd700','#cbd5e1','#cd7f32'][i] : '#6b7280' }}>
                        {i<3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}
                      </span>
                      <span className="flex-1 text-[10px] font-bold truncate" style={{ color: isUs ? ACCENT : '#d4d4d8' }}>
                        {k.nama}{isUs?' ✦':''}
                      </span>
                      <div className="flex gap-1 text-[10px] font-mono font-bold shrink-0 bg-black/20 px-1.5 py-0.5 rounded">
                        <span className="text-yellow-400">{k.emas}</span>
                        <span className="text-zinc-500">{k.perak}</span>
                        <span className="text-amber-700">{k.perunggu}</span>
                      </div>
                    </div>
                  )
                })}
                {myRank > 5 && klasemen[myRank-1] && (
                  <>
                    <div className="text-center text-[10px] text-zinc-700 font-mono py-0.5">⋮</div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
                      style={{ background:`${ACCENT}12`, border:`1px solid ${ACCENT}45`, boxShadow:`0 0 10px ${ACCENT}15` }}>
                      <span className="text-xs w-6 text-center font-black shrink-0" style={{ color: ACCENT }}>#{myRank}</span>
                      <span className="flex-1 text-[10px] font-bold truncate" style={{ color: ACCENT }}>
                        {klasemen[myRank-1].nama} ✦
                      </span>
                      <div className="flex gap-1 text-[10px] font-mono font-bold shrink-0 bg-black/20 px-1.5 py-0.5 rounded">
                        <span className="text-yellow-400">{klasemen[myRank-1].emas}</span>
                        <span className="text-zinc-500">{klasemen[myRank-1].perak}</span>
                        <span className="text-amber-700">{klasemen[myRank-1].perunggu}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ════ 4. PETA KOMPETITOR — full width ════ */}
        <div {...ani(45)} className="rounded-3xl overflow-hidden relative shadow-xl"
          style={{ border:`1px solid ${ACCENT}25`, height:490 }}>
          <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none px-5 py-4 flex flex-wrap items-center justify-between gap-3"
            style={{ background:'linear-gradient(to bottom, #020a14 0%, rgba(2,10,20,0.7) 60%, transparent 100%)' }}>
            <div>
              <div className="flex items-center gap-2">
                <MapPin size={14} style={{ color:ACCENT }}/>
                <h3 className="text-sm font-bold text-white">Peta Kekuatan Kompetitor</h3>
              </div>
              <p className="text-[10px] uppercase tracking-widest font-mono mt-0.5" style={{ color:'rgba(255,255,255,0.4)' }}>
                Sebaran medali {klasemen.length} kontingen · Jawa Barat 2026
              </p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[{c:'#ef4444',l:'Ancaman Tinggi'},{c:'#f97316',l:'Waspada'},{c:'#fbbf24',l:'Seimbang'},{c:'#6b7280',l:'Aman'}].map(t=>(
                <div key={t.l} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 border border-white/10">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background:t.c }}/>
                  <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider">{t.l}</span>
                </div>
              ))}
            </div>
          </div>
          <PetaKompetitor
            klasemen={klasemen}
            myEmas={summary.emas}
            myKontingen="KAB. BANDUNG"
            myColor={ACCENT}
            myLabel="Kab. Bandung"
            height={490}
            center={[-7.0815, 107.5250]}
            zoom={8.5}
          />
        </div>

        {/* ════ 5. STRATEGIC ACTIONS ════ */}
        <div {...ani(70)}>
          <StrategicActionsCard
            primary={ACCENT}
            actions={generateStrategicActions({
              topPerformers: tesFisikSum.topAtlet,
              weakCabors:    tesFisikSum.weakCabors,
              lowSkorAtlet:  tesFisikSum.lowAtlet,
              gapEmas: myRank > 1 && klasemen[myRank-1] && klasemen[0]
                        ? klasemen[0].emas - klasemen[myRank-1].emas : 0,
            })}
          />
        </div>

      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${ACCENT}40;border-radius:10px}
        ::-webkit-scrollbar-thumb:hover{background:${ACCENT}80}
      ` }} />
    </div>
  )
}
