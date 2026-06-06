'use client'
// src/app/konida/Premiumreport/kabbandung/page.tsx
// Premium Report Kab. Bandung — TENANT_COLORS biru (#0369a1)
// Featured: Card Tes Biomotorik UPI (data 365 atlet, 2597 item tes)

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Download, FileCheck, Coins, Printer, Loader2,
  Database, ShieldCheck, CheckCircle2, Trophy,
  Users, Award, FileText, RefreshCw, Info,
  Star, AlertTriangle, Zap, Activity, ChevronRight,
} from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ACCENT       = '#0369a1'      // Biru Kab. Bandung
const ACCENT_LIGHT = '#38bdf8'
const KONTINGEN_ID = 4
const TENANT_NAME  = 'Kab. Bandung'

interface AtletDB {
  id: number; nama_lengkap: string; gender: string
  cabor_nama_raw: string; nama_bank: string|null; no_rekening: string|null
  status_registrasi: string
}

interface TesFisikSummary {
  total: number; hadir: number; dns: number
  avgFitness: number; topCabor: string; worstKomponen: string
}

export default function PremiumReportKabBandung() {
  const [atlets,    setAtlets]    = useState<AtletDB[]>([])
  const [klasemen,  setKlasemen]  = useState<any>(null)
  const [tesFisik,  setTesFisik]  = useState<TesFisikSummary|null>(null)
  const [loading,   setLoading]   = useState(true)
  const [animIn,    setAnimIn]    = useState(false)

  useEffect(()=>{ const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])

  useEffect(()=>{
    async function load() {
      const [a, k, tf] = await Promise.allSettled([
        sb.from('atlet')
          .select('id,nama_lengkap,gender,cabor_nama_raw,nama_bank,no_rekening,status_registrasi')
          .eq('kontingen_id', KONTINGEN_ID)
          .in('status_registrasi',['Verified','Posted']),
        sb.from('klasemen_medali')
          .select('emas,perak,perunggu,total')
          .eq('kontingen_id', KONTINGEN_ID)
          .maybeSingle(),
        fetch(`/api/konida/tes-fisik?kontingen_id=${KONTINGEN_ID}`).then(r => r.ok ? r.json() : null),
      ])
      if (a.status==='fulfilled' && a.value.data) setAtlets(a.value.data as AtletDB[])
      if (k.status==='fulfilled' && k.value.data) setKlasemen(k.value.data)
      if (tf.status==='fulfilled' && tf.value) {
        const d = tf.value
        setTesFisik({
          total: d.summary?.total_atlet || 0,
          hadir: d.summary?.hadir || 0,
          dns:   d.summary?.dns || 0,
          avgFitness:    d.summary?.avg_fitness_persen || 0,
          topCabor:      d.top_cabor?.[0]?.cabor_nama || '—',
          worstKomponen: d.komponen_overall?.[0]?.komponen || '—',
        })
      }
      setLoading(false)
    }
    void load()
  },[])

  const stats = {
    atlet:   atlets.length,
    medali:  klasemen?.total ?? 0,
    emas:    klasemen?.emas  ?? 0,
    perak:   klasemen?.perak ?? 0,
    perunggu:klasemen?.perunggu ?? 0,
    cabor:   new Set(atlets.map(a=>a.cabor_nama_raw)).size,
    hasRek:  atlets.filter(a=>a.nama_bank&&a.no_rekening).length,
  }

  const ani = (d=0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: `${ACCENT}30`, borderTopColor: ACCENT }}/>
          <p className="font-mono text-xs uppercase tracking-widest" style={{ color: ACCENT }}>
            Memuat Premium Report...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-slate-300"
      style={{ background:'linear-gradient(135deg,#020617 0%,#0a0f1a 100%)' }}>

      {/* Grid bg */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage:`linear-gradient(${ACCENT}10 1px,transparent 1px),linear-gradient(90deg,${ACCENT}10 1px,transparent 1px)`,
        backgroundSize:'32px 32px', zIndex:0,
      }}/>

      {/* HEADER */}
      <header className="border-b backdrop-blur-xl sticky top-0 z-30"
        style={{ background:'rgba(2,6,23,0.93)', borderColor:'rgba(255,255,255,0.05)' }}>
        <div className="px-6 py-5 max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background:`${ACCENT}15`, border:`1px solid ${ACCENT}35`, boxShadow:`0 0 24px ${ACCENT}25` }}>
              <Star size={18} style={{ color:ACCENT_LIGHT }}/>
            </div>
            <div>
              <h1 className="text-white font-black text-base tracking-wide">PREMIUM REPORT KONIDA</h1>
              <div className="text-[10px] font-mono uppercase tracking-widest mt-0.5" style={{ color:ACCENT_LIGHT }}>
                {TENANT_NAME} · Eksekutif Tools · PORPROV XV 2026
              </div>
            </div>
          </div>
          <button onClick={()=>window.location.reload()}
            className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono"
            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)' }}>
            <RefreshCw size={12}/> Sync
          </button>
        </div>
      </header>

      <main className="p-6 max-w-[1600px] mx-auto space-y-6 relative z-10">

        {/* Stats Bar */}
        <div {...ani(0)} className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <Stat label="Atlet Aktif" value={stats.atlet} icon={Users} color={ACCENT_LIGHT}/>
          <Stat label="Total Medali" value={stats.medali} icon={Trophy} color="#fbbf24"/>
          <Stat label="Emas" value={stats.emas} icon={Award} color="#ffd700"/>
          <Stat label="Cabor" value={stats.cabor} icon={Activity} color="#10b981"/>
          <Stat label="Rekening Lengkap" value={`${stats.hasRek}/${stats.atlet}`} icon={CheckCircle2} color="#06b6d4"/>
          <Stat label="Tes Fisik" value={tesFisik?`${tesFisik.hadir}/${tesFisik.total}`:'—'} icon={Zap} color={ACCENT}/>
        </div>

        {/* SECTION TITLE */}
        <div {...ani(40)} className="flex items-center gap-3 pt-2">
          <div className="h-[1px] flex-1" style={{ background:`linear-gradient(90deg, transparent, ${ACCENT}40)` }}/>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color:ACCENT_LIGHT }}>
            🎯 Tools Eksekutif Premium
          </div>
          <div className="h-[1px] flex-1" style={{ background:`linear-gradient(90deg, ${ACCENT}40, transparent)` }}/>
        </div>

        {/* 4 EXPORT CARDS */}
        <div {...ani(80)} className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">

          {/* ─── CARD 1: TES BIOMOTORIK (FEATURED) ─── */}
          <Link href="/konida/Premiumreport/kabbandung/tes-fisik"
            className="rounded-2xl p-5 flex flex-col relative overflow-hidden group transition-all hover:scale-[1.02]"
            style={{
              background:`linear-gradient(135deg, ${ACCENT}15 0%, rgba(255,255,255,0.03) 100%)`,
              border:`1px solid ${ACCENT}40`,
              boxShadow:`0 0 30px ${ACCENT}15`,
            }}>
            <div className="absolute top-0 left-0 right-0 h-0.5"
              style={{ background:`linear-gradient(90deg,transparent,${ACCENT},transparent)` }}/>
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-30" style={{ background:ACCENT }}/>

            <div className="relative flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background:`${ACCENT}25`, border:`1px solid ${ACCENT}40` }}>
                <Activity size={22} style={{ color:ACCENT_LIGHT }}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-zinc-100">Tes Biomotorik</h3>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background:'rgba(74,222,128,0.15)', color:'#4ade80' }}>UPI · LIVE</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    tesFisik ? `${tesFisik.hadir} tes` : '—',
                    tesFisik ? `${tesFisik.avgFitness}% avg` : '—',
                  ].map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                      style={{ background:`${ACCENT}15`, color:ACCENT_LIGHT }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed flex-1 mb-4">
              Laporan kondisi fisik atlet kontingen dari Sport Science FPOK UPI.
              Analisis 10 komponen biomotorik per cabor: Flexibility, Power, Aerobic, Speed, Strength, dll.
            </p>

            {/* Highlight stats */}
            {tesFisik && (
              <div className="rounded-xl p-3 mb-4 space-y-1.5"
                style={{ background:'rgba(0,0,0,0.3)', border:`1px solid ${ACCENT}20` }}>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-500">Cabor Terkuat</span>
                  <span className="font-bold text-emerald-400 truncate ml-2 max-w-[120px]">{tesFisik.topCabor}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-500">Komponen Terlemah</span>
                  <span className="font-bold text-orange-400 truncate ml-2 max-w-[120px]">{tesFisik.worstKomponen}</span>
                </div>
                {tesFisik.dns > 0 && (
                  <div className="flex justify-between items-center text-[10px] pt-1 border-t" style={{ borderColor:`${ACCENT}15` }}>
                    <span className="text-zinc-500">Belum Tes (DNS)</span>
                    <span className="font-bold text-amber-400">{tesFisik.dns} atlet</span>
                  </div>
                )}
              </div>
            )}

            <div className="w-full py-3 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-2 group-hover:gap-3 transition-all"
              style={{ background:`${ACCENT}20`, border:`1px solid ${ACCENT}45`, color:ACCENT_LIGHT }}>
              <FileText size={14}/> LIHAT DETAIL LAPORAN
              <ChevronRight size={14} className="transition-transform group-hover:translate-x-1"/>
            </div>
          </Link>

          {/* ─── CARD 2: SPJ BONUS ─── */}
          <PlaceholderCard
            icon={Coins} color="#ffd700"
            title="SPJ Bonus Keuangan"
            badge="REAL DATA"
            stats={[`${stats.hasRek} rekening`, `${stats.emas}🥇 ${stats.perak}🥈 ${stats.perunggu}🥉`]}
            description="Daftar rekening atlet siap transfer + summary estimasi bonus berdasarkan tarif SK Bupati."
            cta="DOWNLOAD EXCEL SPJ"
            onClick={() => alert('Generate SPJ Bonus — clone dari Kab. Bogor (Sprint berikutnya)')}
          />

          {/* ─── CARD 3: BUKU HASIL ─── */}
          <PlaceholderCard
            icon={FileCheck} color="#60a5fa"
            title="Buku Hasil Resmi"
            badge="JURNAL"
            stats={[`${stats.medali} medali`, 'Auto-print HTML']}
            description="Kompilasi jurnal pertandingan menjadi buku resmi kontingen siap serahkan ke KONI."
            cta="GENERATE BUKU HASIL"
            onClick={() => alert('Generate Buku Hasil — clone dari Kab. Bogor (Sprint berikutnya)')}
          />

          {/* ─── CARD 4: SERTIFIKAT ─── */}
          <PlaceholderCard
            icon={Award} color="#f87171"
            title="Cetak Sertifikat"
            badge="PDF A5"
            stats={[`${stats.emas} peraih emas`, 'Landscape A5']}
            description="Template piagam penghargaan format A5 landscape dengan nama atlet dari DB."
            cta="CETAK SERTIFIKAT"
            onClick={() => alert('Cetak Sertifikat — clone dari Kab. Bogor (Sprint berikutnya)')}
          />
        </div>

        {/* INFO PANEL */}
        <div {...ani(120)} className="rounded-2xl p-5 flex items-start gap-4"
          style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <Info size={15} style={{ color:ACCENT_LIGHT, flexShrink:0, marginTop:2 }}/>
          <div className="flex-1">
            <div className="text-sm font-bold text-white mb-2">📋 Status Fitur Premium {TENANT_NAME}</div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { l:'Tes Biomotorik UPI',    s:'✅ LIVE',     d:'Data 365 atlet, 2597 item tes biomotorik dari FPOK UPI' },
                { l:'SPJ Bonus Excel',       s:'⏳ Pending',  d:'Akan di-port dari template Kab. Bogor' },
                { l:'Buku Hasil',            s:'⏳ Pending',  d:'Memerlukan jurnal pertandingan input' },
                { l:'Sertifikat Juara',      s:'⏳ Pending',  d:'Template ready, aktivasi setelah PORPROV selesai' },
              ].map(f => (
                <div key={f.l} className="rounded-xl p-3"
                  style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-xs font-bold text-zinc-300 mb-0.5">{f.l}</div>
                  <div className="text-[9px] font-bold mb-1"
                    style={{ color: f.s.includes('✅') ? '#4ade80' : '#fbbf24' }}>
                    {f.s}
                  </div>
                  <div className="text-[9px] text-zinc-500 leading-relaxed">{f.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ── STAT ──
function Stat({ label, value, icon: Icon, color }: any) {
  return (
    <div className="rounded-xl p-3 relative overflow-hidden"
      style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between mb-2">
        <Icon size={14} style={{ color }}/>
      </div>
      <div className="text-[9px] uppercase tracking-widest font-bold text-zinc-500">{label}</div>
      <div className="text-lg font-black mt-0.5" style={{ color }}>{value}</div>
    </div>
  )
}

// ── PLACEHOLDER CARD ──
function PlaceholderCard({ icon: Icon, color, title, badge, stats, description, cta, onClick }: any) {
  return (
    <div className="rounded-2xl p-5 flex flex-col relative overflow-hidden"
      style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${color}20`, opacity:0.85 }}>
      <div className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background:`linear-gradient(90deg,transparent,${color}50,transparent)` }}/>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background:`${color}15`, border:`1px solid ${color}25` }}>
          <Icon size={22} style={{ color }}/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
              style={{ background:`${color}15`, color }}>{badge}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {stats.map((s: string) => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                style={{ background:`${color}10`, color }}>{s}</span>
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed flex-1 mb-4">{description}</p>
      <button onClick={onClick}
        className="w-full py-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2"
        style={{ background:`${color}10`, border:`1px solid ${color}25`, color }}>
        <Download size={14}/> {cta}
      </button>
    </div>
  )
}
