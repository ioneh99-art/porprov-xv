'use client'
// src/app/konida/warroom/kabbogor/page.tsx — v2
// Fix: m.value.data possibly null
// Redesign: Prediksi medali per cabor + alert laga aktif

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Monitor, Trophy, Activity, Clock, Target,
  TrendingUp, Users, RefreshCw, AlertTriangle,
  Zap, ChevronRight, Medal, Star, CheckCircle,
} from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Prediksi potensi medali per cabor — berdasarkan data atlet & histori
const PREDIKSI_CABOR = [
  { cabor:'Hockey',       potensi:'Emas',    prob:92, atlet:76, alasan:'Tim terkuat, unbeaten di fase grup',        status:'LIVE',    laga:'vs Kota Depok — Lap. Hoki PKS'          },
  { cabor:'Dayung',       potensi:'Emas',    prob:87, atlet:67, alasan:'Dominan di K-2 & K-4, sudah di final',      status:'LIVE',    laga:'K-2 500m Final — Situ Cikaret'          },
  { cabor:'Atletik',      potensi:'Emas',    prob:84, atlet:18, alasan:'Sprint & lari jauh unggulan Jabar Barat',    status:'UPCOMING',laga:'100m Putra Final — 16:30 Stadion PKS'   },
  { cabor:'Taekwondo',    potensi:'Emas',    prob:78, atlet:16, alasan:'3 finalis dari Kab. Bogor hari ini',         status:'DONE',    laga:'54kg Putra Final — Juara 🥇'            },
  { cabor:'Karate',       potensi:'Emas',    prob:71, atlet:18, alasan:'Kata putri & kumite putra masuk final',      status:'UPCOMING',laga:'Kumite Putra Final — 15:00'              },
  { cabor:'Menembak',     potensi:'Perak',   prob:68, atlet:42, alasan:'Banyak atlet tapi persaingan ketat',         status:'UPCOMING',laga:'10m Air Rifle — 14:30 Lap. Menembak'     },
  { cabor:'Bulutangkis',  potensi:'Emas',    prob:65, atlet:18, alasan:'Tunggal putra di semifinal',                 status:'LIVE',    laga:'Tunggal Putra SF — Laga Tangkas'        },
  { cabor:'Akuatik',      potensi:'Perak',   prob:61, atlet:51, alasan:'Kuat di gaya bebas, bersaing ketat renang gaya dada',status:'UPCOMING',laga:'200m Gaya Bebas — 15:45' },
  { cabor:'Floorball',    potensi:'Emas',    prob:58, atlet:44, alasan:'Tim muda berbakat, semifinal vs Depok',      status:'UPCOMING',laga:'Semifinal vs Depok — 17:00'             },
  { cabor:'Sepak Bola',   potensi:'Perak',   prob:52, atlet:49, alasan:'QF menang, SF vs Kota Bandung berat',        status:'LIVE',    laga:'QF vs Kota Bandung — Stadion PKS'       },
  { cabor:'Panahan',      potensi:'Perunggu',prob:45, atlet:31, alasan:'Masuk top 4, persaingan 3-4 sangat ketat',  status:'UPCOMING',laga:'Recurve Putra 3/4 — 13:00'              },
  { cabor:'Angkat Besi',  potensi:'Perunggu',prob:42, atlet:36, alasan:'Kompetitif di 2 kelas berat ringan',        status:'DONE',    laga:'Kelas 56kg — Perunggu 🥉'               },
]

const LIVE_ALERT = PREDIKSI_CABOR.filter(c => c.status==='LIVE')
const UPCOMING   = PREDIKSI_CABOR.filter(c => c.status==='UPCOMING').slice(0,4)

const POTENSI_COLOR: Record<string,{c:string;bg:string;border:string}> = {
  Emas:     { c:'#ffd700', bg:'rgba(255,215,0,0.1)',   border:'rgba(255,215,0,0.25)'   },
  Perak:    { c:'#c0c0c0', bg:'rgba(192,192,192,0.1)', border:'rgba(192,192,192,0.25)' },
  Perunggu: { c:'#cd7f32', bg:'rgba(205,127,50,0.1)',  border:'rgba(205,127,50,0.25)'  },
}

function LiveClock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
    setT(fmt())
    const i = setInterval(() => setT(fmt()), 1000)
    return () => clearInterval(i)
  }, [])
  return <span className="tabular-nums font-mono font-bold" style={{color:'#00ffaa'}}>{t}</span>
}

