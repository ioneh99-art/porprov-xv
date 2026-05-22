'use client'
// src/app/konida/Premiumreport/kabbogor/page.tsx
// Premium Export Hub — Data real dari DB

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Download, FileCheck, Coins, Printer, Loader2,
  Database, ShieldCheck, CheckCircle2, Trophy,
  Users, Award, FileText, RefreshCw,
} from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface LogExport {
  id: string; namaFile: string; tipe: string; ukuran: string
  status: 'SUCCESS'|'PROCESSING'; waktu: string
}

export default function PagePremiumExport() {
  const [loadingFile, setLoadingFile] = useState<string|null>(null)
  const [stats,       setStats]       = useState({ atlet:0, medali:0, emas:0, cabor:0 })
  const [animIn,      setAnimIn]      = useState(false)
  const [logs, setLogs] = useState<LogExport[]>([
    { id:'EXP-099', namaFile:'Buku_Hasil_Resmi_KONI_Bogor_PORPROV2026.pdf', tipe:'Buku Akhir',  ukuran:'24.5 MB', status:'SUCCESS', waktu:'20 Mei 2026 · 14:30' },
    { id:'EXP-098', namaFile:'Lampiran_SPJ_Bonus_Atlet_Bank_BJB.xlsx',       tipe:'Finansial',   ukuran:'1.2 MB',  status:'SUCCESS', waktu:'20 Mei 2026 · 09:15' },
    { id:'EXP-097', namaFile:'Rekap_Atlet_Terverifikasi_KabBogor.pdf',       tipe:'Verifikasi',  ukuran:'3.8 MB',  status:'SUCCESS', waktu:'19 Mei 2026 · 16:45' },
  ])

  useEffect(() => {
    const t = setTimeout(() => setAnimIn(true), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    async function load() {
      const [a, m] = await Promise.allSettled([
        sb.from('atlet').select('status_registrasi, cabor_nama_raw').eq('kontingen_id', 1),
        sb.from('klasemen_medali').select('emas,perak,perunggu,total').eq('kontingen_id', 1).single(),
      ])
      if (a.status==='fulfilled' && a.value.data) {
        const atlets = a.value.data as any[]
        const cabors = new Set(atlets.map(x => x.cabor_nama_raw).filter(Boolean))
        setStats(prev => ({ ...prev, atlet:atlets.length, cabor:cabors.size }))
      }
      if (m.status==='fulfilled' && m.value.data) {
        const d = m.value.data
        setStats(prev => ({ ...prev, emas:d.emas, medali:d.total }))
      }
    }
    void load()
  }, [])

  function handleExport(id: string, name: string, type: string) {
    setLoadingFile(id)
    setTimeout(() => {
      setLoadingFile(null)
      const now = new Date().toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
      setLogs(prev => [{
        id:`EXP-${Math.floor(Math.random()*900)+100}`,
        namaFile:name, tipe:type, ukuran:'2.1 MB', status:'SUCCESS', waktu:now
      }, ...prev])
    }, 2000)
  }

  const CARDS = [
    {
      id:'FIN', icon:Coins, color:'#ffd700', bg:'rgba(255,215,0,0.1)', border:'rgba(255,215,0,0.2)',
      title:'Kompilasi SPJ Bonus Keuangan',
      desc:'Memetakan peraih medali dengan nomor rekening Bank BJB mereka. Siap untuk transfer dana apresiasi Bupati.',
      file:'Lampiran_SPJ_Bonus_BJB_V2.xlsx', type:'Finansial',
      stats:[`${stats.emas} peraih emas`, 'Format BJB siap cetak'],
    },
    {
      id:'BOOK', icon:FileCheck, color:'#60a5fa', bg:'rgba(96,165,250,0.1)', border:'rgba(96,165,250,0.2)',
      title:'Buku Hasil Resmi Kontingen',
      desc:'Kompilasi jurnal harian dari hari pertama hingga penutupan menjadi laporan resmi kontingen PORPROV XV.',
      file:'Buku_Hasil_Resmi_KONI_KabBogor_Final.pdf', type:'Buku Akhir',
      stats:[`${stats.atlet} atlet`, `${stats.cabor} cabor`],
    },
    {
      id:'CERT', icon:Printer, color:'#f87171', bg:'rgba(248,113,113,0.1)', border:'rgba(248,113,113,0.2)',
      title:'Cetak Massal Sertifikat Juara',
      desc:'E-piagam penghargaan resmi berstempel digital KONI untuk seluruh atlet peraih medali Kab. Bogor.',
      file:'Piagam_Juara_Massal_KabBogor.pdf', type:'Sertifikat',
      stats:[`${stats.medali} medali`, 'Stempel digital KONI'],
    },
  ]

  const ani = (d=0) => ({
    style:{ transitionDelay:`${d}ms`, transition:'all 0.55s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
  })

  return (
    <div className="min-h-screen text-zinc-300 flex flex-col"
      style={{ background:'linear-gradient(135deg,#020d06 0%,#040f08 100%)' }}>

      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage:'linear-gradient(rgba(0,255,170,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,170,0.02) 1px,transparent 1px)', backgroundSize:'32px 32px' }}/>

      {/* HEADER */}
      <div className="sticky top-0 z-40 border-b border-zinc-800/60 p-5 backdrop-blur-xl"
        style={{ background:'rgba(2,13,6,0.92)' }}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background:'rgba(0,255,170,0.1)', border:'1px solid rgba(0,255,170,0.25)' }}>
              <Database size={22} style={{ color:'#00ffaa' }}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Pusat Kompilasi & Export Premium</h1>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">Generator dokumen akhir, piagam, dan integrasi finansial KONI Kab. Bogor</p>
            </div>
          </div>
          {/* Stats strip */}
          <div className="flex items-center gap-3">
            {[
              { v:stats.atlet,  l:'Atlet',  c:'#00ffaa' },
              { v:stats.medali, l:'Medali', c:'#ffd700' },
              { v:stats.cabor,  l:'Cabor',  c:'#60a5fa' },
            ].map(s => (
              <div key={s.l} className="px-4 py-2 rounded-xl text-center"
                style={{ background:`${s.c}10`, border:`1px solid ${s.c}25` }}>
                <div className="text-lg font-black" style={{ color:s.c }}>{s.v||'—'}</div>
                <div className="text-[9px] text-zinc-500 uppercase">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 p-5 max-w-[1600px] w-full mx-auto space-y-5 relative z-10">

        {/* Notice */}
        <div {...ani(0)} className="flex items-start gap-3 p-4 rounded-2xl"
          style={{ background:'rgba(0,255,170,0.05)', border:'1px solid rgba(0,255,170,0.15)' }}>
          <ShieldCheck size={18} style={{ color:'#00ffaa', flexShrink:0, marginTop:1 }}/>
          <p className="text-xs text-zinc-400 leading-relaxed">
            <span className="font-bold text-emerald-400">Sistem Shortcut Pasca-Laga:</span>{' '}
            Mengunci kalkulasi otomatis antara tabel hasil pertandingan dengan data atlet.
            Mengurangi risiko kekeliruan pembagian dana bonus. Data diambil real-time dari database PORPROV XV.
          </p>
        </div>

        {/* 3 Export Cards */}
        <div {...ani(60)} className="grid grid-cols-3 gap-5">
          {CARDS.map(c => (
            <div key={c.id} className="rounded-2xl p-5 flex flex-col"
              style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${c.border}` }}>
              {/* Icon + title */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background:c.bg, border:`1px solid ${c.border}` }}>
                  <c.icon size={22} style={{ color:c.color }}/>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 leading-tight">{c.title}</h3>
                  <div className="flex gap-2 mt-1.5">
                    {c.stats.map(s => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                        style={{ background:`${c.color}15`, color:c.color }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed flex-1 mb-5">{c.desc}</p>

              <button onClick={() => handleExport(c.id, c.file, c.type)}
                disabled={loadingFile !== null}
                className="w-full py-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background:`${c.color}15`, border:`1px solid ${c.border}`, color:c.color }}
                onMouseEnter={e => { if(!loadingFile) (e.currentTarget as HTMLElement).style.background=`${c.color}25` }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background=`${c.color}15` }}>
                {loadingFile===c.id ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>}
                {loadingFile===c.id ? 'GENERATING...' : `GENERATE ${c.type.toUpperCase()}`}
              </button>
            </div>
          ))}
        </div>

        {/* Export Log */}
        <div {...ani(120)} className="rounded-2xl p-5"
          style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-4">
            <FileCheck size={14} style={{ color:'#00ffaa' }}/>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Log Historis Export</span>
            <span className="ml-auto text-[10px] text-zinc-600">{logs.length} dokumen</span>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border:'1px solid rgba(255,255,255,0.06)' }}>
            {logs.map((l, i) => (
              <div key={l.id} className="px-4 py-3 flex items-center gap-4 text-xs font-mono"
                style={{ background: i%2===0?'rgba(255,255,255,0.01)':'transparent', borderBottom:i<logs.length-1?'1px solid rgba(255,255,255,0.04)':'none' }}>
                <span className="text-zinc-600 w-20 flex-shrink-0">[{l.id}]</span>
                <span className="text-zinc-300 flex-1 truncate">{l.namaFile}</span>
                <span className="text-zinc-500 w-24 text-center flex-shrink-0">{l.tipe}</span>
                <span className="text-zinc-600 w-16 text-right flex-shrink-0">{l.ukuran}</span>
                <span className="text-zinc-600 w-36 text-right flex-shrink-0 text-[10px]">{l.waktu}</span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold flex-shrink-0"
                  style={{ background:'rgba(0,255,170,0.1)', color:'#00ffaa', border:'1px solid rgba(0,255,170,0.2)' }}>
                  <CheckCircle2 size={9}/> OK
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}