'use client'
// src/app/konida/dashboard/kabbandung/page.tsx — STYLED FINAL v2
// PATCH: Hapus Peta Kompetitor + Top 5 Klasemen + Target Realisasi
// KONTINGEN_ID=4, KODE_LOKAL='3204', ACCENT=#38bdf8

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Users, Trophy, Target, CheckCircle, Clock, AlertTriangle,
  Zap, Shield, ChevronRight, RefreshCw, Info,
  Search, X, FileText, Download, Monitor,
  Activity, FileCheck,
} from 'lucide-react'
import SportScienceCard from '@/components/konida/SportScienceCard'
import CaborWatchlist, { CaborWatchData } from '@/components/konida/CaborWatchlist'
import {
  HealthIndexGauge, CriticalAlertsCard, CriticalPathTimeline, MissionControlActions,
  buildAlertsFromData, buildMissionActions, buildDefaultTimeline,
} from '@/components/konida/DashboardHelpers'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const KONTINGEN_ID = 4
const KODE_LOKAL   = '3204'
const ACCENT       = '#38bdf8'
const PRIMARY      = '#075985'

const CABOR_KATEGORI: Record<string, string> = {
  'Sepak Bola':'Permainan','Bola Basket':'Permainan','Bola Voli':'Permainan',
  'Hockey':'Permainan','Floorball':'Permainan','Rugby':'Permainan','Futsal':'Permainan',
  'Pencak Silat':'Bela Diri','Karate':'Bela Diri','Taekwondo':'Bela Diri',
  'Judo':'Bela Diri','Gulat':'Bela Diri','Tinju':'Bela Diri','Muaythai':'Bela Diri',
  'Atletik':'Atletik','Renang':'Air','Akuatik':'Air','Dayung':'Air','Selam':'Air',
  'Panahan':'Akurasi','Menembak':'Akurasi','Biliar':'Akurasi','Petanque':'Akurasi',
  'Catur':'Mental','Angkat Besi':'Angkat','Angkat Berat':'Angkat','Binaraga':'Angkat',
  'Senam':'Seni','Dancesport':'Seni','Balap Sepeda':'Otomotif','Panjat Tebing':'Alam',
}

interface AtletRaw {
  status_registrasi:string; gender:string; cabor_nama_raw:string
  kode_asal_daerah:string; nama_asal_daerah:string; tgl_lahir:string
}
interface CaborStat {
  nama:string; total:number; putra:number; putri:number
  verified:number; kategori:string
  emas:number; perak:number; perunggu:number; conversion:number
}

// ── Helpers ───────────────────────────────────────────────
function LiveClock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const f = () => new Date().toLocaleTimeString('id-ID',{ hour:'2-digit', minute:'2-digit', second:'2-digit' })
    setT(f())
    const i = setInterval(() => setT(f()), 1000)
    return () => clearInterval(i)
  }, [])
  return <span className="tabular-nums font-mono font-bold tracking-wider" style={{ color:ACCENT }}>{t}</span>
}

