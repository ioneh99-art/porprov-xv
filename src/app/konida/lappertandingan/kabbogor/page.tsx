'use client'
// src/app/konida/lappertandingan/kabbogor/page.tsx
// Laporan Pertandingan Harian — Jurnal Hasil Laga

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  FileText, Clock, Download, CheckCircle,
  AlertTriangle, ListOrdered, ArrowRight,
  Trophy, X, Medal, TrendingUp, RefreshCw,
} from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface JurnalLaga {
  waktu: string; cabor: string; hasil: string
  medali: 'Emas'|'Perak'|'Perunggu'|'Tanpa Medali'; catatan: string
}

const JURNAL_DATA: Record<number, JurnalLaga[]> = {
  1: [
    { waktu:'10:30', cabor:'Karate Kata Putri',    hasil:'Juara 1 Final — Ungguli Kota Bandung',     medali:'Emas',       catatan:'Penampilan sempurna, nilai tertinggi di babak final.' },
    { waktu:'13:00', cabor:'Renang 100m Putri',    hasil:'Juara 2 Final',                            medali:'Perak',      catatan:'Finish sangat tipis, kalah 0.3 detik dari Bekasi.' },
    { waktu:'15:30', cabor:'Bulu Tangkis Ganda Putra',hasil:'Kalah di SF dari Kota Depok',          medali:'Tanpa Medali',catatan:'Stamina menurun di set 3, perlu evaluasi.' },
  ],
  2: [
    { waktu:'09:00', cabor:'Atletik 400m Putra',   hasil:'Juara 1 Final',                            medali:'Emas',       catatan:'Waktu terbaik musim ini. Potensi rekor daerah.' },
    { waktu:'11:15', cabor:'Hockey Putra',          hasil:'Menang 3-1 vs Kota Bogor',                medali:'Tanpa Medali',catatan:'Masih babak penyisihan. Performa bagus.' },
    { waktu:'14:00', cabor:'Pencak Silat Kelas C',  hasil:'Juara 3 Final',                           medali:'Perunggu',   catatan:'Kalah di SF tapi rebut perunggu.' },
  ],
  3: [
    { waktu:'10:00', cabor:'Taekwondo 54kg Putra',  hasil:'Juara 1 Final — Telak atas Depok',       medali:'Emas',       catatan:'Agresif dari ronde 1, fisik prima.' },
    { waktu:'14:15', cabor:'Tenis Meja Ganda Putri',hasil:'Kalah di QF dari Kab. Ciamis',           medali:'Tanpa Medali',catatan:'Kurang fokus set penentuan.' },
    { waktu:'16:00', cabor:'Karate Perorangan Putri',hasil:'Juara 2 — Nilai tipis kalah dari Bekasi',medali:'Perak',      catatan:'Teknik sangat rapi, hanya kalah di power.' },
  ],
  4: [
    { waktu:'08:30', cabor:'Dayung K-2 500m',       hasil:'Juara 1 Final',                           medali:'Emas',       catatan:'Start terbaik, dominan sepanjang race.' },
    { waktu:'11:00', cabor:'Sepak Bola Putra',       hasil:'Menang 2-1 vs Kota Bandung (QF)',        medali:'Tanpa Medali',catatan:'Drama injury time, gol penentu menit 89.' },
    { waktu:'15:30', cabor:'Panahan Recurve Putra',  hasil:'Juara 3',                                medali:'Perunggu',   catatan:'Konsisten di babak eliminasi.' },
  ],
  5: [
    { waktu:'09:30', cabor:'Hockey Putra Final',     hasil:'Juara 1 — Menang 2-0 vs Kota Bekasi',   medali:'Emas',       catatan:'Partai final terbaik. Kiper gemilang.' },
    { waktu:'13:00', cabor:'Sepak Bola Putra Final', hasil:'Runner-up — Kalah SO dari Kab. Bekasi',  medali:'Perak',      catatan:'Adu penalti dramatis. Kekalahan terhormat.' },
    { waktu:'16:30', cabor:'Atletik 100m Putra',     hasil:'Juara 1 Final',                           medali:'Emas',       catatan:'Waktu 10.34 detik — rekor PORPROV baru!' },
  ],
}

