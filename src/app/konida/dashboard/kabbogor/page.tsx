'use client'
// src/app/konida/dashboard/kabbogor/page.tsx — STYLED FINAL
// KONTINGEN_ID=1, KODE_LOKAL='3201', ACCENT=#00ffaa

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Users, Trophy, Target, CheckCircle, Clock, AlertTriangle,
  Zap, Shield, ChevronRight, RefreshCw, Info,
  Search, X, FileText, Download, Monitor,
} from 'lucide-react'
import PetaKompetitor from '@/components/PetaKompetitor'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const KONTINGEN_ID = 1
const KODE_LOKAL   = '3201'
const ACCENT       = '#00ffaa'
const PRIMARY      = '#065f46'

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
function Bar({ value, max, color, h=6 }:{ value:number; max:number; color:string; h?:number }) {
  return (
    <div className="rounded-full overflow-hidden w-full shadow-inner bg-white/5" style={{ height: h }}>
      <div className="h-full rounded-full transition-all duration-1000 relative"
        style={{ width:`${max>0?Math.min(value/max*100,100):0}%`, background:color }}>
        <div className="absolute inset-0 bg-white/20" />
      </div>
    </div>
  )
}

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
export default function DashboardKabBogor() {
  // === LOGIC DATA TETAP UTUH, TIDAK DIUBAH ===
  const [atlets,    setAtlets]    = useState<AtletRaw[]>([])
  const [cabors,    setCabors]    = useState<CaborStat[]>([])
  const [klasemen,  setKlasemen]  = useState<any[]>([])
  const [myMedali,  setMyMedali]  = useState({ emas:0, perak:0, perunggu:0, total:0 })
  const [loading,   setLoading]   = useState(true)
  const [animIn,    setAnimIn]    = useState(false)
  const [search,    setSearch]    = useState('')
  const [selCabor,  setSelCabor]  = useState<CaborStat|null>(null)
  const [activeTab, setActiveTab] = useState<'ranking'|'heatmap'|'conversion'|'gender'>('ranking')
  const [showAll,   setShowAll]   = useState(false)
  const [pulse,     setPulse]     = useState(true)

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])
  useEffect(() => { const i = setInterval(() => setPulse(p => !p), 800); return () => clearInterval(i) }, [])

  useEffect(() => {
    async function load() {
      const [a, k, m] = await Promise.allSettled([
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
      ])

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
      k.nama?.toUpperCase().includes('KAB. BOGOR')
    ) + 1
    return {
      total, putra, putri, verified, pending, ditolak, posted, lokal, nonLokal,
      vpct: total>0 ? Math.round(verified/total*100) : 0,
      lpct: total>0 ? Math.round(lokal/total*100)    : 0,
      myRank,
    }
  }, [atlets, klasemen])

  const byKategori = useMemo(() => {
    const m: Record<string,{total:number;medali:number;list:string[]}> = {}
    cabors.forEach(c => {
      if (!m[c.kategori]) m[c.kategori] = { total:0, medali:0, list:[] }
      m[c.kategori].total  += c.total
      m[c.kategori].medali += c.emas+c.perak+c.perunggu
      m[c.kategori].list.push(c.nama)
    })
    return Object.entries(m).sort((a,b) => b[1].total-a[1].total)
  }, [cabors])

  const topConv  = useMemo(() => [...cabors].filter(c=>c.total>3).sort((a,b)=>b.conversion-a.conversion).slice(0,10), [cabors])
  const domPutra = useMemo(() => cabors.filter(c=>c.total>3&&c.putra/c.total>0.8).slice(0,5), [cabors])
  const domPutri = useMemo(() => cabors.filter(c=>c.total>3&&c.putri/c.total>0.6).slice(0,5), [cabors])
  const filtered  = useMemo(() => search ? cabors.filter(c=>c.nama.toLowerCase().includes(search.toLowerCase())) : cabors, [cabors,search])

  type AlertSeverity = 'danger' | 'warning' | 'info'
  interface AlertItem { id:string; severity:AlertSeverity; title:string; msg:string }
  const alerts = useMemo<AlertItem[]>(() => {
    const list: AlertItem[] = []
    if (kpi.ditolak > 0)
      list.push({ id:'ditolak', severity:'danger', title:'Atlet Ditolak', msg:`${kpi.ditolak} atlet berstatus "Ditolak Admin". Segera hubungi atlet terkait untuk klarifikasi dokumen.` })
    if (kpi.pending > 0 && kpi.total > 0 && kpi.pending / kpi.total > 0.05)
      list.push({ id:'pending', severity:'danger', title:'Pending Menumpuk', msg:`${kpi.pending} atlet (${Math.round(kpi.pending/kpi.total*100)}%) masih menunggu verifikasi admin. Percepat proses agar tidak tertinggal dari kontingen lain.` })
    if (kpi.nonLokal > 0 && kpi.total > 0 && kpi.nonLokal / kpi.total > 0.1)
      list.push({ id:'nonlokal', severity:'warning', title:'Atlet Non-Lokal Tinggi', msg:`${kpi.nonLokal} atlet (${Math.round(kpi.nonLokal/kpi.total*100)}%) tercatat bukan dari wilayah Kab. Bogor. Perlu validasi domisili.` })
    if (kpi.vpct < 60 && kpi.total > 0)
      list.push({ id:'vpct', severity:'warning', title:'Verifikasi Rendah', msg:`Hanya ${kpi.vpct}% atlet yang sudah terverifikasi. Target minimal 80% sebelum kompetisi dimulai.` })
    const zeroMedaliCabor = cabors.filter(c => c.total >= 5 && c.emas + c.perak + c.perunggu === 0)
    if (zeroMedaliCabor.length > 0)
      list.push({ id:'zeromedali', severity:'warning', title:'Cabor Tanpa Medali', msg:`${zeroMedaliCabor.length} cabor dengan ≥5 atlet belum meraih medali (${zeroMedaliCabor.slice(0,3).map(c=>c.nama).join(', ')}${zeroMedaliCabor.length>3?', …':''}). Evaluasi program pembinaan.` })
    if (kpi.vpct >= 80 && kpi.ditolak === 0 && kpi.pending === 0)
      list.push({ id:'ok', severity:'info', title:'Status Optimal', msg:`Seluruh atlet sudah terverifikasi dan tidak ada yang pending atau ditolak. Persiapan administrasi berjalan lancar.` })
    return list
  }, [kpi, cabors])
  const displayed = showAll ? filtered : filtered.slice(0,12)
  const maxAtlet  = cabors[0]?.total ?? 1

  const ani = (d=0) => ({
    style:     { transitionDelay:`${d}ms`, transition:'all 0.8s cubic-bezier(0.16,1,0.3,1)' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#020d06]">
      <div className="text-center">
        <div className="w-16 h-16 border-2 rounded-full animate-spin mx-auto mb-6"
          style={{ borderColor:`${ACCENT}20`, borderTopColor:ACCENT, boxShadow: `0 0 30px ${ACCENT}20` }}/>
        <p className="font-mono text-xs uppercase tracking-widest" style={{ color:ACCENT }}>Memuat Dashboard...</p>
        <p className="text-[10px] mt-2 text-zinc-500">Kab. Bogor · PORPROV XV 2026</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen text-zinc-300 font-sans selection:bg-[#00ffaa]/30" style={{ background:'linear-gradient(145deg, #020a05 0%, #05160e 100%)' }}>

      {/* Grid bg & Radial glow (Diperhalus) */}
      <div className="fixed inset-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ zIndex:0,
        backgroundImage:`linear-gradient(${ACCENT}08 1px,transparent 1px),linear-gradient(90deg,${ACCENT}08 1px,transparent 1px)`,
        backgroundSize:'60px 60px' }}/>
      <div className="fixed pointer-events-none" style={{
        top:'-30%', left:'50%', transform:'translateX(-50%)',
        width:'100vw', height:'80vh',
        background:`radial-gradient(ellipse, ${ACCENT}08 0%, transparent 60%)`,
        zIndex:0 }}/>

      {/* ── HEADER ── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-5 border-b backdrop-blur-xl bg-[#020d06]/80 shadow-lg shadow-black/20"
        style={{ borderColor:`${ACCENT}15` }}>
        <div className="flex items-center gap-5">
          <div className="relative w-12 h-12">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background:`linear-gradient(135deg, ${PRIMARY}, ${ACCENT}30)`, border:`1px solid ${ACCENT}40`, boxShadow:`0 0 20px ${ACCENT}30` }}>
              <span className="text-white font-black text-sm">KB</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-[#020d06]"
              style={{ background:ACCENT, boxShadow: `0 0 10px ${ACCENT}` }}/>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-white font-black text-xl tracking-wide text-shadow-sm">DASHBOARD KAB. BOGOR</h1>
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
              { l:'Verifikasi',  v:`${kpi.vpct}%`,    c:'#4ade80' },
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
        <div {...ani(0)} className="px-5 py-4 rounded-2xl flex items-center gap-4 shadow-lg backdrop-blur-md bg-gradient-to-r from-[#00ffaa08] to-transparent border border-[#00ffaa15]">
          <div className="p-2 rounded-full bg-[#00ffaa10] shrink-0">
            <Info size={18} style={{ color:ACCENT }}/>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            <strong className="text-white">{kpi.total.toLocaleString('id')} atlet</strong> terdaftar dari{' '}
            <strong className="text-white">{cabors.length} cabor</strong>. Saat ini{' '}
            <strong style={{ color:'#4ade80' }}>{kpi.vpct}% terverifikasi</strong>
            {kpi.pending>0 && <> dengan <strong className="text-amber-400">{kpi.pending} pending</strong></>}.{' '}
            {kpi.nonLokal>0 && <><strong className="text-rose-400">{kpi.nonLokal} non-lokal</strong> ({Math.round(kpi.nonLokal/kpi.total*100)}%) butuh atensi. </>}
            Ranking saat ini <strong className="text-amber-400 drop-shadow-md">#{kpi.myRank>0?kpi.myRank:'—'}</strong> dengan{' '}
            <strong className="text-yellow-400">🥇{myMedali.emas} 🥈{myMedali.perak} 🥉{myMedali.perunggu}</strong>.
          </p>
        </div>

        {/* ── KPI CARDS ── */}
        <div {...ani(40)} className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Total Atlet */}
          <div className="lg:col-span-2 rounded-3xl p-6 lg:p-8 relative overflow-hidden bg-gradient-to-br from-[#00ffaa08] to-transparent border border-[#00ffaa20] shadow-xl shadow-black/20">
            <div className="absolute -top-10 -right-10 opacity-[0.03] rotate-12 transform scale-150"><Users size={180}/></div>
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-[#00ffaa15]"><Users size={16} style={{ color:ACCENT }}/></div>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Atlet</span>
                </div>
                <div className="text-7xl font-light text-white tracking-tighter drop-shadow-lg">{kpi.total.toLocaleString('id')}</div>
                <div className="text-xs mt-2" style={{ color:`${ACCENT}90` }}>Tersebar di {cabors.length} cabang olahraga</div>
              </div>
              {/* Circle progress diperhalus */}
              <div className="shrink-0 relative group">
                <svg width="84" height="84" className="-rotate-90">
                  <circle cx="42" cy="42" r="34" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6"/>
                  <circle cx="42" cy="42" r="34" fill="none" stroke={ACCENT} strokeWidth="6"
                    strokeDasharray={`${2*Math.PI*34*kpi.vpct/100} ${2*Math.PI*34}`}
                    strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(0,255,170,0.5)] transition-all duration-1000"/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-xl font-black drop-shadow-md" style={{ color:ACCENT }}>{kpi.vpct}%</div>
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Valid</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 relative z-10">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex justify-between items-end mb-2">
                  <div className="text-xs font-medium text-zinc-400">Putra</div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white block">{kpi.putra}</span>
                    <span className="text-[10px]" style={{ color:ACCENT }}>{kpi.total>0?Math.round(kpi.putra/kpi.total*100):0}%</span>
                  </div>
                </div>
                <Bar value={kpi.putra} max={kpi.total} color={ACCENT} h={6}/>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex justify-between items-end mb-2">
                  <div className="text-xs font-medium text-zinc-400">Putri</div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white block">{kpi.putri}</span>
                    <span className="text-[10px] text-pink-400">{kpi.total>0?Math.round(kpi.putri/kpi.total*100):0}%</span>
                  </div>
                </div>
                <Bar value={kpi.putri} max={kpi.total} color="#f472b6" h={6}/>
              </div>
            </div>
          </div>

          {/* Verifikasi */}
          <div className="rounded-3xl p-6 lg:p-8 bg-white/[0.03] border border-white/[0.08] shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-green-500/10"><CheckCircle size={16} className="text-green-400"/></div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Status Data</span>
              </div>
              <div className="text-4xl font-light text-green-400 mb-6 drop-shadow-md">{kpi.verified} <span className="text-lg text-zinc-600 font-normal">valid</span></div>
            </div>
            <div className="space-y-3.5">
              {[
                { l:'Verified', v:kpi.verified, c:'#4ade80' },
                { l:'Pending',  v:kpi.pending,  c:'#fbbf24' },
                { l:'Ditolak',  v:kpi.ditolak,  c:'#f87171' },
                { l:'Posted',   v:kpi.posted,   c:'#60a5fa' },
              ].map(s => (
                <div key={s.l} className="group">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color:s.c }} className="font-medium opacity-80 group-hover:opacity-100 transition-opacity">{s.l}</span>
                    <span className="text-white font-mono font-bold">{s.v}</span>
                  </div>
                  <Bar value={s.v} max={kpi.total} color={s.c} h={4}/>
                </div>
              ))}
            </div>
          </div>

          {/* Medali */}
          <div className="rounded-3xl p-6 lg:p-8 relative overflow-hidden bg-gradient-to-b from-[#ffd70010] to-transparent border border-[#ffd70020] shadow-lg flex flex-col justify-between">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#ffd700] to-transparent opacity-50"/>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-yellow-500/10"><Trophy size={16} className="text-yellow-400"/></div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Klasemen</span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <div className="text-5xl font-light text-yellow-400 drop-shadow-[0_0_12px_rgba(255,215,0,0.4)]">#{kpi.myRank>0?kpi.myRank:'—'}</div>
                <div className="text-xs text-yellow-400/60 uppercase tracking-wider">PORPROV XV</div>
              </div>
            </div>
            
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l:'Emas',    v:myMedali.emas,     c:'#ffd700', bg:'#ffd70015' },
                  { l:'Perak',   v:myMedali.perak,    c:'#e2e8f0', bg:'#e2e8f015' },
                  { l:'Prnggu',  v:myMedali.perunggu, c:'#cd7f32', bg:'#cd7f3215' },
                ].map(m => (
                  <div key={m.l} className="text-center rounded-2xl py-3 border backdrop-blur-sm"
                    style={{ background: m.bg, borderColor: `${m.c}30` }}>
                    <div className="text-2xl font-black drop-shadow-sm" style={{ color:m.c }}>{m.v}</div>
                    <div className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider">{m.l}</div>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-white/10 flex justify-between items-center bg-black/10 -mx-2 px-4 py-2 rounded-xl">
                <span className="text-xs font-medium text-zinc-400">Total Medali Terkumpul</span>
                <span className="text-lg font-black" style={{ color:ACCENT }}>{myMedali.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── PETA KOMPETITOR + KOLOM KANAN ── */}
        <div {...ani(80)} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* PETA — col-span-2 */}
          <div className="lg:col-span-2 rounded-3xl overflow-hidden relative shadow-xl shadow-black/20 bg-black/40 backdrop-blur-sm"
            style={{ border:`1px solid ${ACCENT}25`, height:560 }}>
            
            <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-b from-[#020d06] to-transparent">
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2 drop-shadow-md">
                  <span className="text-xl">🎯</span> Peta Kekuatan Kompetitor
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Sebaran medali {klasemen.length} kontingen (Hover/Klik untuk detail)
                </div>
              </div>
              <div className="flex gap-2 mt-3 sm:mt-0">
                {[{c:'#ef4444',l:'Ancaman'},{c:'#fbbf24',l:'Seimbang'},{c:'#6b7280',l:'Aman'}].map(t=>(
                  <div key={t.l} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full shadow-sm" style={{ background:t.c, boxShadow:`0 0 6px ${t.c}` }}/>
                    <span className="text-[10px] font-medium text-zinc-300 tracking-wide">{t.l}</span>
                  </div>
                ))}
              </div>
            </div>

            <PetaKompetitor klasemen={klasemen} kbgEmas={myMedali.emas} height={320}/>
          </div>

          {/* KOLOM KANAN */}
          <div className="flex flex-col gap-6">

            {/* Klasemen top 5 */}
            <div className="rounded-3xl p-5 bg-white/[0.02] border border-yellow-500/10 shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-yellow-500/10"><Trophy size={14} className="text-yellow-400"/></div>
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Top 5 Klasemen</span>
                </div>
                <span className="text-[10px] font-mono text-yellow-400/50 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                  Peringkat #{kpi.myRank>0?kpi.myRank:'—'}
                </span>
              </div>
              <div className="space-y-2">
                {klasemen.slice(0,5).map((k,i) => {
                  const isUs = k.nama?.toUpperCase().includes('KAB. BOGOR')
                  return (
                    <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${isUs ? 'bg-[#00ffaa10] border-[#00ffaa30]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                      <span className="text-xs w-6 text-center font-black shrink-0"
                        style={{ color:i===0?'#ffd700':i===1?'#e2e8f0':i===2?'#cd7f32':'#6b7280' }}>
                        {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}
                      </span>
                      <span className={`flex-1 text-xs font-bold truncate tracking-wide ${isUs ? 'text-[#00ffaa]' : 'text-zinc-300'}`}>
                        {k.nama}{isUs?' ✦':''}
                      </span>
                      <div className="flex gap-2 text-[11px] font-mono font-bold shrink-0 bg-black/20 px-2 py-1 rounded-lg">
                        <span className="text-yellow-400 w-4 text-center">{k.emas}</span>
                        <span className="text-zinc-300 w-4 text-center">{k.perak}</span>
                        <span className="text-amber-600 w-4 text-center">{k.perunggu}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Target Medali */}
            <div className="rounded-3xl p-5 bg-gradient-to-br from-[#00ffaa05] to-transparent border border-[#00ffaa15] shadow-lg">
              <div className="flex items-center gap-2 mb-5 px-1">
                <div className="p-1 rounded-md bg-[#00ffaa15]"><Target size={14} style={{ color:ACCENT }}/></div>
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Target Realisasi</span>
              </div>
              <div className="space-y-4">
                {[
                  { l:'Emas',    v:myMedali.emas,     t:50, c:'#ffd700' },
                  { l:'Perak',   v:myMedali.perak,    t:40, c:'#e2e8f0' },
                  { l:'Perunggu',v:myMedali.perunggu, t:30, c:'#cd7f32' },
                ].map(m => (
                  <div key={m.l}>
                    <div className="flex justify-between text-xs mb-1.5 px-1">
                      <span style={{ color:m.c }} className="font-bold tracking-wide">{m.l}</span>
                      <span className="text-zinc-400 font-mono"><span className="text-white font-bold">{m.v}</span> / {m.t} <span className="text-[10px] text-zinc-500 ml-1">({Math.round(m.v/m.t*100)}%)</span></span>
                    </div>
                    <Bar value={m.v} max={m.t} color={m.c} h={6}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── INTEL CABOR ── */}
        <div {...ani(120)} className="rounded-3xl overflow-hidden bg-white/[0.02] border border-white/[0.08] shadow-xl backdrop-blur-sm">
          
          {/* Header Tab */}
          <div className="flex flex-col md:flex-row items-center justify-between p-4 border-b border-white/[0.08] bg-black/20 gap-4">
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              {[
                { k:'ranking',    l:'🏆 Ranking Cabor' },
                { k:'heatmap',    l:'🗂 Peta Sebaran' },
                { k:'conversion', l:'🔥 Efisiensi' },
                { k:'gender',     l:'👥 Analisis Gender' },
              ].map(tab => (
                <button key={tab.k} onClick={() => setActiveTab(tab.k as any)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap tracking-wide border
                    ${activeTab===tab.k 
                      ? 'bg-[#00ffaa15] text-[#00ffaa] border-[#00ffaa30] shadow-[0_0_15px_rgba(0,255,170,0.1)]' 
                      : 'bg-transparent text-zinc-400 border-transparent hover:bg-white/5 hover:text-zinc-200'}`}>
                  {tab.l}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-64 shrink-0">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari cabang olahraga..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none transition-colors focus:border-[#00ffaa] focus:bg-black/60 focus:ring-1 focus:ring-[#00ffaa]/50"
              />
            </div>
          </div>

          {/* Ranking Tab */}
          {activeTab==='ranking' && (
            <div className="max-h-[500px] overflow-y-auto" style={{ scrollbarWidth:'thin', scrollbarColor:`${ACCENT}30 transparent` }}>
              {displayed.map((c,i) => {
                const isSel   = selCabor?.nama===c.nama
                const convCol = c.conversion>=30?'#4ade80':c.conversion>=15?'#fbbf24':'#9ca3af'
                return (
                  <div key={c.nama} onClick={() => setSelCabor(p=>p?.nama===c.nama?null:c)}
                    className={`flex flex-wrap md:flex-nowrap items-center gap-4 px-6 py-4 border-b cursor-pointer transition-all group
                      ${isSel ? 'bg-[#00ffaa08] border-[#00ffaa15]' : 'border-white/5 hover:bg-white/[0.03]'}`}
                    style={{ borderLeft: `4px solid ${isSel ? ACCENT : 'transparent'}` }}>
                    
                    <span className="w-6 text-xs font-mono font-bold text-zinc-500 shrink-0 text-center">{i+1}</span>
                    
                    <div className="w-40 shrink-0">
                      <div className={`text-sm font-bold truncate transition-colors ${isSel ? 'text-[#00ffaa]' : 'text-zinc-200 group-hover:text-white'}`}>{c.nama}</div>
                      <div className="text-[10px] text-zinc-500 tracking-wider uppercase mt-0.5">{c.kategori}</div>
                    </div>
                    
                    <div className="flex-1 min-w-[150px]">
                      <div className="flex justify-between text-[10px] mb-1.5 px-1">
                        <span className="text-zinc-400">Total Atlet</span>
                        <span className="text-white font-bold">{c.total}</span>
                      </div>
                      <Bar value={c.total} max={maxAtlet} color={ACCENT} h={5}/>
                    </div>
                    
                    <div className="w-32 shrink-0">
                      <div className="flex justify-between text-[10px] mb-1.5 px-1">
                        <span className="text-[#00ffaa] font-mono font-bold">{c.putra}L</span>
                        <span className="text-pink-400 font-mono font-bold">{c.putri}P</span>
                      </div>
                      <div className="h-1.5 rounded-full flex overflow-hidden bg-white/10 shadow-inner">
                        <div style={{ width:`${c.total>0?c.putra/c.total*100:50}%`, background:ACCENT }}/>
                        <div style={{ flex:1, background:'#f472b6' }}/>
                      </div>
                    </div>
                    
                    <div className="w-20 shrink-0 text-center bg-black/20 rounded-lg py-1 border border-white/5">
                      <div className="text-sm font-black text-green-400">{c.verified}</div>
                      <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Verified</div>
                    </div>
                    
                    <div className="w-32 shrink-0 text-right pr-2">
                      <div className="text-xs font-bold tracking-widest bg-black/30 inline-block px-2 py-1 rounded-md mb-1">
                        <span className="text-yellow-400">🥇{c.emas}</span>{' '}
                        <span className="text-zinc-300">🥈{c.perak}</span>{' '}
                        <span className="text-amber-600">🥉{c.perunggu}</span>
                      </div>
                      <div className="text-[10px] font-bold" style={{ color:convCol }}>{c.conversion}% conv.</div>
                    </div>
                    
                    <div className="w-28 shrink-0 flex justify-end">
                      <span className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border backdrop-blur-sm shadow-sm transition-transform group-hover:scale-105
                        ${c.emas>0 ? 'bg-[#00ffaa15] text-[#00ffaa] border-[#00ffaa30]' 
                        : c.conversion>15 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                        : 'bg-white/5 text-zinc-400 border-white/10'}`}>
                        {c.emas>0?'✅ Medali':c.conversion>15?'🔥 Potensial':'📋 Monitor'}
                      </span>
                    </div>
                  </div>
                )
              })}
              {!showAll && filtered.length>12 && (
                <div className="p-6 flex justify-center border-t border-white/5 bg-gradient-to-t from-black/20 to-transparent">
                  <button onClick={() => setShowAll(true)}
                    className="flex items-center gap-2 px-8 py-3 rounded-full text-xs font-bold bg-[#00ffaa10] text-[#00ffaa] border border-[#00ffaa30] hover:bg-[#00ffaa20] transition-colors shadow-lg">
                    Tampilkan Semua ({filtered.length}) <ChevronRight size={14}/>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab Heatmap, Conversion, Gender dibiarkan logic-nya, styling dipercantik sedikit */}
          {activeTab==='heatmap' && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {byKategori.map(([kat,d]) => {
                const pct = d.total>0?Math.round(d.medali/d.total*100):0
                const col = d.total>150?ACCENT:d.total>80?'#ffd700':d.total>30?'#f59e0b':'#9ca3af'
                return (
                  <div key={kat} className="rounded-2xl p-5 border shadow-lg backdrop-blur-sm transition-transform hover:-translate-y-1" 
                    style={{ background:`${col}0a`, borderColor:`${col}25` }}>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-sm font-black uppercase tracking-wider" style={{ color:col }}>{kat}</span>
                      <span className="text-[10px] text-zinc-400 bg-black/30 px-2 py-0.5 rounded-full">{d.list.length} Cabor</span>
                    </div>
                    <div className="flex items-end gap-2 mb-3">
                      <div className="text-4xl font-light text-white leading-none">{d.total}</div>
                      <div className="text-xs text-zinc-500 mb-1">atlet</div>
                    </div>
                    <Bar value={d.total} max={400} color={col} h={4}/>
                    <div className="text-[11px] mt-3 font-medium bg-black/20 rounded-lg px-2 py-1 inline-block" style={{ color:col }}>
                      🏆 {d.medali} Medali · {pct}% Conv
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {d.list.slice(0,3).map(c=>(
                        <span key={c} className="text-[9px] px-2 py-1 rounded-md bg-white/5 border border-white/10 text-zinc-300">{c}</span>
                      ))}
                      {d.list.length>3&&<span className="text-[9px] text-zinc-500 py-1">+{d.list.length-3}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {activeTab==='conversion' && (
            <div className="p-6">
              <div className="flex items-center gap-3 text-xs text-zinc-300 mb-6 p-4 rounded-2xl bg-[#00ffaa08] border border-[#00ffaa15]">
                <Info size={16} style={{ color:ACCENT }}/>
                <span><strong style={{ color:ACCENT }}>Medal Conversion Rate (MCR)</strong> merepresentasikan efisiensi pembinaan. Rumus: (Total Medali ÷ Total Atlet) × 100</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {topConv.map(c => {
                  const tm = c.emas+c.perak+c.perunggu
                  const g  = c.conversion>=50?{l:'S',c:'#4ade80'}:c.conversion>=25?{l:'A',c:'#fbbf24'}:c.conversion>=10?{l:'B',c:'#f87171'}:{l:'C',c:'#9ca3af'}
                  return (
                    <div key={c.nama} className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-inner border"
                        style={{ background:`${g.c}15`, color:g.c, borderColor:`${g.c}30` }}>{g.l}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white mb-1 truncate">{c.nama}</div>
                        <div className="text-[11px] text-zinc-400 mb-2">{c.total} Atlet terdaftar · <span className="text-yellow-400">🥇{c.emas}</span> <span className="text-zinc-300">🥈{c.perak}</span> <span className="text-amber-600">🥉{c.perunggu}</span></div>
                        <Bar value={c.conversion} max={100} color={g.c} h={5}/>
                      </div>
                      <div className="text-right shrink-0 bg-black/20 p-2 rounded-xl border border-white/5">
                        <div className="text-2xl font-black drop-shadow-sm" style={{ color:g.c }}>{c.conversion}%</div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{tm} Medali</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab==='gender' && (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[
                { title:'Dominan Putra (80%+)', list:domPutra, getVal:(c:CaborStat)=>Math.round(c.putra/c.total*100), color:ACCENT },
                { title:'Dominan Putri (60%+)', list:domPutri, getVal:(c:CaborStat)=>Math.round(c.putri/c.total*100), color:'#f472b6' },
              ].map(section => (
                <div key={section.title}>
                  <div className="flex items-center gap-3 mb-5 px-2">
                    <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ background:section.color, color:section.color }}/>
                    <span className="text-sm font-bold text-white uppercase tracking-wider">{section.title}</span>
                  </div>
                  <div className="space-y-3">
                    {section.list.map(c => (
                      <div key={c.nama} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border transition-colors hover:bg-white/[0.04]"
                        style={{ borderColor:`${section.color}15` }}>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-zinc-200">{c.nama}</div>
                          <div className="text-[11px] text-zinc-400 mt-1 font-mono">{c.putra} Laki-laki / {c.putri} Perempuan</div>
                          <div className="h-2 rounded-full flex overflow-hidden mt-2.5 shadow-inner bg-white/5">
                            <div style={{ width:`${c.putra/c.total*100}%`, background:ACCENT }}/>
                            <div style={{ flex:1, background:'#f472b6' }}/>
                          </div>
                        </div>
                        <div className="text-2xl font-black shrink-0 px-3 border-l border-white/10" style={{ color:section.color }}>
                          {section.getVal(c)}%
                        </div>
                      </div>
                    ))}
                    {section.list.length===0 && (
                      <div className="text-sm text-zinc-500 text-center py-8 border border-dashed border-white/10 rounded-2xl">Data belum cukup memadai</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div {...ani(160)} className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { l:'War Room Live', d:'Monitoring perolehan medali & prediksi', icon:Monitor,  c:ACCENT,    href:'/konida/warroom/kabbogor'          },
            { l:'Laporan Tanding',d:'Jurnal dan hasil rekap harian lapangan',    icon:FileText, c:'#3b82f6', href:'/konida/lappertandingan/kabbogor' },
            { l:'Premium Report', d:'Cetak SPJ, Piagam, dan Dokumen Resmi',      icon:Download, c:'#f59e0b', href:'/konida/Premiumreport/kabbogor'   },
          ].map(a => (
            <a key={a.l} href={a.href}
              className="flex items-center justify-between p-5 rounded-3xl transition-all duration-300 group relative overflow-hidden"
              style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${a.c}20` }}>
              
              {/* Hover effect gradient */}
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
            style={{ background:'#020a05', borderLeft:`1px solid ${ACCENT}25` }}
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
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { l:'Total Atlet Terdaftar', v:selCabor.total,   c:ACCENT, icon:Users },
                    { l:'Verifikasi Valid',      v:selCabor.verified, c:'#4ade80', icon:CheckCircle },
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

                {/* Medali Card */}
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
                      style={{ color:selCabor.conversion>=25?'#4ade80':'#f87171' }}>
                      {selCabor.conversion}%
                    </span>
                  </div>
                </div>

                {/* Kesimpulan */}
                <div className="rounded-2xl p-5 border border-[#00ffaa15] bg-[#00ffaa05]">
                  <div className="text-[10px] font-bold text-[#00ffaa] uppercase tracking-widest mb-3">Sistem Intelijen Merangkum</div>
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

      {/* Global Styles untuk Utility */}
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