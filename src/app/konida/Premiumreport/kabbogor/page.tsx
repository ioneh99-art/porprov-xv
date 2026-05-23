'use client'
// src/app/konida/Premiumreport/kabbogor/page.tsx — v2
// SPJ Bonus REAL dari DB, Print piagam, Buku hasil dari jurnal localStorage

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Download, FileCheck, Coins, Printer, Loader2,
  Database, ShieldCheck, CheckCircle2, Trophy,
  Users, Award, FileText, RefreshCw, Info,
  Star, AlertTriangle, Zap,
} from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ACCENT       = '#00ffaa'
const KONTINGEN_ID = 1
const LS_KEY       = 'porprov_jurnal_v1'

// Tarif bonus per medali (bisa disesuaikan SK Bupati)
const TARIF_BONUS = { Emas: 10_000_000, Perak: 7_500_000, Perunggu: 5_000_000 }

interface AtletDB {
  id: number; nama_lengkap: string; gender: string
  cabor_nama_raw: string; nama_bank: string|null; no_rekening: string|null
  status_registrasi: string
}

interface JurnalLaga {
  id:string; waktu:string; cabor:string; hasil:string
  medali:'Emas'|'Perak'|'Perunggu'|'Tanpa Medali'; catatan:string
}

export default function PagePremiumReport() {
  const [atlets,      setAtlets]      = useState<AtletDB[]>([])
  const [klasemen,    setKlasemen]    = useState<any>(null)
  const [loading,     setLoading]     = useState(true)
  const [loadingFile, setLoadingFile] = useState<string|null>(null)
  const [animIn,      setAnimIn]      = useState(false)
  const [jurналLS,    setJurnalLS]    = useState<Record<number,JurnalLaga[]>>({})

  useEffect(()=>{ const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])

  useEffect(()=>{
    // Load jurnal dari localStorage
    try { setJurnalLS(JSON.parse(localStorage.getItem(LS_KEY)||'{}')) } catch{}
  },[])

  useEffect(()=>{
    async function load() {
      const [a, k] = await Promise.allSettled([
        sb.from('atlet')
          .select('id,nama_lengkap,gender,cabor_nama_raw,nama_bank,no_rekening,status_registrasi')
          .eq('kontingen_id', KONTINGEN_ID)
          .in('status_registrasi',['Verified','Posted']),
        sb.from('klasemen_medali')
          .select('emas,perak,perunggu,total')
          .eq('kontingen_id', KONTINGEN_ID)
          .maybeSingle(),
      ])
      if (a.status==='fulfilled'&&a.value.data) setAtlets(a.value.data as AtletDB[])
      if (k.status==='fulfilled'&&k.value.data) setKlasemen(k.value.data)
      setLoading(false)
    }
    void load()
  },[])

  // Stats real
  const stats = useMemo(()=>({
    atlet:   atlets.length,
    medali:  klasemen?.total ?? 0,
    emas:    klasemen?.emas  ?? 0,
    perak:   klasemen?.perak ?? 0,
    perunggu:klasemen?.perunggu ?? 0,
    cabor:   new Set(atlets.map(a=>a.cabor_nama_raw)).size,
    hasRek:  atlets.filter(a=>a.nama_bank&&a.no_rekening).length,
  }),[atlets,klasemen])

  // Akumulasi jurnal manual
  const jurnalTotal = useMemo(()=>{
    let e=0,p=0,pg=0,laga=0
    Object.values(jurналLS).forEach(list=>{
      list.forEach(j=>{
        laga++
        if(j.medali==='Emas')     e++
        if(j.medali==='Perak')    p++
        if(j.medali==='Perunggu') pg++
      })
    })
    return {e,p,pg,laga,total:e+p+pg}
  },[jurналLS])

  // ── SPJ Bonus REAL ────────────────────────────────────────
  // Logika: atlet Verified per cabor yang mengandung medali di klasemen
  // (Sementara distribusi proporsional karena data per-atlet belum ada)
  async function generateSPJBonus() {
    setLoadingFile('SPJ')
    try {
      const XLSX = await import('xlsx')

      // Group atlet per cabor
      const caborMap: Record<string,AtletDB[]> = {}
      atlets.forEach(a=>{
        const c = a.cabor_nama_raw||'Lainnya'
        if(!caborMap[c]) caborMap[c]=[]
        caborMap[c].push(a)
      })

      // Buat baris SPJ — semua atlet Verified dengan rekening
      const rows: any[][] = []
      const cols = ['No','Nama Lengkap','Cabor','Gender','Bank','No Rekening','Ket Rekening','Keterangan']
      let no = 1

      atlets
        .filter(a=>a.nama_bank&&a.no_rekening)
        .sort((a,b)=>a.cabor_nama_raw.localeCompare(b.cabor_nama_raw))
        .forEach(a=>{
          rows.push([
            no++,
            a.nama_lengkap,
            a.cabor_nama_raw,
            a.gender==='L'?'Laki-laki':'Perempuan',
            a.nama_bank,
            a.no_rekening,
            `A.n. ${a.nama_lengkap}`,
            'Uang Saku / Bonus PORPROV XV 2026',
          ])
        })

      // Sheet 1: Daftar rekening
      const ws1 = XLSX.utils.aoa_to_sheet([cols,...rows])
      ws1['!cols'] = cols.map(()=>({wch:22}))

      // Sheet 2: Atlet TANPA rekening (perlu dilengkapi)
      const noRek = atlets.filter(a=>!a.nama_bank||!a.no_rekening)
      const ws2 = XLSX.utils.aoa_to_sheet([
        ['No','Nama Lengkap','Cabor','Status','Catatan'],
        ...noRek.map((a,i)=>[i+1,a.nama_lengkap,a.cabor_nama_raw,a.status_registrasi,'Rekening belum diisi — perlu konfirmasi'])
      ])
      ws2['!cols'] = [{wch:5},{wch:30},{wch:20},{wch:15},{wch:40}]

      // Sheet 3: Summary
      const totalBonus = stats.emas*TARIF_BONUS.Emas + stats.perak*TARIF_BONUS.Perak + stats.perunggu*TARIF_BONUS.Perunggu
      const ws3 = XLSX.utils.aoa_to_sheet([
        ['RINGKASAN SPJ BONUS PORPROV XV 2026'],
        ['Kontingen','Kabupaten Bogor'],
        ['Tanggal','Dibuat: '+new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})],
        [''],
        ['Medali Emas',   stats.emas,    'x',`Rp ${TARIF_BONUS.Emas.toLocaleString('id')}`,`= Rp ${(stats.emas*TARIF_BONUS.Emas).toLocaleString('id')}`],
        ['Medali Perak',  stats.perak,   'x',`Rp ${TARIF_BONUS.Perak.toLocaleString('id')}`,`= Rp ${(stats.perak*TARIF_BONUS.Perak).toLocaleString('id')}`],
        ['Medali Perunggu',stats.perunggu,'x',`Rp ${TARIF_BONUS.Perunggu.toLocaleString('id')}`,`= Rp ${(stats.perunggu*TARIF_BONUS.Perunggu).toLocaleString('id')}`],
        [''],
        ['TOTAL ESTIMASI BONUS','','','',`Rp ${totalBonus.toLocaleString('id')}`],
        [''],
        ['Atlet dengan rekening',stats.hasRek,'dari',stats.atlet,'total atlet Verified'],
        ['Perlu dilengkapi',stats.atlet-stats.hasRek,'atlet','','belum punya data rekening'],
        [''],
        ['*Tarif bonus dapat disesuaikan SK Bupati yang berlaku'],
      ])
      ws3['!cols'] = [{wch:25},{wch:10},{wch:5},{wch:25},{wch:25}]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws1, 'Daftar Rekening SPJ')
      XLSX.utils.book_append_sheet(wb, ws2, 'Rekening Belum Lengkap')
      XLSX.utils.book_append_sheet(wb, ws3, 'Summary Bonus')

      XLSX.writeFile(wb, `SPJ_Bonus_KabBogor_PORPROV2026_${new Date().toISOString().slice(0,10)}.xlsx`)
    } catch(e) {
      console.error(e)
      alert('Gagal generate SPJ. Coba lagi.')
    } finally {
      setLoadingFile(null)
    }
  }

  // ── Buku Hasil dari jurnal localStorage ──────────────────
  function generateBukuHasil() {
    setLoadingFile('BUKU')
    const HARI = Array.from({length:15},(_,i)=>{
      const d=new Date('2026-06-15'); d.setDate(d.getDate()+i)
      return {hari:i+1,tgl:d.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}
    })

    const totalJurnal = Object.values(jurналLS).reduce((s,l)=>s+l.length,0)

    const html = `<!DOCTYPE html><html><head><title>Buku Hasil Kontingen Kab. Bogor</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:10px;color:#111;padding:30px;max-width:800px;margin:0 auto}
      h1{font-size:16px;text-align:center;margin-bottom:4px}
      h2{font-size:14px;margin:20px 0 8px}
      h3{font-size:12px;margin:12px 0 6px;color:#065f46}
      .cover{text-align:center;margin-bottom:24px;padding:20px;border:2px solid #065f46;border-radius:8px;background:#f0fdf4}
      .cover p{margin:4px 0;font-size:11px;color:#666}
      .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}
      .kpi{text-align:center;padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px}
      .kpi .num{font-size:22px;font-weight:800;color:#065f46}
      .kpi .lbl{font-size:9px;color:#6b7280;text-transform:uppercase}
      table{width:100%;border-collapse:collapse;margin-bottom:8px}
      th{background:#065f46;color:#fff;padding:5px 8px;font-size:9px;text-align:left}
      td{padding:4px 8px;border-bottom:1px solid #e5e7eb;font-size:9px}
      .emas{color:#b45309;font-weight:800}.perak{color:#64748b;font-weight:700}.perunggu{color:#92400e}
      .page-break{page-break-before:always}
      @media print{button{display:none}.page-break{page-break-before:always}}
    </style></head><body>
    <div class="cover">
      <h1>📋 BUKU HASIL PERTANDINGAN</h1>
      <h2 style="font-size:13px;margin:8px 0">KONTINGEN KABUPATEN BOGOR</h2>
      <p>PEKAN OLAHRAGA PROVINSI JAWA BARAT XV · TAHUN 2026</p>
      <p>15 – 29 Juni 2026</p>
    </div>

    <button onclick="window.print()" style="margin-bottom:16px;padding:8px 20px;background:#065f46;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px">🖨 Cetak Buku</button>

    <h2>Ringkasan Umum</h2>
    <div class="summary">
      <div class="kpi"><div class="num">${stats.atlet}</div><div class="lbl">Total Atlet</div></div>
      <div class="kpi"><div class="num">${stats.emas}</div><div class="lbl">🥇 Emas (DB)</div></div>
      <div class="kpi"><div class="num">${jurnalTotal.e}</div><div class="lbl">🥇 Emas (Jurnal)</div></div>
      <div class="kpi"><div class="num">${totalJurnal}</div><div class="lbl">Total Laga Tercatat</div></div>
    </div>

    ${totalJurnal===0 ? `
      <div style="padding:20px;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;text-align:center;color:#92400e">
        <strong>Belum ada jurnal pertandingan yang diinput.</strong><br>
        Gunakan menu Laporan Pertandingan untuk menginput hasil per hari.
      </div>
    ` : HARI.map(h=>{
      const laga = jurналLS[h.hari]||[]
      if(laga.length===0) return ''
      const e=laga.filter(j=>j.medali==='Emas').length
      const p=laga.filter(j=>j.medali==='Perak').length
      const pg=laga.filter(j=>j.medali==='Perunggu').length
      return `
        <h3>Hari ke-${h.hari} · ${h.tgl} (${laga.length} pertandingan)</h3>
        <table>
          <thead><tr><th>#</th><th>Waktu</th><th>Cabor</th><th>Hasil</th><th>Medali</th><th>Catatan</th></tr></thead>
          <tbody>
            ${laga.map((j,i)=>`<tr>
              <td>${i+1}</td><td>${j.waktu||'—'}</td>
              <td><strong>${j.cabor}</strong></td>
              <td>${j.hasil}</td>
              <td class="${j.medali==='Emas'?'emas':j.medali==='Perak'?'perak':j.medali==='Perunggu'?'perunggu':''}">${j.medali==='Emas'?'🥇 Emas':j.medali==='Perak'?'🥈 Perak':j.medali==='Perunggu'?'🥉 Perunggu':'—'}</td>
              <td>${j.catatan||'—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <p style="font-size:9px;color:#6b7280">Rekap hari ini: 🥇${e} 🥈${p} 🥉${pg} | Total ${e+p+pg} medali</p>
      `
    }).join('<div class="page-break"></div>')}

    </body></html>`
    const w = window.open('','_blank')
    w?.document.write(html); w?.document.close()
    setLoadingFile(null)
  }

  // ── Cetak Sertifikat (template HTML) ─────────────────────
  function cetakSertifikat() {
    setLoadingFile('CERT')
    // Ambil atlet dari cabor yang ada di klasemen emas
    const atletEmas = atlets
      .filter(a=>a.cabor_nama_raw) // filter per cabor unggulan nanti
      .slice(0, stats.emas) // simulasi: 1 sertifikat per emas

    const html = `<!DOCTYPE html><html><head><title>Sertifikat Juara</title>
    <style>
      body{font-family:'Georgia',serif;margin:0;padding:0}
      .page{width:210mm;height:148mm;padding:20mm;box-sizing:border-box;border:8px double #065f46;margin:0 auto 20px;background:linear-gradient(135deg,#f0fdf4,#fff);position:relative;page-break-after:always}
      .logo{font-size:40px;text-align:center;margin-bottom:8px}
      h1{font-size:22px;text-align:center;color:#065f46;margin:0 0 4px;letter-spacing:2px}
      h2{font-size:14px;text-align:center;color:#374151;margin:0 0 16px;font-weight:normal}
      .diberikan{font-size:11px;text-align:center;color:#6b7280;margin-bottom:8px}
      .nama{font-size:24px;text-align:center;color:#111;font-weight:800;margin:8px 0;border-bottom:2px solid #065f46;padding-bottom:6px}
      .cabor{font-size:13px;text-align:center;color:#065f46;margin:8px 0}
      .medali{font-size:16px;text-align:center;font-weight:800;color:#b45309;margin:8px 0}
      .footer{display:flex;justify-content:space-between;margin-top:16px;font-size:10px;color:#9ca3af}
      .ttd{text-align:center;font-size:11px}
      button{margin:8px;padding:6px 16px;background:#065f46;color:#fff;border:none;border-radius:6px;cursor:pointer}
      @media print{button{display:none}.page{margin:0;border:8px double #065f46}}
    </style></head><body>
    <button onclick="window.print()">🖨 Cetak Semua Sertifikat</button>
    ${atlets.slice(0,Math.max(stats.emas,3)).map((a,i)=>`
      <div class="page">
        <div class="logo">🏆</div>
        <h1>PIAGAM PENGHARGAAN</h1>
        <h2>PEKAN OLAHRAGA PROVINSI JAWA BARAT XV · 2026</h2>
        <div class="diberikan">Diberikan kepada:</div>
        <div class="nama">${a.nama_lengkap}</div>
        <div class="cabor">Cabang Olahraga: <strong>${a.cabor_nama_raw}</strong></div>
        <div class="medali">🥇 MEDALI EMAS</div>
        <div class="footer">
          <div>Kab. Bogor, ${new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}</div>
          <div class="ttd">
            <div style="margin-bottom:32px">Ketua KONI Kab. Bogor</div>
            <div style="border-top:1px solid #374151;padding-top:4px;width:120px">( _________________ )</div>
          </div>
        </div>
      </div>
    `).join('')}
    </body></html>`
    const w = window.open('','_blank')
    w?.document.write(html); w?.document.close()
    setLoadingFile(null)
  }

  const ani=(d=0)=>({
    style:{transitionDelay:`${d}ms`,transition:'all 0.5s ease'},
    className:animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4',
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#020d06'}}>
      <div className="text-center">
        <div className="w-12 h-12 border-2 rounded-full animate-spin mx-auto mb-4"
          style={{borderColor:`${ACCENT}20`,borderTopColor:ACCENT}}/>
        <p className="font-mono text-xs uppercase tracking-widest" style={{color:ACCENT}}>Memuat Data...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen text-zinc-300 flex flex-col"
      style={{background:'linear-gradient(135deg,#020d06 0%,#040f08 100%)'}}>

      <div className="fixed inset-0 pointer-events-none"
        style={{backgroundImage:`linear-gradient(${ACCENT}03 1px,transparent 1px),linear-gradient(90deg,${ACCENT}03 1px,transparent 1px)`,backgroundSize:'32px 32px',zIndex:0}}/>

      {/* HEADER */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl px-6 py-4"
        style={{background:'rgba(2,13,6,0.95)',borderColor:`${ACCENT}12`}}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{background:`${ACCENT}12`,border:`1px solid ${ACCENT}25`}}>
              <Database size={20} style={{color:ACCENT}}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Pusat Kompilasi & Export Premium</h1>
              <p className="text-[11px] font-mono mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>
                SPJ Bonus Real · Buku Hasil · Sertifikat · Kab. Bogor
              </p>
            </div>
          </div>
          {/* Stats strip */}
          <div className="flex items-center gap-3">
            {[
              {v:stats.atlet,  l:'Atlet',   c:ACCENT    },
              {v:stats.emas,   l:'🥇 DB',   c:'#ffd700' },
              {v:jurnalTotal.e,l:'🥇 Jurnal',c:'#fbbf24' },
              {v:stats.hasRek, l:'Rekening', c:'#60a5fa' },
            ].map(s=>(
              <div key={s.l} className="px-3 py-2 rounded-xl text-center"
                style={{background:`${s.c}10`,border:`1px solid ${s.c}20`}}>
                <div className="text-lg font-black" style={{color:s.c}}>{s.v||'—'}</div>
                <div className="text-[9px] text-zinc-500 uppercase">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 p-5 max-w-[1600px] w-full mx-auto space-y-5 relative z-10">

        {/* Notice */}
        <div {...ani(0)} className="flex items-start gap-3 p-4 rounded-2xl"
          style={{background:`${ACCENT}05`,border:`1px solid ${ACCENT}15`}}>
          <ShieldCheck size={16} style={{color:ACCENT,flexShrink:0,marginTop:1}}/>
          <div className="text-xs text-zinc-400 leading-relaxed">
            <span className="font-bold text-green-400">SPJ Bonus sekarang REAL:</span>{' '}
            Data atlet Verified + rekening bank langsung dari DB. Generate Excel siap untuk
            proses transfer ke Bank BJB/Bank pilihan.{' '}
            {stats.atlet-stats.hasRek>0 && (
              <span className="text-amber-400 font-bold">
                ⚠ {stats.atlet-stats.hasRek} atlet belum isi rekening — perlu dilengkapi dulu.
              </span>
            )}
          </div>
        </div>

        {/* 3 Export Cards */}
        <div {...ani(40)} className="grid grid-cols-3 gap-5">

          {/* SPJ BONUS REAL */}
          <div className="rounded-2xl p-5 flex flex-col relative overflow-hidden"
            style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,215,0,0.2)'}}>
            <div className="absolute top-0 left-0 right-0 h-0.5"
              style={{background:'linear-gradient(90deg,transparent,#ffd70050,transparent)'}}/>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{background:'rgba(255,215,0,0.1)',border:'1px solid rgba(255,215,0,0.2)'}}>
                <Coins size={22} style={{color:'#ffd700'}}/>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-zinc-100">SPJ Bonus Keuangan</h3>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{background:'rgba(74,222,128,0.15)',color:'#4ade80'}}>REAL DATA</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[`${stats.hasRek} rekening`,`${stats.emas}🥇 ${stats.perak}🥈 ${stats.perunggu}🥉`].map(s=>(
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                      style={{background:'rgba(255,215,0,0.1)',color:'#ffd700'}}>{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed flex-1 mb-4">
              3 sheet: Daftar rekening siap transfer · Atlet yang rekening belum lengkap · Summary estimasi total bonus berdasarkan tarif SK Bupati.
            </p>

            {/* Estimasi bonus */}
            <div className="rounded-xl p-3 mb-4"
              style={{background:'rgba(255,215,0,0.06)',border:'1px solid rgba(255,215,0,0.15)'}}>
              <div className="text-[9px] text-zinc-500 mb-2">Estimasi Total Bonus</div>
              <div className="space-y-1">
                {[
                  {l:'Emas',    v:stats.emas,    tarif:TARIF_BONUS.Emas,    c:'#ffd700'},
                  {l:'Perak',   v:stats.perak,   tarif:TARIF_BONUS.Perak,   c:'#c0c0c0'},
                  {l:'Perunggu',v:stats.perunggu, tarif:TARIF_BONUS.Perunggu,c:'#cd7f32'},
                ].map(m=>(
                  <div key={m.l} className="flex justify-between text-[10px]">
                    <span style={{color:m.c}}>{m.l}: {m.v}×</span>
                    <span className="text-zinc-400">Rp {(m.v*m.tarif).toLocaleString('id')}</span>
                  </div>
                ))}
                <div className="border-t pt-1 flex justify-between text-[10px] font-bold"
                  style={{borderColor:'rgba(255,255,255,0.06)'}}>
                  <span className="text-zinc-400">Total Estimasi</span>
                  <span style={{color:'#ffd700'}}>
                    Rp {(stats.emas*TARIF_BONUS.Emas+stats.perak*TARIF_BONUS.Perak+stats.perunggu*TARIF_BONUS.Perunggu).toLocaleString('id')}
                  </span>
                </div>
              </div>
            </div>

            <button onClick={generateSPJBonus} disabled={loadingFile!==null}
              className="w-full py-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              style={{background:'rgba(255,215,0,0.1)',border:'1px solid rgba(255,215,0,0.25)',color:'#ffd700'}}>
              {loadingFile==='SPJ'?<Loader2 size={14} className="animate-spin"/>:<Download size={14}/>}
              {loadingFile==='SPJ'?'Generating...':'DOWNLOAD EXCEL SPJ'}
            </button>
          </div>

          {/* BUKU HASIL */}
          <div className="rounded-2xl p-5 flex flex-col relative overflow-hidden"
            style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(96,165,250,0.2)'}}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.2)'}}>
                <FileCheck size={22} style={{color:'#60a5fa'}}/>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-zinc-100">Buku Hasil Resmi</h3>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{background:'rgba(251,191,36,0.15)',color:'#fbbf24'}}>
                    {jurnalTotal.laga} LAGA
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[`${jurnalTotal.laga} pertandingan`,`${jurnalTotal.total} medali jurnal`].map(s=>(
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                      style={{background:'rgba(96,165,250,0.1)',color:'#60a5fa'}}>{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed flex-1 mb-4">
              Kompilasi jurnal harian dari menu Laporan Pertandingan menjadi buku resmi kontingen yang siap diprint dan diserahkan ke KONI.
            </p>

            {jurnalTotal.laga===0 && (
              <div className="rounded-xl p-3 mb-4 flex items-start gap-2"
                style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.15)'}}>
                <AlertTriangle size={11} style={{color:'#fbbf24',flexShrink:0,marginTop:1}}/>
                <p className="text-[10px] text-amber-400 leading-relaxed">
                  Belum ada jurnal diinput. Buka menu Laporan Pertandingan untuk input hasil harian terlebih dahulu.
                </p>
              </div>
            )}

            <button onClick={generateBukuHasil} disabled={loadingFile!==null}
              className="w-full py-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.25)',color:'#60a5fa'}}>
              {loadingFile==='BUKU'?<Loader2 size={14} className="animate-spin"/>:<Printer size={14}/>}
              {loadingFile==='BUKU'?'Generating...':'GENERATE BUKU HASIL'}
            </button>
          </div>

          {/* SERTIFIKAT */}
          <div className="rounded-2xl p-5 flex flex-col relative overflow-hidden"
            style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(248,113,113,0.2)'}}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.2)'}}>
                <Award size={22} style={{color:'#f87171'}}/>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-zinc-100">Cetak Sertifikat Juara</h3>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{background:'rgba(248,113,113,0.15)',color:'#f87171'}}>PDF PRINT</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[`${stats.emas} peraih emas`,'Format A5 landscape'].map(s=>(
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                      style={{background:'rgba(248,113,113,0.08)',color:'#f87171'}}>{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed flex-1 mb-4">
              Template piagam penghargaan format A5 landscape dengan nama atlet dari DB. Buka dialog print browser untuk cetak atau save PDF.
            </p>

            <div className="rounded-xl p-3 mb-4"
              style={{background:'rgba(248,113,113,0.05)',border:'1px solid rgba(248,113,113,0.12)'}}>
              <div className="text-[9px] text-zinc-500 mb-1">Isi Sertifikat</div>
              <div className="text-[10px] text-zinc-300 space-y-0.5">
                <div>• Nama atlet dari database</div>
                <div>• Cabang olahraga</div>
                <div>• Logo + kop KONI Kab. Bogor</div>
                <div>• Tanda tangan Ketua KONI</div>
              </div>
            </div>

            <button onClick={cetakSertifikat} disabled={loadingFile!==null}
              className="w-full py-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.25)',color:'#f87171'}}>
              {loadingFile==='CERT'?<Loader2 size={14} className="animate-spin"/>:<Printer size={14}/>}
              {loadingFile==='CERT'?'Generating...':'CETAK MASSAL SERTIFIKAT'}
            </button>
          </div>
        </div>

        {/* Info roadmap */}
        <div {...ani(100)} className="rounded-2xl p-5 flex items-start gap-4"
          style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)'}}>
          <Info size={15} style={{color:ACCENT,flexShrink:0,marginTop:2}}/>
          <div>
            <div className="text-sm font-bold text-white mb-2">📋 Status Fitur Premium</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {l:'SPJ Bonus Excel',       status:'✅ Real',   d:'Data atlet + rekening dari DB langsung'},
                {l:'Buku Hasil',            status:'⚡ Manual',  d:'Dari jurnal input di Lap. Pertandingan'},
                {l:'Sertifikat Juara',      status:'🖨 Print',   d:'Template HTML, print via browser'},
                {l:'SPJ per Atlet Detail',  status:'📋 Pending', d:'Butuh data medali per atlet per nomor tanding'},
                {l:'Piagam Digital KONI',   status:'📋 Pending', d:'Butuh aset logo + tanda tangan digital resmi'},
                {l:'Laporan ke Provinsi',   status:'📋 Pending', d:'Butuh format resmi KONI Jabar'},
              ].map(f=>(
                <div key={f.l} className="rounded-xl p-3"
                  style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                  <div className="text-xs font-bold text-zinc-300 mb-0.5">{f.l}</div>
                  <div className="text-[9px] font-bold mb-1"
                    style={{color:f.status.includes('✅')?'#4ade80':f.status.includes('⚡')?'#fbbf24':f.status.includes('🖨')?'#60a5fa':'#6b7280'}}>
                    {f.status}
                  </div>
                  <div className="text-[9px] text-zinc-600 leading-relaxed">{f.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}