// ── Main ──────────────────────────────────────────────────
export default function DashboardKabBandung() {
  const [atlets,    setAtlets]    = useState<AtletRaw[]>([])
  const [cabors,    setCabors]    = useState<CaborStat[]>([])
  const [klasemen,  setKlasemen]  = useState<any[]>([])
  const [myMedali,  setMyMedali]  = useState({ emas:0, perak:0, perunggu:0, total:0 })
  const [loading,   setLoading]   = useState(true)
  const [animIn,    setAnimIn]    = useState(false)
  const [search,    setSearch]    = useState('')
  const [selCabor,  setSelCabor]  = useState<CaborStat|null>(null)
  const [pulse,     setPulse]     = useState(true)
  const [tesFisikData, setTesFisikData] = useState<{
    hadir: number; dns: number; avgSkor: number;
    topAtlet: number; lowAtlet: number;
    lemahCount: number;
  }>({hadir:0,dns:0,avgSkor:0,topAtlet:0,lowAtlet:0,lemahCount:0})
  // Per-cabor fitness map: cabor → { hadir, avg }
  const [caborFitness, setCaborFitness] = useState<Record<string,{hadir:number;avg:number}>>({})

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])
  useEffect(() => { const i = setInterval(() => setPulse(p => !p), 800); return () => clearInterval(i) }, [])

  useEffect(() => {
    async function load() {
      const [a, k, m, tf, tfi] = await Promise.allSettled([
        sb.from('atlet')
          .select('status_registrasi,gender,cabor_nama_raw,kode_asal_daerah,nama_asal_daerah,tgl_lahir')
          .eq('kontingen_id', KONTINGEN_ID),
        sb.from('klasemen_medali')
          .select('emas,perak,perunggu,total,kontingen(nama)')
          .order('emas',{ ascending:false })
          .order('perak',{ ascending:false })
          .limit(27),
        sb.from('klasemen_medali')
          .select('emas,perak,perunggu,total')
          .eq('kontingen_id', KONTINGEN_ID)
          .maybeSingle(),
        sb.from('atlet_tes_fisik')
          .select('kesimpulan_persen,status_tes,cabor_nama')
          .eq('kontingen_id', KONTINGEN_ID).eq('tahap', 3),
        sb.from('atlet_tes_fisik_item')
          .select('komponen,capaian_persen'),
      ])

      if (tf.status==='fulfilled' && tf.value.data) {
        const tfData = tf.value.data
        const hadir = tfData.filter((t:any) => t.status_tes === 'Hadir')
        const valid = hadir.filter((t:any) => t.kesimpulan_persen != null)
        const avgSkor = valid.length
          ? Math.round(valid.reduce((s:number,t:any) => s + t.kesimpulan_persen, 0) / valid.length)
          : 0
        const caborMap: Record<string,{sum:number;n:number}> = {}
        valid.forEach((t:any) => {
          const c = t.cabor_nama || 'Unknown'
          if (!caborMap[c]) caborMap[c] = {sum:0,n:0}
          caborMap[c].sum += t.kesimpulan_persen
          caborMap[c].n++
        })
        const lemahCabor = Object.values(caborMap).filter(c => c.n>=2 && c.sum/c.n < 55).length
        // Populate per-cabor fitness map for CaborWatchlist
        const fitnessMap: Record<string,{hadir:number;avg:number}> = {}
        Object.entries(caborMap).forEach(([nama, v]) => {
          fitnessMap[nama] = { hadir: v.n, avg: Math.round(v.sum / v.n) }
        })
        setCaborFitness(fitnessMap)
        setTesFisikData({
          hadir: hadir.length,
          dns: tfData.length - hadir.length,
          avgSkor,
          topAtlet: valid.filter((t:any) => t.kesimpulan_persen >= 80).length,
          lowAtlet: valid.filter((t:any) => t.kesimpulan_persen < 40).length,
          lemahCount: lemahCabor,
        })
      }

      if (a.status==='fulfilled' && a.value.data) {
        const data = a.value.data as AtletRaw[]
        setAtlets(data)
        const cmap: Record<string,{total:number;putra:number;putri:number;verified:number}> = {}
        data.forEach(x => {
          const c = x.cabor_nama_raw||'Lainnya'
          if (!cmap[c]) cmap[c] = { total:0, putra:0, putri:0, verified:0 }
          cmap[c].total++
          if (x.gender==='L') cmap[c].putra++; else cmap[c].putri++
          if (x.status_registrasi==='Verified') cmap[c].verified++
        })
        const MEDALI: Record<string,{e:number;p:number;pg:number}> = {
          'Hockey':{e:1,p:0,pg:0},'Dayung':{e:2,p:1,pg:1},'Atletik':{e:3,p:1,pg:0},
          'Taekwondo':{e:2,p:0,pg:1},'Karate':{e:1,p:2,pg:0},'Renang':{e:0,p:1,pg:2},
          'Menembak':{e:1,p:1,pg:1},'Panahan':{e:0,p:1,pg:1},'Pencak Silat':{e:1,p:0,pg:2},
          'Bulutangkis':{e:0,p:1,pg:0},'Sepak Bola':{e:0,p:0,pg:1},
        }
        const clist: CaborStat[] = Object.entries(cmap).map(([nama,s]) => {
          const med = MEDALI[nama] ?? { e:0, p:0, pg:0 }
          const tm  = med.e+med.p+med.pg
          return {
            nama, total:s.total, putra:s.putra, putri:s.putri, verified:s.verified,
            kategori: CABOR_KATEGORI[nama]||'Umum',
            emas:med.e, perak:med.p, perunggu:med.pg,
            conversion: s.total>0 ? Math.round(tm/s.total*100) : 0,
          }
        }).sort((a,b) => b.total-a.total)
        setCabors(clist)
      }

      if (k.status==='fulfilled' && k.value.data) {
        const raw = k.value.data as any[]
        const flat = raw.map(r => ({
          nama:     (r.kontingen as any)?.nama ?? '-',
          emas:     r.emas    ?? 0,
          perak:    r.perak   ?? 0,
          perunggu: r.perunggu ?? 0,
          total:    r.total   ?? 0,
        }))
        setKlasemen(flat)
      }
      if (m.status==='fulfilled' && m.value.data) {
        const d = m.value.data
        setMyMedali({ emas:d.emas??0, perak:d.perak??0, perunggu:d.perunggu??0, total:d.total??0 })
      }
      setLoading(false)
    }
    void load()
  }, [])

  const kpi = useMemo(() => {
    const total    = atlets.length
    const putra    = atlets.filter(a => a.gender==='L').length
    const putri    = atlets.filter(a => a.gender==='P').length
    const verified = atlets.filter(a => a.status_registrasi==='Verified').length
    const pending  = atlets.filter(a => a.status_registrasi==='Menunggu Admin').length
    const ditolak  = atlets.filter(a => a.status_registrasi==='Ditolak Admin').length
    const posted   = atlets.filter(a => a.status_registrasi==='Posted').length
    const lokal    = atlets.filter(a => a.kode_asal_daerah?.startsWith(KODE_LOKAL)).length
    const nonLokal = total - lokal
    const myRank   = klasemen.findIndex(k =>
      k.nama?.toUpperCase().includes('KAB. BANDUNG')
    ) + 1
    return {
      total, putra, putri, verified, pending, ditolak, posted, lokal, nonLokal,
      vpct: total>0 ? Math.round(verified/total*100) : 0,
      lpct: total>0 ? Math.round(lokal/total*100)    : 0,
      myRank,
    }
  }, [atlets, klasemen])

  // ── Build CaborWatchData for Watchlist component ──
  const caborWatchList = useMemo<CaborWatchData[]>(() => {
    // Aggregate per cabor from raw atlets
    const m: Record<string, {
      total:number; putra:number; putri:number; verified:number;
      pending:number; ditolak:number; nonLokal:number;
      emas:number; perak:number; perunggu:number;
    }> = {}
    atlets.forEach(a => {
      const c = a.cabor_nama_raw || 'Lainnya'
      if (!m[c]) m[c] = { total:0,putra:0,putri:0,verified:0,pending:0,ditolak:0,nonLokal:0,emas:0,perak:0,perunggu:0 }
      m[c].total++
      if (a.gender === 'L') m[c].putra++
      else m[c].putri++
      if (a.status_registrasi === 'Verified') m[c].verified++
      if (a.status_registrasi === 'Menunggu Admin') m[c].pending++
      if (a.status_registrasi === 'Ditolak Admin') m[c].ditolak++
      if (a.kode_asal_daerah && !a.kode_asal_daerah.startsWith(KODE_LOKAL)) m[c].nonLokal++
    })
    // Add medali from cabors array (yang udah ada hardcoded mapping)
    cabors.forEach(c => {
      if (m[c.nama]) {
        m[c.nama].emas = c.emas
        m[c.nama].perak = c.perak
        m[c.nama].perunggu = c.perunggu
      }
    })
    // Build final list with fitness data
    return Object.entries(m).map(([nama, s]) => ({
      nama,
      ...s,
      fisikHadir: caborFitness[nama]?.hadir ?? 0,
      fisikAvg:   caborFitness[nama]?.avg   ?? 0,
      medaliIsDemo: true,  // semua medali masih hardcode untuk demo
    }))
  }, [atlets, cabors, caborFitness])

  const ani = (d=0) => ({
    style:     { transitionDelay:`${d}ms`, transition:'all 0.8s cubic-bezier(0.16,1,0.3,1)' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#020a14]">
      <div className="text-center">
        <div className="w-16 h-16 border-2 rounded-full animate-spin mx-auto mb-6"
          style={{ borderColor:`${ACCENT}20`, borderTopColor:ACCENT, boxShadow: `0 0 30px ${ACCENT}20` }}/>
        <p className="font-mono text-xs uppercase tracking-widest" style={{ color:ACCENT }}>Memuat Dashboard...</p>
        <p className="text-[10px] mt-2 text-zinc-500">Kab. Bandung · PORPROV XV 2026</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen text-zinc-300 font-sans selection:bg-[#38bdf8]/30" style={{ background:'linear-gradient(145deg, #02060f 0%, #04121f 100%)' }}>

      {/* Grid bg & Radial glow */}
      <div className="fixed inset-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ zIndex:0,
        backgroundImage:`linear-gradient(${ACCENT}08 1px,transparent 1px),linear-gradient(90deg,${ACCENT}08 1px,transparent 1px)`,
        backgroundSize:'60px 60px' }}/>
      <div className="fixed pointer-events-none" style={{
        top:'-30%', left:'50%', transform:'translateX(-50%)',
        width:'100vw', height:'80vh',
        background:`radial-gradient(ellipse, ${ACCENT}08 0%, transparent 60%)`,
        zIndex:0 }}/>

      {/* ── HEADER ── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-5 border-b backdrop-blur-xl bg-[#020a14]/80 shadow-lg shadow-black/20"
        style={{ borderColor:`${ACCENT}15` }}>
        <div className="flex items-center gap-5">
          <div className="relative w-12 h-12">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background:`linear-gradient(135deg, ${PRIMARY}, ${ACCENT}30)`, border:`1px solid ${ACCENT}40`, boxShadow:`0 0 20px ${ACCENT}30` }}>
              <span className="text-white font-black text-sm">KB</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-[#020a14]"
              style={{ background:ACCENT, boxShadow: `0 0 10px ${ACCENT}` }}/>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-white font-black text-xl tracking-wide text-shadow-sm">DASHBOARD KAB. BANDUNG</h1>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
                <div className={`w-1.5 h-1.5 rounded-full bg-red-400 transition-opacity duration-300 ${pulse?'opacity-100 shadow-[0_0_8px_rgba(248,113,113,0.8)]':'opacity-30'}`}/>
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Live</span>
              </div>
            </div>
            <div className="text-[11px] font-mono uppercase tracking-widest mt-1 flex items-center gap-2" style={{ color:`${ACCENT}90` }}>
              <Zap size={10} className="text-amber-400 drop-shadow-md"/> Intelligence Command · PORPROV XV Jabar 2026
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden xl:flex items-center gap-2">
            {[
              { l:'Total Atlet', v:kpi.total,         c:ACCENT    },
              { l:'Verifikasi',  v:`${kpi.vpct}%`,    c:'#22d3ee' },
              { l:'Ranking',     v:`#${kpi.myRank||'—'}`, c:'#ffd700' },
              { l:'Medali Emas', v:myMedali.emas,     c:'#ffd700' },
            ].map(s => (
              <div key={s.l} className="px-4 py-2 rounded-xl text-center backdrop-blur-md transition-colors hover:bg-white/5"
                style={{ background:`${s.c}0a`, border:`1px solid ${s.c}20` }}>
                <div className="text-sm font-black drop-shadow-sm" style={{ color:s.c }}>{s.v}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="w-[1px] h-8 bg-white/10 hidden xl:block mx-2"></div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-inner bg-black/20 border border-white/5">
            <Clock size={14} style={{ color:ACCENT }}/><LiveClock/>
          </div>
          <button onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition-all border border-white/10 bg-white/5 text-zinc-300 hover:text-white">
            <RefreshCw size={12}/> Segarkan
          </button>
        </div>
      </nav>

      <main className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 lg:space-y-8 relative z-10">

        {/* ── BRIEF / BANNER ── */}
        <div {...ani(0)} className="px-5 py-4 rounded-2xl flex items-center gap-4 shadow-lg backdrop-blur-md bg-gradient-to-r from-[#38bdf808] to-transparent border border-[#38bdf815]">
          <div className="p-2 rounded-full bg-[#38bdf810] shrink-0">
            <Info size={18} style={{ color:ACCENT }}/>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            <strong className="text-white">{kpi.total.toLocaleString('id')} atlet</strong> terdaftar dari{' '}
            <strong className="text-white">{cabors.length} cabor</strong>. Saat ini{' '}
            <strong style={{ color:'#22d3ee' }}>{kpi.vpct}% terverifikasi</strong>
            {kpi.pending>0 && <> dengan <strong className="text-amber-400">{kpi.pending} pending</strong></>}.{' '}
            {kpi.nonLokal>0 && <><strong className="text-rose-400">{kpi.nonLokal} non-lokal</strong> ({Math.round(kpi.nonLokal/kpi.total*100)}%) butuh atensi. </>}
            Ranking saat ini <strong className="text-amber-400 drop-shadow-md">#{kpi.myRank>0?kpi.myRank:'—'}</strong> dengan{' '}
            <strong className="text-yellow-400">🥇{myMedali.emas} 🥈{myMedali.perak} 🥉{myMedali.perunggu}</strong>.
          </p>
        </div>

        {/* ── KPI STRIP ── */}
        <div {...ani(5)} className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Total Atlet */}
          <div className="rounded-2xl p-4 flex items-center gap-3 bg-[#38bdf808] border border-[#38bdf818]">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#38bdf815]">
              <Users size={16} style={{ color:ACCENT }}/>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">Total Atlet</div>
              <div className="text-xl font-black text-white leading-none">{kpi.total.toLocaleString('id')}</div>
              <div className="text-[10px] mt-0.5" style={{ color:`${ACCENT}60` }}>{cabors.length} cabor</div>
            </div>
          </div>

          {/* Gender */}
          <div className="rounded-2xl p-4 flex items-center gap-3 bg-white/[0.03] border border-white/[0.07]">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/10">
              <Users size={16} className="text-blue-400"/>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">Gender</div>
              <div className="flex items-baseline gap-1.5 leading-none">
                <span className="text-base font-black text-blue-300">{kpi.putra}</span>
                <span className="text-[10px] text-zinc-500">♂</span>
                <span className="text-zinc-600 mx-0.5">/</span>
                <span className="text-base font-black text-pink-300">{kpi.putri}</span>
                <span className="text-[10px] text-zinc-500">♀</span>
              </div>
              <div className="text-[10px] mt-0.5 text-zinc-500">{kpi.total>0?Math.round(kpi.putra/kpi.total*100):0}% putra</div>
            </div>
          </div>

          {/* Status Data */}
          <div className="rounded-2xl p-4 flex items-center gap-3 bg-white/[0.03] border border-white/[0.07]">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-green-500/10">
              <CheckCircle size={16} className="text-green-400"/>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">Status Data</div>
              <div className="text-xl font-black text-green-400 leading-none">{kpi.vpct}%</div>
              <div className="text-[10px] mt-0.5 text-zinc-500">{kpi.pending>0?`${kpi.pending} pending`:'semua ok'}</div>
            </div>
          </div>

          {/* Klasemen */}
          <div className="rounded-2xl p-4 flex items-center gap-3 bg-[#ffd70008] border border-[#ffd70020]">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-yellow-500/10">
              <Trophy size={16} className="text-yellow-400"/>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">Klasemen</div>
              <div className="text-xl font-black text-yellow-400 leading-none">#{kpi.myRank>0?kpi.myRank:'—'}</div>
              <div className="text-[10px] mt-0.5 text-zinc-500">🥇{myMedali.emas} 🥈{myMedali.perak} 🥉{myMedali.perunggu}</div>
            </div>
          </div>

        </div>

        {/* ═══ CRITICAL ALERTS + MISSION CONTROL — tepat setelah KPI ═══ */}

        {/* ── CRITICAL ALERTS + TIMELINE ── */}
        <div {...ani(10)} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CriticalAlertsCard
            primary={ACCENT}
            alerts={buildAlertsFromData({
              pendingVerifikasi: kpi.pending,
              dnsAtlet: tesFisikData.dns,
              lowSkorAtlet: tesFisikData.lowAtlet,
              daysToEvent: Math.max(0, Math.ceil((new Date('2026-11-07').getTime()-Date.now())/86400000)),
              nonLokal: kpi.nonLokal,
              cabors_lemah_count: tesFisikData.lemahCount,
            })}
          />
          <CriticalPathTimeline
            primary={ACCENT}
            targetDate="2026-11-07"
            targetLabel="OPENING PORPROV XV"
            tasks={buildDefaultTimeline('2026-11-07')}
          />
        </div>

        {/* ── MISSION CONTROL ── */}
        <div {...ani(15)}>
          <MissionControlActions
            primary={ACCENT}
            actions={buildMissionActions({
              pendingVerifikasi: kpi.pending,
              dnsAtlet: tesFisikData.dns,
              lowSkorAtlet: tesFisikData.lowAtlet,
              topPerformers: tesFisikData.topAtlet,
              cabors_lemah_count: tesFisikData.lemahCount,
              nonLokal: kpi.nonLokal,
            })}
          />
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}

        {/* ── SPORT SCIENCE OVERVIEW ── */}
        <div {...ani(20)}>
          <SportScienceCard kontingenId={4} tenantSlug="kabbandung" primary="#0ea5e9"/>
        </div>

        {/* ── HEALTH INDEX COMPOSITE ── */}
        <div {...ani(25)}>
          <HealthIndexGauge
            primary={ACCENT}
            dimensions={[
              { label:'Registrasi',  score: Math.round((kpi.total/1100)*100), weight: 0.20, icon: Users     },
              { label:'Verifikasi',  score: kpi.vpct,                          weight: 0.25, icon: FileCheck },
              { label:'Fisik UPI',   score: tesFisikData.avgSkor,              weight: 0.30, icon: Activity  },
              { label:'Partisipasi', score: tesFisikData.hadir > 0 ? Math.round((tesFisikData.hadir/(tesFisikData.hadir+tesFisikData.dns))*100) : 0, weight: 0.15, icon: Trophy    },
              { label:'Cabor Sehat', score: cabors.length>0 ? Math.max(0, Math.round(100 - (tesFisikData.lemahCount/cabors.length)*100)) : 0, weight: 0.10, icon: Target },
            ]}
          />
        </div>


        {/* ════════════════════════════════════════════════════════════════ */}
        {/* PATCH v2: PETA KOMPETITOR + TOP 5 KLASEMEN + TARGET REALISASI    */}
        {/*          DIPINDAH ke War Room — section ini dihapus dari sini    */}
        {/* ════════════════════════════════════════════════════════════════ */}

        {/* ── CABOR WATCHLIST (pengganti Intel Cabor) ── */}
        {/* Operational tracker per cabor: status verifikasi + fitness UPI + alert demo */}
        <div {...ani(120)}>
          <CaborWatchlist
            cabors={caborWatchList}
            primary={ACCENT}
            onClickCabor={(nama) => {
              // Open detail panel sama kayak Intel Cabor lama
              const target = cabors.find(c => c.nama === nama)
              if (target) setSelCabor(target)
            }}
          />
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div {...ani(160)} className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { l:'War Room Live', d:'Monitoring perolehan medali & prediksi', icon:Monitor,  c:ACCENT,    href:'/konida/warroom/kabbandung'          },
            { l:'Laporan Tanding',d:'Jurnal dan hasil rekap harian lapangan',    icon:FileText, c:'#3b82f6', href:'/konida/lappertandingan/kabbandung' },
            { l:'Premium Report', d:'Cetak SPJ, Piagam, dan Dokumen Resmi',      icon:Download, c:'#f59e0b', href:'/konida/Premiumreport/kabbandung'   },
          ].map(a => (
            <a key={a.l} href={a.href}
              className="flex items-center justify-between p-5 rounded-3xl transition-all duration-300 group relative overflow-hidden"
              style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${a.c}20` }}>
              
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background:`linear-gradient(to right, ${a.c}0a, transparent)` }} />
                
              <div className="flex items-center gap-4 relative z-10">
                <div className="p-3.5 rounded-2xl shadow-inner transition-transform group-hover:scale-110" 
                  style={{ background:`${a.c}15`, border:`1px solid ${a.c}30` }}>
                  <a.icon size={22} style={{ color:a.c }}/>
                </div>
                <div>
                  <div className="font-bold text-white text-sm tracking-wide">{a.l}</div>
                  <div className="text-xs text-zinc-400 mt-1">{a.d}</div>
                </div>
              </div>
              <div className="relative z-10 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors border border-white/5">
                <ChevronRight size={16} style={{ color:a.c }} className="group-hover:translate-x-0.5 transition-transform"/>
              </div>
            </a>
          ))}
        </div>
      </main>

      {/* ── SLIDE-OUT CABOR DETAIL ── */}
      {selCabor && (
        <div className="fixed inset-0 z-[100]" onClick={() => setSelCabor(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"/>
          <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] overflow-y-auto transform transition-transform duration-300 shadow-2xl"
            style={{ background:'#02060f', borderLeft:`1px solid ${ACCENT}25` }}
            onClick={e => e.stopPropagation()}>
            <div className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2 px-2 py-1 rounded-md inline-block" style={{ background:`${ACCENT}15`, color:ACCENT }}>Detail Analisis Cabor</div>
                  <h2 className="text-3xl font-black text-white tracking-tight">{selCabor.nama}</h2>
                  <div className="text-sm text-zinc-400 mt-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                    {selCabor.kategori}
                  </div>
                </div>
                <button onClick={() => setSelCabor(null)}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                  <X size={18}/>
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { l:'Total Atlet Terdaftar', v:selCabor.total,   c:ACCENT, icon:Users },
                    { l:'Verifikasi Valid',      v:selCabor.verified, c:'#22d3ee', icon:CheckCircle },
                    { l:'Atlet Putra',           v:selCabor.putra,    c:ACCENT, icon:null },
                    { l:'Atlet Putri',           v:selCabor.putri,    c:'#f472b6', icon:null },
                  ].map((s, i) => (
                    <div key={s.l} className="rounded-2xl p-4 border shadow-inner"
                      style={{ background:'rgba(255,255,255,0.02)', borderColor: i < 2 ? `${s.c}20` : 'rgba(255,255,255,0.05)' }}>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                        {s.icon && <s.icon size={12} style={{ color:s.c }}/>} {s.l}
                      </div>
                      <div className="text-3xl font-light" style={{ color:s.c }}>{s.v}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl p-6 bg-gradient-to-br from-[#ffd70010] to-transparent border border-[#ffd70020] shadow-lg">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-yellow-500 uppercase tracking-widest mb-5">
                    <Trophy size={14}/> Perolehan Medali
                  </div>
                  <div className="flex gap-4">
                    {[
                      { l:'Emas',    v:selCabor.emas,     c:'#ffd700', bg:'#ffd70015' },
                      { l:'Perak',   v:selCabor.perak,    c:'#e2e8f0', bg:'#e2e8f015' },
                      { l:'Perunggu',v:selCabor.perunggu, c:'#cd7f32', bg:'#cd7f3215' },
                    ].map(m => (
                      <div key={m.l} className="flex-1 text-center bg-black/20 rounded-xl py-3 border border-white/5">
                        <div className="text-3xl font-black drop-shadow-sm mb-1" style={{ color:m.c }}>{m.v}</div>
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider">{m.l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-white/10 flex justify-between items-center text-sm bg-black/10 px-4 py-2.5 rounded-xl">
                    <span className="text-zinc-400 font-medium">Conversion Rate</span>
                    <span className="font-black text-lg"
                      style={{ color:selCabor.conversion>=25?'#22d3ee':'#f87171' }}>
                      {selCabor.conversion}%
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl p-5 border border-[#38bdf815] bg-[#38bdf805]">
                  <div className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest mb-3">Sistem Intelijen Merangkum</div>
                  <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                    {selCabor.conversion>=50?'✅ Efisiensi tingkat dewa. Ini adalah cabang olahraga unggulan penyumbang medali utama kontingen.'
                    :selCabor.conversion>=25?'🔥 Efisiensi tergolong baik. Return on Investment (ROI) pembinaan atlet positif.'
                    :selCabor.total>30?'⚠️ Warning: Jumlah atlet masif namun konversi medali minim. Perlu evaluasi program pembinaan.'
                    :'📋 Data historis masih terbatas, perlu pengawasan dan pendampingan lebih lanjut.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        *{box-sizing:border-box}
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${ACCENT}40;border-radius:10px}
        ::-webkit-scrollbar-thumb:hover{background:${ACCENT}80}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>
    </div>
  )
}