const MEDALI_COLOR = {
  Emas:        { text:'#ffd700', bg:'rgba(255,215,0,0.1)',    border:'rgba(255,215,0,0.25)',    dot:'#ffd700' },
  Perak:       { text:'#c0c0c0', bg:'rgba(192,192,192,0.1)',  border:'rgba(192,192,192,0.25)',  dot:'#c0c0c0' },
  Perunggu:    { text:'#cd7f32', bg:'rgba(205,127,50,0.1)',   border:'rgba(205,127,50,0.25)',   dot:'#cd7f32' },
  'Tanpa Medali':{ text:'#6b7280', bg:'rgba(107,114,128,0.06)',border:'rgba(107,114,128,0.15)', dot:'#374151' },
}

export default function PageLapPertandingan() {
  const [selectedHari, setSelectedHari] = useState(3)
  const [animIn,       setAnimIn]       = useState(false)
  const [klasemen,     setKlasemen]     = useState<any>(null)

  useEffect(() => { const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])

  useEffect(() => {
    sb.from('klasemen_medali').select('emas,perak,perunggu,total').eq('kontingen_id',1).single()
      .then(({ data }) => { if(data) setKlasemen(data) })
  }, [])

  const jurnal  = JURNAL_DATA[selectedHari] ?? []
  const emas    = jurnal.filter(j => j.medali==='Emas').length
  const perak   = jurnal.filter(j => j.medali==='Perak').length
  const perunggu= jurnal.filter(j => j.medali==='Perunggu').length
  const wins    = jurnal.filter(j => j.medali!=='Tanpa Medali').length

  const ani = (d=0) => ({
    style:{ transitionDelay:`${d}ms`, transition:'all 0.55s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
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
              <FileText size={22} style={{ color:'#00ffaa' }}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Jurnal Hasil Pertandingan Harian</h1>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">Kronologi hasil tanding & laporan pertanggungjawaban harian · Kab. Bogor</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Rekap medali real */}
            {klasemen && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ background:'rgba(255,215,0,0.08)', border:'1px solid rgba(255,215,0,0.2)' }}>
                <span className="text-sm font-black text-yellow-400">🥇{klasemen.emas}</span>
                <span className="text-sm text-zinc-400">🥈{klasemen.perak}</span>
                <span className="text-sm text-orange-400">🥉{klasemen.perunggu}</span>
                <div className="w-px h-4 bg-zinc-700 mx-1"/>
                <span className="text-xs font-bold text-zinc-400">{klasemen.total} total</span>
              </div>
            )}
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background:'rgba(0,255,170,0.15)', border:'1px solid rgba(0,255,170,0.3)', color:'#00ffaa' }}>
              <Download size={13}/> Export PDF Bupati
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-5 max-w-[1600px] w-full mx-auto relative z-10">
        <div className="grid grid-cols-4 gap-5">

          {/* DAY SELECTOR */}
          <div {...ani(0)} className="col-span-1 space-y-3">
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono px-1 mb-2">Pilih Hari</div>

            {[1,2,3,4,5].map(day => {
              const d = JURNAL_DATA[day]??[]
              const e = d.filter(x=>x.medali==='Emas').length
              const total = d.filter(x=>x.medali!=='Tanpa Medali').length
              const isActive = selectedHari===day
              return (
                <button key={day} onClick={()=>setSelectedHari(day)}
                  className="w-full p-4 rounded-xl text-left transition-all"
                  style={{
                    background: isActive?'rgba(0,255,170,0.08)':'rgba(255,255,255,0.02)',
                    border:`1px solid ${isActive?'rgba(0,255,170,0.3)':'rgba(255,255,255,0.06)'}`,
                  }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold" style={{ color:isActive?'#00ffaa':'rgba(255,255,255,0.5)' }}>
                      HARI KE-{day}
                    </span>
                    {isActive && <ArrowRight size={12} style={{ color:'#00ffaa' }}/>}
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                      style={{ background:'rgba(255,215,0,0.1)', color:'#ffd700' }}>
                      {e} emas
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                      style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.4)' }}>
                      {d.length} laga
                    </span>
                  </div>
                </button>
              )
            })}

            {/* Ringkasan hari ini */}
            <div className="rounded-xl p-4 mt-2"
              style={{ background:'rgba(0,255,170,0.05)', border:'1px solid rgba(0,255,170,0.15)' }}>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Hari ke-{selectedHari}</div>
              {[
                { l:'Emas',    v:emas,     c:'#ffd700' },
                { l:'Perak',   v:perak,    c:'#c0c0c0' },
                { l:'Perunggu',v:perunggu, c:'#cd7f32' },
                { l:'Medali',  v:wins,     c:'#00ffaa' },
              ].map(s => (
                <div key={s.l} className="flex justify-between items-center py-1.5 border-b last:border-0"
                  style={{ borderColor:'rgba(255,255,255,0.05)' }}>
                  <span className="text-[11px] text-zinc-500">{s.l}</span>
                  <span className="text-sm font-black" style={{ color:s.c }}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* JURNAL TIMELINE */}
          <div {...ani(60)} className="col-span-3 rounded-2xl p-6"
            style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <ListOrdered size={15} style={{ color:'#00ffaa' }}/>
                Kronologi Hasil Tanding Hari Ke-{selectedHari}
              </h2>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full"
                style={{ background:'rgba(0,255,170,0.1)', color:'#00ffaa', border:'1px solid rgba(0,255,170,0.2)' }}>
                {jurnal.length} pertandingan · {wins} medali
              </span>
            </div>

            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-px" style={{ background:'rgba(0,255,170,0.1)' }}/>

              <div className="space-y-5">
                {jurnal.map((j, i) => {
                  const mc = MEDALI_COLOR[j.medali]
                  return (
                    <div key={i} className="relative pl-14"
                      style={{ animation:`fadeIn 0.4s ease ${i*100}ms both` }}>
                      {/* Timeline dot */}
                      <div className="absolute left-[17px] top-4 w-7 h-7 rounded-full flex items-center justify-center z-10"
                        style={{ background:mc.bg, border:`2px solid ${mc.dot}`, boxShadow:`0 0 8px ${mc.dot}40` }}>
                        {j.medali!=='Tanpa Medali'
                          ? <span className="text-xs">{j.medali==='Emas'?'🥇':j.medali==='Perak'?'🥈':'🥉'}</span>
                          : <X size={10} style={{ color:'#6b7280' }}/>
                        }
                      </div>

                      {/* Card */}
                      <div className="rounded-xl p-4"
                        style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${mc.border}` }}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                                <Clock size={9}/> {j.waktu} WIB
                              </span>
                              {j.medali!=='Tanpa Medali' && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"
                                  style={{ background:mc.bg, color:mc.text, border:`1px solid ${mc.border}` }}>
                                  {j.medali}
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-black text-zinc-100">{j.cabor}</h3>
                          </div>
                        </div>

                        <div className="text-sm font-semibold text-zinc-300 p-3 rounded-lg mb-3"
                          style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.06)' }}>
                          {j.hasil}
                        </div>

                        <div className="flex items-start gap-2 pl-3"
                          style={{ borderLeft:'2px solid rgba(0,255,170,0.2)' }}>
                          <div>
                            <span className="text-[9px] font-mono text-zinc-600 uppercase block mb-0.5">Catatan Tim:</span>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">{j.catatan}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  )
}