function ProbBar({ prob, color }: { prob: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full transition-all duration-1000"
        style={{ width:`${prob}%`, background:color, boxShadow:`0 0 6px ${color}60` }}/>
    </div>
  )
}

export default function PageWarRoom() {
  const [klasemen, setKlasemen] = useState<any[]>([])
  const [summary,  setSummary]  = useState({ total:0, verified:0, emas:0, perak:0, perunggu:0, total_medali:0 })
  const [loading,  setLoading]  = useState(true)
  const [animIn,   setAnimIn]   = useState(false)
  const [pulse,    setPulse]    = useState(true)

  useEffect(() => { const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])
  useEffect(() => { const i=setInterval(()=>setPulse(p=>!p),800); return()=>clearInterval(i) },[])

  useEffect(() => {
    async function load() {
      try {
        const [k, m, a] = await Promise.allSettled([
          sb.from('klasemen_medali')
            .select('emas,perak,perunggu,total,kontingen(nama)')
            .order('emas',  { ascending:false })
            .order('perak', { ascending:false })
            .limit(7),
          sb.from('klasemen_medali')
            .select('emas,perak,perunggu,total')
            .eq('kontingen_id', 1)
            .maybeSingle(), // ← fix: maybeSingle() tidak throw kalau null
          sb.from('atlet')
            .select('status_registrasi')
            .eq('kontingen_id', 1),
        ])

        if (k.status==='fulfilled' && k.value.data) {
          setKlasemen(k.value.data as any[])
        }

        // Fix: cek data tidak null sebelum akses property
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
            verified: atlets.filter(x => x.status_registrasi==='Verified').length,
          }))
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
    String((k.kontingen as any)?.nama ?? '').toUpperCase().includes('BOGOR')
  ) + 1

  const totalPrediksiEmas = PREDIKSI_CABOR.filter(c => c.potensi==='Emas').length

  const ani = (d=0) => ({
    style:     { transitionDelay:`${d}ms`, transition:'all 0.55s cubic-bezier(0.16,1,0.3,1)' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
  })

  return (
    <div className="min-h-screen text-zinc-300 flex flex-col"
      style={{ background:'linear-gradient(135deg,#020d06 0%,#040f08 100%)', fontFamily:'system-ui,sans-serif' }}>

      {/* Grid bg */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage:'linear-gradient(rgba(0,255,170,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,170,0.025) 1px,transparent 1px)', backgroundSize:'32px 32px', zIndex:0 }}/>

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-40 border-b border-zinc-800/60 px-5 py-4 backdrop-blur-xl"
        style={{ background:'rgba(2,13,6,0.93)' }}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background:'rgba(0,255,170,0.1)', border:'1px solid rgba(0,255,170,0.3)', boxShadow:'0 0 20px rgba(0,255,170,0.1)' }}>
              <Monitor size={22} style={{ color:'#00ffaa' }}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                WAR ROOM — KAB. BOGOR
                <span className="flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-full font-bold"
                  style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171' }}>
                  <span className={`w-1.5 h-1.5 rounded-full bg-red-400 transition-opacity ${pulse?'opacity-100':'opacity-20'}`}/>
                  LIVE · {LIVE_ALERT.length} LAGA AKTIF
                </span>
              </h1>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                Prediksi perolehan medali & pemantauan laga real-time · PORPROV XV 2026
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background:'rgba(0,255,170,0.08)', border:'1px solid rgba(0,255,170,0.2)' }}>
              <Clock size={12} style={{ color:'#00ffaa' }}/>
              <LiveClock/>
            </div>
            <button onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all"
              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)' }}>
              <RefreshCw size={12}/> Refresh
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-5 max-w-[1600px] w-full mx-auto relative z-10 space-y-5">

        {/* ── KPI STRIP ── */}
        <div {...ani(0)} className="grid grid-cols-6 gap-3">
          {[
            { l:'Laga Live',     v:LIVE_ALERT.length,    c:'#ff4444', icon:Activity,  sub:'pertandingan berjalan' },
            { l:'Total Atlet',   v:loading?'—':summary.total,    c:'#00ffaa', icon:Users,    sub:`${summary.verified} verified` },
            { l:'Medali Emas',   v:loading?'—':summary.emas,     c:'#ffd700', icon:Trophy,   sub:`target 50 emas` },
            { l:'Total Medali',  v:loading?'—':summary.total_medali, c:'#ff8c00', icon:Medal, sub:'🥇🥈🥉 gabungan' },
            { l:'Prediksi Emas', v:totalPrediksiEmas,    c:'#b44fff', icon:Star,     sub:'cabor berpotensi' },
            { l:'Ranking',       v:loading?'—':myRank>0?`#${myRank}`:'—', c:'#00b4ff', icon:TrendingUp, sub:'klasemen PORPROV' },
          ].map(k => (
            <div key={k.l} className="rounded-2xl p-4 flex flex-col gap-2 transition-all"
              style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${k.c}18` }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor=`${k.c}35`}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor=`${k.c}18`}>
              <k.icon size={15} style={{ color:k.c }}/>
              <div className="text-2xl font-black" style={{ color:k.c }}>{k.v}</div>
              <div>
                <div className="text-[10px] font-semibold text-zinc-400">{k.l}</div>
                <div className="text-[9px] text-zinc-600">{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── ALERT LAGA AKTIF ── */}
        {LIVE_ALERT.length > 0 && (
          <div {...ani(60)}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full bg-red-400 transition-opacity ${pulse?'opacity-100':'opacity-20'}`}/>
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest">
                {LIVE_ALERT.length} LAGA SEDANG BERLANGSUNG
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {LIVE_ALERT.map(c => {
                const pc = POTENSI_COLOR[c.potensi]
                return (
                  <div key={c.cabor} className="flex items-center gap-3 p-3.5 rounded-xl"
                    style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)' }}>
                    <div className={`w-2 h-2 rounded-full bg-red-400 flex-shrink-0 transition-opacity ${pulse?'opacity-100':'opacity-20'}`}/>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-zinc-200">{c.cabor}</div>
                      <div className="text-[10px] text-zinc-500 truncate mt-0.5">{c.laga}</div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
                      style={{ background:pc.bg, color:pc.c, border:`1px solid ${pc.border}` }}>
                      {c.potensi}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── MAIN GRID ── */}
        <div {...ani(100)} className="grid grid-cols-3 gap-5">

          {/* KLASEMEN */}
          <div className="rounded-2xl p-5"
            style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(0,255,170,0.1)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={14} style={{ color:'#ffd700' }}/>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Klasemen PORPROV XV</span>
            </div>

            {loading ? (
              <div className="text-center text-zinc-600 text-xs py-8">Memuat data...</div>
            ) : klasemen.length > 0 ? (
              <div className="space-y-2">
                {klasemen.map((k:any, i) => {
                  const nama  = (k.kontingen as any)?.nama ?? '-'
                  const isUs  = nama.toUpperCase().includes('BOGOR')
                  return (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all"
                      style={{
                        background: isUs?'rgba(0,255,170,0.07)':'rgba(255,255,255,0.02)',
                        border:`1px solid ${isUs?'rgba(0,255,170,0.2)':'rgba(255,255,255,0.04)'}`,
                      }}>
                      <span className="text-xs w-5 text-center font-mono flex-shrink-0"
                        style={{ color:i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'rgba(255,255,255,0.2)' }}>
                        {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}
                      </span>
                      <span className="flex-1 text-xs truncate font-medium"
                        style={{ color:isUs?'#00ffaa':'rgba(255,255,255,0.65)' }}>
                        {nama}{isUs?' ✦ KITA':''}
                      </span>
                      <div className="flex gap-1.5 text-[11px] font-mono font-bold flex-shrink-0">
                        <span style={{ color:'#ffd700' }}>{k.emas}</span>
                        <span style={{ color:'#9ca3af' }}>{k.perak}</span>
                        <span style={{ color:'#cd7f32' }}>{k.perunggu}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center text-zinc-600 text-xs py-4">Data klasemen belum tersedia</div>
            )}

            {/* Progress target */}
            <div className="mt-4 pt-4 border-t" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <div className="flex justify-between text-[10px] mb-2">
                <span className="text-zinc-500">Progress Target Emas</span>
                <span style={{ color:'#ffd700' }}>{summary.emas}/50 · {Math.round(summary.emas/50*100)}%</span>
              </div>
              <ProbBar prob={Math.round(summary.emas/50*100)} color="#ffd700"/>
            </div>
          </div>

          {/* PREDIKSI MEDALI — col-span-2 */}
          <div className="col-span-2 rounded-2xl p-5"
            style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,215,0,0.1)' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Star size={14} style={{ color:'#ffd700' }}/>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Prediksi Perolehan Medali per Cabor
                </span>
              </div>
              <div className="flex gap-2">
                {[
                  { l:'Emas',     n:PREDIKSI_CABOR.filter(c=>c.potensi==='Emas').length,     c:'#ffd700' },
                  { l:'Perak',    n:PREDIKSI_CABOR.filter(c=>c.potensi==='Perak').length,    c:'#c0c0c0' },
                  { l:'Perunggu', n:PREDIKSI_CABOR.filter(c=>c.potensi==='Perunggu').length, c:'#cd7f32' },
                ].map(s => (
                  <div key={s.l} className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                    style={{ background:`${s.c}12`, border:`1px solid ${s.c}25`, color:s.c }}>
                    {s.n} {s.l}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1"
              style={{ scrollbarWidth:'thin', scrollbarColor:'rgba(0,255,170,0.2) transparent' }}>
              {PREDIKSI_CABOR.map((c, i) => {
                const pc = POTENSI_COLOR[c.potensi]
                const isLive    = c.status==='LIVE'
                const isDone    = c.status==='DONE'
                return (
                  <div key={c.cabor} className="flex items-center gap-4 p-3.5 rounded-xl transition-all"
                    style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${isDone?pc.border:isLive?'rgba(239,68,68,0.2)':'rgba(255,255,255,0.05)'}` }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.04)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)'}>

                    {/* Rank */}
                    <div className="w-6 text-center text-xs font-mono text-zinc-600 flex-shrink-0">{i+1}</div>

                    {/* Cabor info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-zinc-200">{c.cabor}</span>
                        {isLive && (
                          <span className="flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.25)' }}>
                            <span className={`w-1 h-1 rounded-full bg-red-400 transition-opacity ${pulse?'opacity-100':'opacity-20'}`}/>
                            LIVE
                          </span>
                        )}
                        {isDone && (
                          <span className="flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background:'rgba(0,255,170,0.1)', color:'#00ffaa', border:'1px solid rgba(0,255,170,0.2)' }}>
                            <CheckCircle size={8}/> SELESAI
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate">{c.alasan}</div>
                      <div className="text-[10px] text-zinc-600 truncate mt-0.5">
                        {isLive ? '🔴 ' : isDone ? '✅ ' : '⏰ '}{c.laga}
                      </div>
                    </div>

                    {/* Prob bar */}
                    <div className="w-28 flex-shrink-0">
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="text-zinc-600">Peluang</span>
                        <span style={{ color:pc.c }} className="font-bold">{c.prob}%</span>
                      </div>
                      <ProbBar prob={c.prob} color={pc.c}/>
                      <div className="text-[9px] text-zinc-600 mt-0.5">{c.atlet} atlet</div>
                    </div>

                    {/* Potensi badge */}
                    <div className="flex-shrink-0">
                      <span className="text-[10px] font-bold px-3 py-1.5 rounded-xl"
                        style={{ background:pc.bg, color:pc.c, border:`1px solid ${pc.border}` }}>
                        {c.potensi==='Emas'?'🥇':c.potensi==='Perak'?'🥈':'🥉'} {c.potensi}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── JADWAL BERIKUTNYA ── */}
        <div {...ani(140)} className="rounded-2xl p-5"
          style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(0,180,255,0.1)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} style={{ color:'#00b4ff' }}/>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Jadwal Pertandingan Berikutnya
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {UPCOMING.map(c => {
              const pc = POTENSI_COLOR[c.potensi]
              return (
                <div key={c.cabor} className="p-4 rounded-xl"
                  style={{ background:'rgba(0,180,255,0.05)', border:'1px solid rgba(0,180,255,0.15)' }}>
                  <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1.5">⏰ UPCOMING</div>
                  <div className="font-bold text-sm text-zinc-200 mb-1">{c.cabor}</div>
                  <div className="text-[10px] text-zinc-500 mb-3 leading-relaxed">{c.laga}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold px-2 py-1 rounded-lg"
                      style={{ background:pc.bg, color:pc.c, border:`1px solid ${pc.border}` }}>
                      Target {c.potensi}
                    </span>
                    <span className="text-[9px] font-bold" style={{ color:'#00b4ff' }}>{c.prob}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </main>
    </div>
  )
}