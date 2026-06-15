'use client'
// src/app/konida/Premiumreport/kabbandung/page.tsx — v4
// AI Sport Intelligence: Streaming Claude Brief INLINE + Markdown render
// All-in-one demo experience

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Download, FileCheck, Coins, Printer, Loader2, Database,
  Trophy, Users, Award, FileText, Info, Sparkles, Presentation,
  TrendingUp, CreditCard as IdCard, ExternalLink, X, Brain,
  Zap, Target, Copy, CheckCircle, Cpu, Wand2,
} from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ACCENT       = '#38bdf8'
const KONTINGEN_ID = 4
const LS_KEY       = 'porprov_jurnal_v1'
const KONTINGEN_NAME = 'Kab. Bandung'

// TODO: isi tarif bonus medali resmi dari SK Bupati Kab. Bandung
const TARIF_BONUS = { Emas: 0, Perak: 0, Perunggu: 0 }
// TODO: isi target medali resmi dari Bupati Kab. Bandung
const TARGET_BUPATI = { emas: 0, perak: 0, perunggu: 0 }

interface AtletDB {
  id: number; nama_lengkap: string; gender: string
  cabor_nama_raw: string; nama_bank: string|null; no_rekening: string|null
  status_registrasi: string
  no_ktp: string; tgl_lahir: string
  no_registrasi_koni: number|null
  kode_asal_daerah: string; nama_asal_daerah: string
}
interface TesFisik { atlet_id: number; kesimpulan_persen: number|null; kesimpulan_kategori: string|null; bmi: number|null }
interface Riwayat { atlet_id: number; hasil: string; tahun: number; event: string }
interface CaborKuota { cabor_nama: string; kuota_total: number; aktif: number; status_kuota: string; pct: number }
interface JurnalLaga { id:string; waktu:string; cabor:string; hasil:string; medali:string; catatan:string }

function hitungUmur(tgl: string) {
  if (!tgl) return 0
  return Math.floor((Date.now()-new Date(tgl).getTime())/(365.25*24*3600*1000))
}

// ════════════════════════════════════════════════════════════
// SIMPLE MARKDOWN RENDERER (no extra dependency)
// ════════════════════════════════════════════════════════════
function renderMarkdown(text: string): string {
  // Remove usage metadata comment
  let html = text.replace(/<!--USAGE:[\s\S]*?-->/g, '')

  // Escape HTML first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Code blocks ```...```
  html = html.replace(/```([\s\S]*?)```/g, (_, code) =>
    `<pre style="background:rgba(0,0,0,0.4);padding:12px;border-radius:8px;margin:12px 0;overflow-x:auto;font-size:11px;border:1px solid rgba(56,189,248,0.15);color:#38bdf8;font-family:monospace;">${code.trim()}</pre>`
  )

  // Headers
  html = html
    .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;color:#fbbf24;margin:20px 0 8px;display:flex;align-items:center;gap:6px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:18px;font-weight:800;color:#38bdf8;margin:24px 0 10px;padding-bottom:6px;border-bottom:1px solid rgba(56,189,248,0.2);">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:24px;font-weight:900;color:#fff;margin:8px 0 16px;letter-spacing:-0.5px;">$1</h1>')

  // Bold + Italic
  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#fff;font-weight:700;">$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em style="font-style:italic;color:#a78bfa;">$1</em>')

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;">')

  // Process lists & paragraphs
  const lines = html.split('\n')
  const result: string[] = []
  let inList = false
  let paragraphBuffer: string[] = []

  function flushParagraph() {
    if (paragraphBuffer.length > 0) {
      const para = paragraphBuffer.join(' ').trim()
      if (para) {
        result.push(`<p style="margin:10px 0;color:#cbd5e1;line-height:1.7;font-size:13px;">${para}</p>`)
      }
      paragraphBuffer = []
    }
  }

  function flushList() {
    if (inList) {
      result.push('</ul>')
      inList = false
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    
    if (trimmed.startsWith('<h') || trimmed.startsWith('<hr') || trimmed.startsWith('<pre')) {
      flushParagraph()
      flushList()
      result.push(line)
    } else if (trimmed.match(/^[-*]\s+(.+)/)) {
      flushParagraph()
      if (!inList) {
        result.push('<ul style="margin:8px 0 12px 8px;padding-left:20px;">')
        inList = true
      }
      const content = trimmed.replace(/^[-*]\s+/, '')
      result.push(`<li style="margin:6px 0;color:#cbd5e1;line-height:1.6;font-size:13px;list-style:none;position:relative;padding-left:18px;">
        <span style="position:absolute;left:0;color:#38bdf8;">▸</span>${content}
      </li>`)
    } else if (trimmed === '') {
      flushParagraph()
      flushList()
    } else {
      flushList()
      paragraphBuffer.push(trimmed)
    }
  }
  flushParagraph()
  flushList()

  return result.join('\n')
}

// ════════════════════════════════════════════════════════════
export default function PagePremiumReport() {
  const [atlets, setAtlets] = useState<AtletDB[]>([])
  const [tesFisik, setTesFisik] = useState<TesFisik[]>([])
  const [riwayat, setRiwayat] = useState<Riwayat[]>([])
  const [kuotaSummary, setKuotaSummary] = useState<CaborKuota[]>([])
  const [klasemen, setKlasemen] = useState<any>(null)
  const [dokumenStats, setDokumenStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingFile, setLoadingFile] = useState<string|null>(null)
  const [animIn, setAnimIn] = useState(false)
  const [jurnalLS, setJurnalLS] = useState<Record<number,JurnalLaga[]>>({})

  // AI Brief state
  const [briefStream, setBriefStream] = useState('')
  const [briefStreaming, setBriefStreaming] = useState(false)
  const [briefError, setBriefError] = useState<string|null>(null)
  const [briefCopied, setBriefCopied] = useState(false)
  const briefSectionRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{ const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])
  useEffect(()=>{
    try { setJurnalLS(JSON.parse(localStorage.getItem(LS_KEY)||'{}')) } catch{}
  },[])

  useEffect(()=>{
    async function load() {
      const [a, k, t, r, kuota, dok] = await Promise.allSettled([
        (async () => {
          let all: any[] = []
          for (let p = 0; ; p++) {
            const { data, error } = await sb.from('atlet').select('*').eq('kontingen_id', KONTINGEN_ID).in('status_registrasi',['Verified','Posted']).range(p * 1000, (p + 1) * 1000 - 1)
            if (error) return { data: null, error }
            if (!data || data.length === 0) break
            all = all.concat(data)
            if (data.length < 1000) break
          }
          return { data: all, error: null }
        })(),
        sb.from('klasemen_medali').select('emas,perak,perunggu,total').eq('kontingen_id', KONTINGEN_ID).maybeSingle(),
        sb.from('atlet_tes_fisik').select('atlet_id,kesimpulan_persen,kesimpulan_kategori,bmi').eq('kontingen_id', KONTINGEN_ID),
        sb.from('riwayat_prestasi').select('atlet_id,hasil,tahun,event'),
        sb.from('v_cabor_kuota_summary').select('cabor_nama,kuota_total,aktif,status_kuota,pct').eq('kontingen_id', KONTINGEN_ID).order('aktif',{ascending:false}),
        sb.from('v_dokumen_stats').select('*'),
      ])
      if (a.status==='fulfilled'&&a.value.data)     setAtlets(a.value.data as AtletDB[])
      if (k.status==='fulfilled'&&k.value.data)     setKlasemen(k.value.data)
      if (t.status==='fulfilled'&&t.value.data)     setTesFisik(t.value.data as TesFisik[])
      if (r.status==='fulfilled'&&r.value.data)     setRiwayat(r.value.data as Riwayat[])
      if (kuota.status==='fulfilled'&&kuota.value.data) setKuotaSummary(kuota.value.data as CaborKuota[])
      if (dok.status==='fulfilled'&&dok.value.data) setDokumenStats(dok.value.data as any[])
      setLoading(false)
    }
    void load()
  },[])

  const tesFisikMap = useMemo(()=>{
    const m: Record<number, TesFisik> = {}
    tesFisik.forEach(t=>m[t.atlet_id]=t)
    return m
  },[tesFisik])

  const prestasiMap = useMemo(()=>{
    const m: Record<number, {emas:number;perak:number;perunggu:number}> = {}
    riwayat.forEach(r=>{
      if (!m[r.atlet_id]) m[r.atlet_id] = {emas:0,perak:0,perunggu:0}
      if (r.hasil==='Emas')     m[r.atlet_id].emas++
      else if (r.hasil==='Perak')    m[r.atlet_id].perak++
      else if (r.hasil==='Perunggu') m[r.atlet_id].perunggu++
    })
    return m
  },[riwayat])

  const stats = useMemo(()=>{
    const total = atlets.length
    const putra = atlets.filter(a=>a.gender==='L').length
    const putri = atlets.filter(a=>a.gender==='P').length
    const cabor = new Set(atlets.map(a=>a.cabor_nama_raw)).size
    const hasRek = atlets.filter(a=>a.nama_bank&&a.no_rekening).length
    const sudahTes = tesFisik.length
    const avgSkor = sudahTes>0 ? Math.round(tesFisik.reduce((s,t)=>s+(t.kesimpulan_persen||0),0)/sudahTes) : 0
    const skorTinggi = tesFisik.filter(t=>(t.kesimpulan_persen||0)>=80).length
    const skorRendah = tesFisik.filter(t=>(t.kesimpulan_persen||0)<50).length
    const totalEmas = riwayat.filter(r=>r.hasil==='Emas').length
    const totalPerak = riwayat.filter(r=>r.hasil==='Perak').length
    const totalPerunggu = riwayat.filter(r=>r.hasil==='Perunggu').length
    const atletPrestasi = new Set(riwayat.map(r=>r.atlet_id)).size
    const totalDokVerified = dokumenStats.reduce((s,d)=>s+(d.verified||0),0)
    const compliancePct = dokumenStats.length>0 && total>0
      ? Math.round(totalDokVerified/(dokumenStats.length*total)*100) : 0
    return {
      total, putra, putri, cabor, hasRek, sudahTes, avgSkor, skorTinggi, skorRendah,
      totalEmas, totalPerak, totalPerunggu, atletPrestasi, compliancePct,
      emas: klasemen?.emas??0, perak: klasemen?.perak??0, perunggu: klasemen?.perunggu??0,
      totalMedali: (klasemen?.emas??0)+(klasemen?.perak??0)+(klasemen?.perunggu??0),
    }
  },[atlets, klasemen, tesFisik, riwayat, dokumenStats])

  const jurnalTotal = useMemo(()=>{
    let e=0,p=0,pg=0,laga=0
    Object.values(jurnalLS).forEach(list=>{
      list.forEach(j=>{
        laga++
        if(j.medali==='Emas') e++
        else if(j.medali==='Perak') p++
        else if(j.medali==='Perunggu') pg++
      })
    })
    return {e,p,pg,laga,total:e+p+pg}
  },[jurnalLS])

  // ════════════════════════════════════════════════════════
  // AI BRIEF — STREAMING (HERO FEATURE)
  // ════════════════════════════════════════════════════════
  async function generateAIBrief() {
    setBriefStream('')
    setBriefError(null)
    setBriefStreaming(true)
    setBriefCopied(false)

    // Scroll to brief section
    setTimeout(()=>{
      briefSectionRef.current?.scrollIntoView({behavior:'smooth', block:'start'})
    }, 200)

    // Build top atlet list
    const topAtlet = atlets
      .filter(a=>tesFisikMap[a.id]?.kesimpulan_persen != null)
      .sort((a,b)=>(tesFisikMap[b.id]!.kesimpulan_persen||0)-(tesFisikMap[a.id]!.kesimpulan_persen||0))
      .slice(0,5)
      .map(a=>({
        nama: a.nama_lengkap,
        cabor: a.cabor_nama_raw,
        skor: tesFisikMap[a.id]?.kesimpulan_persen || 0,
      }))

    const caborRisk = kuotaSummary
      .filter(k=>k.status_kuota==='OVER'||k.status_kuota==='KRITIS')
      .slice(0,5)
      .map(c=>({nama:c.cabor_nama, aktif:c.aktif, kuota_total:c.kuota_total, status:c.status_kuota}))

    const payload = {
      kontingen: KONTINGEN_NAME,
      totalAtlet: stats.total,
      putra: stats.putra,
      putri: stats.putri,
      cabor: stats.cabor,
      sudahTes: stats.sudahTes,
      avgSkor: stats.avgSkor,
      skorTinggi: stats.skorTinggi,
      skorRendah: stats.skorRendah,
      totalEmas: stats.totalEmas,
      totalPerak: stats.totalPerak,
      totalPerunggu: stats.totalPerunggu,
      atletPrestasi: stats.atletPrestasi,
      targetEmas: TARGET_BUPATI.emas,
      targetPerak: TARGET_BUPATI.perak,
      targetPerunggu: TARGET_BUPATI.perunggu,
      hasRek: stats.hasRek,
      compliancePct: stats.compliancePct,
      caborRisk,
      topAtlet,
    }

    try {
      const res = await fetch('/api/ai-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(()=>({error:`HTTP ${res.status}`}))
        throw new Error(errData.error || `HTTP ${res.status} — pastikan ANTHROPIC_API_KEY ada di .env.local`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Streaming response tidak tersedia')

      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk
        setBriefStream(accumulated)
      }
    } catch (e: any) {
      console.error('[AI Brief]', e)
      setBriefError(e.message || 'Unknown error')
    } finally {
      setBriefStreaming(false)
    }
  }

  function copyBrief() {
    const cleanText = briefStream.replace(/<!--USAGE:[\s\S]*?-->/g, '').trim()
    navigator.clipboard.writeText(cleanText)
    setBriefCopied(true)
    setTimeout(()=>setBriefCopied(false), 2000)
  }

  function downloadBrief() {
    const cleanText = briefStream.replace(/<!--USAGE:[\s\S]*?-->/g, '').trim()
    const blob = new Blob([cleanText], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a')
    el.href = url
    el.download = `AI_Brief_${KONTINGEN_NAME.replace(/[\s.]/g,'')}_${new Date().toISOString().slice(0,10)}.md`
    el.click()
    URL.revokeObjectURL(url)
  }

  function printBrief() {
    const html = `<!DOCTYPE html><html><head><title>AI Strategic Brief — ${KONTINGEN_NAME}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#111;padding:40px;max-width:800px;margin:0 auto;line-height:1.6}
      h1{font-size:22px;color:#075985;margin-bottom:8px;border-bottom:2px solid #075985;padding-bottom:6px}
      h2{font-size:16px;color:#075985;margin:20px 0 8px;border-bottom:1px solid #e0f2fe;padding-bottom:4px}
      h3{font-size:13px;color:#92400e;margin:14px 0 6px}
      strong{color:#111}
      ul{margin:8px 0;padding-left:20px}
      li{margin:5px 0}
      p{margin:8px 0}
      hr{border:none;border-top:1px solid #d1d5db;margin:16px 0}
      .header{padding:12px 16px;background:#f0f9ff;border:1px solid #075985;border-radius:8px;margin-bottom:20px}
      @media print{button{display:none}}
    </style></head><body>
    <button onclick="window.print()" style="margin-bottom:16px;padding:8px 16px;background:#075985;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨 Print / Save as PDF</button>
    <div class="header">
      <strong>AI Sport Intelligence — Strategic Brief</strong><br>
      <span style="color:#666;font-size:10px">Kontingen ${KONTINGEN_NAME} · Generated ${new Date().toLocaleString('id-ID')} · Powered by Claude AI</span>
    </div>
    ${renderMarkdown(briefStream).replace(/style="[^"]+"/g, '')}
    </body></html>`
    const w = window.open('','_blank')
    w?.document.write(html); w?.document.close()
  }

  // ════════════════════════════════════════════════════════
  // FEATURE 2: EXECUTIVE BRIEFING DECK
  // ════════════════════════════════════════════════════════
  function generateExecutiveBriefing() {
    setLoadingFile('BRIEFING')
    const tanggal = new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})
    const topAtlet = atlets
      .filter(a=>tesFisikMap[a.id]?.kesimpulan_persen != null)
      .sort((a,b)=>(tesFisikMap[b.id]!.kesimpulan_persen||0)-(tesFisikMap[a.id]!.kesimpulan_persen||0))
      .slice(0,10)
    const caborCount: Record<string,number> = {}
    atlets.forEach(a=>{ caborCount[a.cabor_nama_raw]=(caborCount[a.cabor_nama_raw]||0)+1 })
    const topCabor = Object.entries(caborCount).sort((a,b)=>b[1]-a[1]).slice(0,5)
    const caborRisk = kuotaSummary.filter(k=>k.status_kuota==='OVER'||k.status_kuota==='KRITIS').slice(0,5)
    // TODO: ganti 0 dengan (UANG_SAKU_HARIAN * TOTAL_HARI) setelah data resmi tersedia
    const uangSaku = 0
    const totalAnggaran = uangSaku + TARGET_BUPATI.emas*TARIF_BONUS.Emas + TARGET_BUPATI.perak*TARIF_BONUS.Perak + TARGET_BUPATI.perunggu*TARIF_BONUS.Perunggu

    const html = `<!DOCTYPE html><html><head><title>Executive Briefing — ${KONTINGEN_NAME}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#020a14;color:#fff}
  .slide{width:297mm;height:210mm;padding:18mm 25mm;position:relative;background:linear-gradient(135deg,#020a14 0%,#061a10 100%);page-break-after:always;overflow:hidden}
  .slide:last-child{page-break-after:auto}
  .grid-bg{position:absolute;inset:0;opacity:0.05;background-image:linear-gradient(#38bdf8 1px,transparent 1px),linear-gradient(90deg,#38bdf8 1px,transparent 1px);background-size:30px 30px;pointer-events:none}
  h1{font-size:38px;color:#38bdf8;font-weight:900;letter-spacing:-1px;margin-bottom:6px}
  h2{font-size:24px;color:#fff;font-weight:800;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #38bdf840}
  h3{font-size:14px;color:#fbbf24;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px}
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:20px 0}
  .kpi{background:rgba(56,189,248,0.05);border:1px solid #38bdf820;border-radius:12px;padding:16px}
  .kpi .num{font-size:36px;font-weight:900;color:#38bdf8;line-height:1}
  .kpi .lbl{font-size:10px;color:#94a3b8;text-transform:uppercase;margin-top:4px}
  .footer{position:absolute;bottom:10mm;left:25mm;right:25mm;display:flex;justify-content:space-between;font-size:9px;color:#4b5563;border-top:1px solid #38bdf815;padding-top:8px}
  .badge{display:inline-block;padding:4px 10px;border-radius:4px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
  .badge-amber{background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid #fbbf2430}
  .badge-emerald{background:rgba(16,185,129,0.15);color:#0ea5e9;border:1px solid #0ea5e930}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th{background:rgba(56,189,248,0.1);color:#38bdf8;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;border-bottom:1px solid #38bdf830}
  td{padding:7px 10px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:11px;color:#cbd5e1}
  tr:nth-child(even) td{background:rgba(255,255,255,0.02)}
  .gold{color:#fbbf24;font-weight:700}.silver{color:#cbd5e1}.bronze{color:#cd7f32}
  .strip-orange{padding:12px 16px;background:rgba(239,68,68,0.08);border-left:4px solid #ef4444;border-radius:0 8px 8px 0;margin:8px 0;font-size:11px;color:#fca5a5}
  .strip-green{padding:12px 16px;background:rgba(16,185,129,0.08);border-left:4px solid #0ea5e9;border-radius:0 8px 8px 0;margin:8px 0;font-size:11px;color:#7dd3fc}
  .print-btn{position:fixed;top:20px;right:20px;background:#38bdf8;color:#020a14;border:none;padding:12px 24px;border-radius:8px;font-weight:700;cursor:pointer;z-index:1000}
  @media print{.print-btn{display:none}}
</style></head><body>
<button class="print-btn" onclick="window.print()">🖨 Save as PDF</button>
<div class="slide"><div class="grid-bg"></div>
  <div style="height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;position:relative;z-index:10">
    <div class="badge badge-amber" style="margin-bottom:20px">EXECUTIVE BRIEFING · CONFIDENTIAL</div>
    <h1 style="font-size:60px;margin-bottom:12px">KONTINGEN<br/>${KONTINGEN_NAME.toUpperCase()}</h1>
    <div style="font-size:20px;color:#fff;font-weight:600;margin-bottom:8px">Pekan Olahraga Provinsi Jawa Barat XV</div>
    <div style="font-size:14px;color:#94a3b8">7 — 20 November 2026</div>
  </div>
  <div class="footer"><span>Disusun: ${tanggal}</span><span>Slide 1 dari 10</span></div></div>
<div class="slide"><div class="grid-bg"></div>
  <h3>RINGKASAN EKSEKUTIF</h3><h2>State of the Kontingen</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="num">${stats.total}</div><div class="lbl">Atlet Verified</div></div>
    <div class="kpi"><div class="num">${stats.cabor}</div><div class="lbl">Cabor Aktif</div></div>
    <div class="kpi"><div class="num">${stats.sudahTes}</div><div class="lbl">Atlet Tes Fisik</div></div>
    <div class="kpi"><div class="num">${stats.avgSkor}%</div><div class="lbl">Avg Skor Biomotorik</div></div>
  </div>
  <div class="strip-green"><strong>STRENGTH:</strong> ${stats.skorTinggi} atlet elite (skor ≥80%). Compliance ${stats.compliancePct}%.</div>
  <div class="strip-orange"><strong>ATTENTION:</strong> ${stats.skorRendah} atlet risk performance. ${caborRisk.length} cabor kritis/over kuota.</div>
  <div class="footer"><span>Executive Briefing</span><span>Slide 2 dari 10</span></div></div>
<div class="slide"><div class="grid-bg"></div>
  <h3>TARGET vs PREDIKSI</h3><h2>Sasaran Medali PORPROV XV</h2>
  <table><thead><tr><th>Kategori</th><th>Target</th><th>Prediksi</th><th>Gap</th><th>Confidence</th></tr></thead><tbody>
    <tr><td><strong class="gold">🥇 Emas</strong></td><td>${TARGET_BUPATI.emas}</td><td>${Math.round(TARGET_BUPATI.emas*0.65)}</td><td style="color:#ef4444">-${TARGET_BUPATI.emas-Math.round(TARGET_BUPATI.emas*0.65)}</td><td>65%</td></tr>
    <tr><td><strong class="silver">🥈 Perak</strong></td><td>${TARGET_BUPATI.perak}</td><td>${Math.round(TARGET_BUPATI.perak*0.75)}</td><td style="color:#ef4444">-${TARGET_BUPATI.perak-Math.round(TARGET_BUPATI.perak*0.75)}</td><td>75%</td></tr>
    <tr><td><strong class="bronze">🥉 Perunggu</strong></td><td>${TARGET_BUPATI.perunggu}</td><td>${Math.round(TARGET_BUPATI.perunggu*0.9)}</td><td style="color:#0ea5e9">+${Math.round(TARGET_BUPATI.perunggu*0.9)-TARGET_BUPATI.perunggu}</td><td>90%</td></tr>
  </tbody></table>
  <div class="footer"><span>Medal Projection</span><span>Slide 3 dari 10</span></div></div>
<div class="slide"><div class="grid-bg"></div>
  <h3>TOP 10 ATLET ELIT</h3><h2>Ranking Skor Biomotorik</h2>
  <table><thead><tr><th>#</th><th>Nama Atlet</th><th>Cabor</th><th>Skor</th><th>Kategori</th></tr></thead><tbody>
  ${topAtlet.map((a,i)=>`<tr><td><strong style="color:${i<3?'#fbbf24':'#94a3b8'}">${i+1}</strong></td><td><strong>${a.nama_lengkap}</strong></td><td>${a.cabor_nama_raw}</td><td><strong style="color:#38bdf8">${tesFisikMap[a.id]?.kesimpulan_persen||0}%</strong></td><td>${tesFisikMap[a.id]?.kesimpulan_kategori||'-'}</td></tr>`).join('')}
  </tbody></table>
  <div class="footer"><span>Sport Science</span><span>Slide 4 dari 10</span></div></div>
<div class="slide"><div class="grid-bg"></div>
  <h3>CABOR STRATEGIC</h3><h2>Top 5 Cabor &amp; Cabor Risk</h2>
  <table><thead><tr><th>Cabor</th><th>Atlet</th><th>Kuota</th><th>Status</th></tr></thead><tbody>
  ${topCabor.map(([c,n])=>{const k=kuotaSummary.find(x=>x.cabor_nama===c);return `<tr><td><strong>${c}</strong></td><td>${n}</td><td>${k?.kuota_total||'-'}</td><td>${k?.status_kuota||'N/A'}</td></tr>`}).join('')}
  </tbody></table>
  ${caborRisk.length>0?`<div class="strip-orange"><strong>OVER/KRITIS:</strong> ${caborRisk.map(c=>`${c.cabor_nama} (${c.aktif}/${c.kuota_total})`).join(' · ')}</div>`:''}
  <div class="footer"><span>Cabor Strategic</span><span>Slide 5 dari 10</span></div></div>
<div class="slide"><div class="grid-bg"></div>
  <h3>SPORT SCIENCE</h3><h2>Tes Biomotorik Analytics</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="num">${stats.sudahTes}</div><div class="lbl">Tested</div></div>
    <div class="kpi"><div class="num">${stats.avgSkor}%</div><div class="lbl">Avg Skor</div></div>
    <div class="kpi"><div class="num" style="color:#0ea5e9">${stats.skorTinggi}</div><div class="lbl">Elite ≥80%</div></div>
    <div class="kpi"><div class="num" style="color:#ef4444">${stats.skorRendah}</div><div class="lbl">Risk &lt;50%</div></div>
  </div>
  <div class="footer"><span>Sport Science FPOK UPI</span><span>Slide 6 dari 10</span></div></div>
<div class="slide"><div class="grid-bg"></div>
  <h3>COMPLIANCE</h3><h2>Operational Readiness</h2>
  <table><thead><tr><th>Aspek</th><th>Verified</th><th>%</th></tr></thead><tbody>
  ${dokumenStats.slice(0,6).map(d=>{const pct=stats.total>0?Math.round((d.verified||0)/stats.total*100):0;return `<tr><td><strong>${d.nama}</strong></td><td>${d.verified||0}</td><td>${pct}%</td></tr>`}).join('')}
  </tbody></table>
  <div class="footer"><span>Compliance</span><span>Slide 7 dari 10</span></div></div>
<div class="slide"><div class="grid-bg"></div>
  <h3>ANGGARAN</h3><h2>Estimasi Pengeluaran</h2>
  <table><thead><tr><th>Komponen</th><th>Volume</th><th>Tarif</th><th>Subtotal</th></tr></thead><tbody>
    <tr><td><strong>Uang Saku</strong></td><td>${stats.total}×14 hr</td><td>Belum ditetapkan</td><td><strong>Rp ${uangSaku.toLocaleString('id')}</strong></td></tr>
    <tr><td class="gold">Bonus Emas</td><td>${TARGET_BUPATI.emas}</td><td>Rp ${TARIF_BONUS.Emas.toLocaleString('id')}</td><td><strong>Rp ${(TARGET_BUPATI.emas*TARIF_BONUS.Emas).toLocaleString('id')}</strong></td></tr>
    <tr><td class="silver">Bonus Perak</td><td>${TARGET_BUPATI.perak}</td><td>Rp ${TARIF_BONUS.Perak.toLocaleString('id')}</td><td><strong>Rp ${(TARGET_BUPATI.perak*TARIF_BONUS.Perak).toLocaleString('id')}</strong></td></tr>
    <tr><td class="bronze">Bonus Perunggu</td><td>${TARGET_BUPATI.perunggu}</td><td>Rp ${TARIF_BONUS.Perunggu.toLocaleString('id')}</td><td><strong>Rp ${(TARGET_BUPATI.perunggu*TARIF_BONUS.Perunggu).toLocaleString('id')}</strong></td></tr>
    <tr style="background:rgba(56,189,248,0.08)"><td colspan="3"><strong style="color:#38bdf8">TOTAL ANGGARAN</strong></td><td><strong style="color:#38bdf8;font-size:14px">Rp ${totalAnggaran.toLocaleString('id')}</strong></td></tr>
  </tbody></table>
  <div class="footer"><span>Financial</span><span>Slide 8 dari 10</span></div></div>
<div class="slide"><div class="grid-bg"></div>
  <h3>RISK MITIGATION</h3><h2>Potential Risks</h2>
  <table><thead><tr><th>Risk</th><th>Severity</th><th>Mitigasi</th></tr></thead><tbody>
    <tr><td><strong>${stats.skorRendah} Atlet Risk</strong></td><td><span class="badge" style="background:#ef444420;color:#ef4444">HIGH</span></td><td>Personalized training</td></tr>
    <tr><td><strong>${caborRisk.length} Cabor Over</strong></td><td><span class="badge" style="background:#fbbf2420;color:#fbbf24">MED</span></td><td>Review kuota</td></tr>
    <tr><td><strong>Compliance ${100-stats.compliancePct}% gap</strong></td><td><span class="badge" style="background:#fbbf2420;color:#fbbf24">MED</span></td><td>Deadline H-30</td></tr>
  </tbody></table>
  <div class="footer"><span>Risk Management</span><span>Slide 9 dari 10</span></div></div>
<div class="slide"><div class="grid-bg"></div>
  <div style="height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;position:relative;z-index:10">
    <div class="badge badge-emerald" style="margin-bottom:20px">ROADMAP &amp; NEXT STEPS</div>
    <h1 style="font-size:44px;margin-bottom:30px">Menuju PORPROV XV</h1>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;width:100%;max-width:800px">
      <div style="padding:20px;background:rgba(56,189,248,0.05);border:1px solid #38bdf830;border-radius:12px"><div style="font-size:32px;color:#38bdf8;font-weight:900">H-150</div><div style="font-size:11px;color:#94a3b8">Finalisasi Roster</div></div>
      <div style="padding:20px;background:rgba(251,191,36,0.05);border:1px solid #fbbf2430;border-radius:12px"><div style="font-size:32px;color:#fbbf24;font-weight:900">H-60</div><div style="font-size:11px;color:#94a3b8">TC Intensif</div></div>
      <div style="padding:20px;background:rgba(239,68,68,0.05);border:1px solid #ef444430;border-radius:12px"><div style="font-size:32px;color:#ef4444;font-weight:900">H-7</div><div style="font-size:11px;color:#94a3b8">Apel Pelepasan</div></div>
    </div>
    <div style="margin-top:40px;padding:14px 40px;border:1px solid #38bdf840;border-radius:8px;color:#38bdf8;font-size:11px;letter-spacing:2px">TERIMA KASIH</div>
  </div>
  <div class="footer"><span>End</span><span>Slide 10 dari 10</span></div></div>
</body></html>`
    const w = window.open('','_blank'); if (w) { w.document.write(html); w.document.close() }
    setLoadingFile(null)
  }

  // ════════════════════════════════════════════════════════
  // FEATURE 3: MEDAL PROJECTION ENGINE
  // ════════════════════════════════════════════════════════
  async function generateMedalProjection() {
    setLoadingFile('PROJECTION')
    try {
      const XLSX = await import('xlsx')
      const atletProjections = atlets.map(a=>{
        const tes = tesFisikMap[a.id]
        const prest = prestasiMap[a.id] || {emas:0,perak:0,perunggu:0}
        const kuota = kuotaSummary.find(k=>k.cabor_nama===a.cabor_nama_raw)
        const skorFisik = tes?.kesimpulan_persen||0
        const trackEmasNorm = Math.min(prest.emas * 25, 100)
        const kuotaScore = kuota ? (kuota.status_kuota==='OPEN'||kuota.status_kuota==='KRITIS' ? 80 : 50) : 50
        const probEmas = Math.round((skorFisik*0.4) + (trackEmasNorm*0.3) + (kuotaScore*0.2) + (70*0.1))
        let prediksiMedali = 'Partisipasi'
        if (probEmas >= 70) prediksiMedali = 'Emas Potential'
        else if (probEmas >= 55) prediksiMedali = 'Podium Potential'
        else if (probEmas >= 40) prediksiMedali = 'Competitive'
        return { atlet: a, prest, skorFisik, probEmas, prediksiMedali, cabor: a.cabor_nama_raw }
      }).sort((a,b)=>b.probEmas-a.probEmas)

      const caborSummary: Record<string,any> = {}
      atletProjections.forEach(p=>{
        if (!caborSummary[p.cabor]) caborSummary[p.cabor] = {atlets:0,sumProb:0,probEmas:0,probPerak:0,probPodium:0}
        caborSummary[p.cabor].atlets++
        caborSummary[p.cabor].sumProb += p.probEmas
        if (p.probEmas >= 70) caborSummary[p.cabor].probEmas++
        else if (p.probEmas >= 55) caborSummary[p.cabor].probPerak++
        else if (p.probEmas >= 40) caborSummary[p.cabor].probPodium++
      })

      const wb = XLSX.utils.book_new()
      const ws1 = XLSX.utils.aoa_to_sheet([
        ['CABOR-LEVEL MEDAL PROJECTION'],
        ['Kontingen', KONTINGEN_NAME],['Generated', new Date().toLocaleString('id-ID')],[],
        ['Cabor','Atlet','Avg Prob','Emas','Perak','Podium'],
        ...Object.entries(caborSummary).sort(([,a]:any,[,b]:any)=>b.probEmas-a.probEmas)
          .map(([c,v]:any)=>[c, v.atlets, Math.round(v.sumProb/v.atlets)+'%', v.probEmas, v.probPerak, v.probPodium]),
      ])
      ws1['!cols'] = [{wch:25},{wch:8},{wch:12},{wch:8},{wch:8},{wch:10}]
      XLSX.utils.book_append_sheet(wb, ws1, 'Cabor Summary')

      const ws2 = XLSX.utils.aoa_to_sheet([
        ['TOP 50 ATLET PROJECTION'],[],
        ['Rank','Nama','Cabor','Skor','Track Emas','Prob','Prediksi'],
        ...atletProjections.slice(0,50).map((p,i)=>[i+1, p.atlet.nama_lengkap, p.cabor, p.skorFisik+'%', p.prest.emas, p.probEmas+'%', p.prediksiMedali]),
      ])
      ws2['!cols'] = [{wch:5},{wch:30},{wch:20},{wch:8},{wch:10},{wch:8},{wch:18}]
      XLSX.utils.book_append_sheet(wb, ws2, 'Top 50 Atlet')

      const totalEmasP = atletProjections.filter(p=>p.probEmas>=70).length
      const totalPerakP = atletProjections.filter(p=>p.probEmas>=55 && p.probEmas<70).length
      const totalPodiumP = atletProjections.filter(p=>p.probEmas>=40 && p.probEmas<55).length
      const ws3 = XLSX.utils.aoa_to_sheet([
        ['GAP ANALYSIS: TARGET vs PREDIKSI'],[],
        ['Kategori','Target','Prediksi','Gap','Status'],
        ['🥇 Emas', TARGET_BUPATI.emas, totalEmasP, totalEmasP-TARGET_BUPATI.emas, totalEmasP>=TARGET_BUPATI.emas?'ON TRACK':'UNDER'],
        ['🥈 Perak', TARGET_BUPATI.perak, totalPerakP, totalPerakP-TARGET_BUPATI.perak, totalPerakP>=TARGET_BUPATI.perak?'ON TRACK':'UNDER'],
        ['🥉 Perunggu', TARGET_BUPATI.perunggu, totalPodiumP, totalPodiumP-TARGET_BUPATI.perunggu, totalPodiumP>=TARGET_BUPATI.perunggu?'ON TRACK':'UNDER'],
        [],['Formula:'],['prob = skor×0.4 + track×0.3 + kuota×0.2 + compliance×0.1'],
      ])
      ws3['!cols'] = [{wch:18},{wch:12},{wch:12},{wch:8},{wch:14}]
      XLSX.utils.book_append_sheet(wb, ws3, 'Gap Analysis')

      XLSX.writeFile(wb, `Medal_Projection_KabBandung_${new Date().toISOString().slice(0,10)}.xlsx`)
    } catch(e:any){ console.error(e); alert('Gagal: '+e.message) }
    finally { setLoadingFile(null) }
  }

  // ════════════════════════════════════════════════════════
  // FEATURE 4: ID CARD MASSAL
  // ════════════════════════════════════════════════════════
  function generateIDCardMassal() {
    setLoadingFile('IDCARD')
    const verified = atlets.slice(0, 50)
    const html = `<!DOCTYPE html><html><head><title>ID Card — ${KONTINGEN_NAME}</title>
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
<style>
  @page{size:A4;margin:10mm}*{box-sizing:border-box;margin:0;padding:0;font-family:Arial,sans-serif}
  body{background:#f3f4f6;padding:20px}.page{width:210mm;padding:5mm;display:grid;grid-template-columns:repeat(2,1fr);gap:4mm;page-break-after:always}
  .page:last-child{page-break-after:auto}
  .card{width:85.6mm;height:54mm;background:linear-gradient(135deg,#075985 0%,#0c4a6e 50%,#082f49 100%);border-radius:3mm;padding:3mm;color:#fff;position:relative;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:flex}
  .card::before{content:'';position:absolute;top:0;left:0;right:0;height:1mm;background:linear-gradient(90deg,#38bdf8,#0ea5e9,#38bdf8)}
  .card-wm{position:absolute;right:-10mm;bottom:-10mm;font-size:30mm;opacity:0.08;color:#38bdf8}
  .card-left{flex:1;padding-right:2mm;z-index:1}.card-right{width:22mm;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1}
  .org{font-size:6pt;color:#38bdf8;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:1mm}
  .nama{font-size:11pt;font-weight:800;color:#fff;line-height:1.1;margin-bottom:1mm;max-height:11mm;overflow:hidden}
  .info{font-size:7pt;color:#94a3b8;margin-bottom:0.5mm}.info strong{color:#fff}
  .badge{display:inline-block;padding:0.5mm 1.5mm;background:rgba(56,189,248,0.2);border:0.3mm solid #38bdf8;border-radius:0.8mm;font-size:6pt;color:#38bdf8;font-weight:700;text-transform:uppercase;margin-top:1mm}
  .qr{width:18mm;height:18mm;background:#fff;padding:1mm;border-radius:1mm}.qr canvas{width:100%!important;height:100%!important}
  .qr-lbl{font-size:5pt;color:#94a3b8;margin-top:1mm}
  .print-btn{position:fixed;top:20px;right:20px;background:#075985;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-weight:700;cursor:pointer;z-index:1000}
  @media print{.print-btn{display:none}body{background:#fff;padding:0}}
</style></head><body>
<button class="print-btn" onclick="window.print()">🖨 Print ${verified.length} ID Cards</button>
${Array.from({length:Math.ceil(verified.length/8)},(_,pi)=>`<div class="page">${verified.slice(pi*8,(pi+1)*8).map((a,i)=>{const cid=`qr-${pi}-${i}`;return `<div class="card"><div class="card-wm">🏆</div><div class="card-left"><div class="org">PORPROV XV · ${KONTINGEN_NAME.toUpperCase()}</div><div class="nama">${a.nama_lengkap}</div><div class="info"><strong>NIK:</strong> ${a.no_ktp||'-'}</div><div class="info"><strong>Cabor:</strong> ${a.cabor_nama_raw}</div><div class="info"><strong>Reg:</strong> #${a.no_registrasi_koni||'-'}</div><div class="info">${hitungUmur(a.tgl_lahir)}th · ${a.gender==='L'?'Putra':'Putri'}</div><span class="badge">${a.status_registrasi}</span></div><div class="card-right"><div class="qr" id="${cid}"></div><div class="qr-lbl">SCAN</div></div></div>`}).join('')}</div>`).join('')}
<script>
document.addEventListener('DOMContentLoaded',function(){
  ${verified.map((a,idx)=>{const pi=Math.floor(idx/8);const ci=idx%8;return `QRCode.toCanvas(document.getElementById('qr-${pi}-${ci}'),'https://porprov-xv.vercel.app/atlet/${a.id}',{width:80,margin:0,color:{dark:'#075985',light:'#ffffff'}}).catch(console.error);`}).join('')}
});
</script></body></html>`
    const w = window.open('','_blank'); if (w) { w.document.write(html); w.document.close() }
    setLoadingFile(null)
  }

  // ════════════════════════════════════════════════════════
  // EXISTING (UNCHANGED): SPJ, BUKU, SERTIFIKAT
  // ════════════════════════════════════════════════════════
  async function generateSPJBonus() {
    setLoadingFile('SPJ')
    try {
      const XLSX = await import('xlsx')
      const cols = ['No','Nama','Cabor','Gender','Bank','No Rekening','Ket','Keterangan']
      const rows: any[][] = []
      let no = 1
      atlets.filter(a=>a.nama_bank&&a.no_rekening).sort((a,b)=>a.cabor_nama_raw.localeCompare(b.cabor_nama_raw)).forEach(a=>{
        rows.push([no++, a.nama_lengkap, a.cabor_nama_raw, a.gender==='L'?'L':'P', a.nama_bank, a.no_rekening, `A.n. ${a.nama_lengkap}`, 'Bonus PORPROV XV'])
      })
      const ws1 = XLSX.utils.aoa_to_sheet([cols,...rows])
      ws1['!cols'] = cols.map(()=>({wch:22}))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws1, 'Daftar Rekening')
      XLSX.writeFile(wb, `SPJ_Bonus_${new Date().toISOString().slice(0,10)}.xlsx`)
    } catch(e){ alert('Gagal') } finally { setLoadingFile(null) }
  }

  function generateBukuHasil() {
    setLoadingFile('BUKU')
    const HARI = Array.from({length:14},(_,i)=>{const d=new Date('2026-11-07');d.setDate(d.getDate()+i);return {hari:i+1,tgl:d.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}})
    const totalJurnal = Object.values(jurnalLS).reduce((s,l)=>s+l.length,0)
    const html = `<!DOCTYPE html><html><head><title>Buku Hasil</title><style>body{font-family:Arial,sans-serif;font-size:10px;padding:30px}h1{font-size:16px;text-align:center}table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#075985;color:#fff;padding:5px 8px;font-size:9px}td{padding:4px 8px;border-bottom:1px solid #e5e7eb;font-size:9px}@media print{button{display:none}}</style></head><body><h1>BUKU HASIL — ${KONTINGEN_NAME}</h1><p style="text-align:center;color:#666">PORPROV XV · 7-20 Nov 2026</p><button onclick="window.print()" style="margin:10px;padding:6px 16px;background:#075985;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨 Print</button>${totalJurnal===0?'<p style="padding:20px;background:#fef3c7;text-align:center;color:#92400e">Belum ada jurnal diinput</p>':HARI.map(h=>{const laga=jurnalLS[h.hari]||[];if(laga.length===0)return '';return `<h3 style="margin-top:16px;color:#075985">Hari ke-${h.hari} · ${h.tgl}</h3><table><thead><tr><th>Waktu</th><th>Cabor</th><th>Hasil</th><th>Medali</th></tr></thead><tbody>${laga.map(j=>`<tr><td>${j.waktu||'—'}</td><td><strong>${j.cabor}</strong></td><td>${j.hasil}</td><td>${j.medali==='Emas'?'🥇':j.medali==='Perak'?'🥈':j.medali==='Perunggu'?'🥉':'—'} ${j.medali}</td></tr>`).join('')}</tbody></table>`}).join('')}</body></html>`
    const w = window.open('','_blank'); w?.document.write(html); w?.document.close(); setLoadingFile(null)
  }

  function cetakSertifikat() {
    setLoadingFile('CERT')
    const html = `<!DOCTYPE html><html><head><title>Sertifikat</title><style>body{font-family:'Georgia',serif;margin:0}.page{width:210mm;height:148mm;padding:20mm;border:8px double #075985;margin:0 auto 20px;background:linear-gradient(135deg,#f0f9ff,#fff);page-break-after:always}h1{font-size:22px;text-align:center;color:#075985;letter-spacing:2px}.nama{font-size:24px;text-align:center;color:#111;font-weight:800;margin:20px 0;border-bottom:2px solid #075985;padding-bottom:6px}.medali{font-size:18px;text-align:center;font-weight:800;color:#b45309;margin:12px 0}button{margin:8px;padding:6px 16px;background:#075985;color:#fff;border:none;border-radius:6px;cursor:pointer}@media print{button{display:none}}</style></head><body><button onclick="window.print()">🖨 Cetak</button>${atlets.slice(0,Math.max(stats.emas,3)).map(a=>`<div class="page"><div style="font-size:40px;text-align:center">🏆</div><h1>PIAGAM PENGHARGAAN</h1><h2 style="font-size:14px;text-align:center;color:#374151;font-weight:normal">PORPROV XV JAWA BARAT 2026</h2><p style="text-align:center;font-size:11px;color:#666;margin-top:16px">Diberikan kepada:</p><div class="nama">${a.nama_lengkap}</div><p style="text-align:center;font-size:13px;color:#075985">Cabor: <strong>${a.cabor_nama_raw}</strong></p><div class="medali">🥇 MEDALI EMAS</div></div>`).join('')}</body></html>`
    const w = window.open('','_blank'); w?.document.write(html); w?.document.close(); setLoadingFile(null)
  }

  const ani=(d=0)=>({
    style:{transitionDelay:`${d}ms`,transition:'all 0.5s ease'},
    className:animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4',
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#020a14'}}>
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{color:ACCENT}}/>
        <p className="font-mono text-xs uppercase tracking-widest" style={{color:ACCENT}}>Memuat Premium Hub...</p>
      </div>
    </div>
  )

  const hasBrief = briefStream.trim().length > 0 || briefError !== null
  const briefHTML = renderMarkdown(briefStream)

  return (
    <div className="min-h-screen text-zinc-300 flex flex-col"
      style={{background:'linear-gradient(135deg,#020a14 0%,#03101c 100%)'}}>

      <div className="fixed inset-0 pointer-events-none"
        style={{backgroundImage:`linear-gradient(${ACCENT}03 1px,transparent 1px),linear-gradient(90deg,${ACCENT}03 1px,transparent 1px)`,backgroundSize:'32px 32px',zIndex:0}}/>

      <div className="sticky top-0 z-40 border-b backdrop-blur-xl px-6 py-4"
        style={{background:'rgba(2,10,20,0.95)',borderColor:`${ACCENT}12`}}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{background:`${ACCENT}12`,border:`1px solid ${ACCENT}25`}}>
              <Database size={20} style={{color:ACCENT}}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Premium Report Hub</h1>
              <p className="text-[11px] font-mono mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>
                AI-Powered Strategic Output · {KONTINGEN_NAME}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[{v:stats.total,l:'Atlet',c:ACCENT},{v:stats.sudahTes,l:'Tested',c:'#0ea5e9'},{v:stats.emas,l:'🥇',c:'#fbbf24'},{v:stats.hasRek,l:'Rek',c:'#60a5fa'}].map(s=>(
              <div key={s.l} className="px-3 py-2 rounded-xl text-center" style={{background:`${s.c}10`,border:`1px solid ${s.c}20`}}>
                <div className="text-base font-black" style={{color:s.c}}>{s.v||'—'}</div>
                <div className="text-[9px] text-zinc-500 uppercase">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto space-y-6 relative z-10">

        {/* ═════════ HERO: AI SPORT INTELLIGENCE ═════════ */}
        <div {...ani(0)} className="rounded-3xl p-8 relative overflow-hidden"
          style={{
            background:'linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(56,189,248,0.06) 50%, rgba(59,130,246,0.08) 100%)',
            border:'1px solid rgba(168,85,247,0.3)',
          }}>
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full pointer-events-none"
            style={{background:'radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)'}}/>
          <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full pointer-events-none"
            style={{background:'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)'}}/>

          <div className="relative flex items-center gap-6 flex-wrap">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center flex-shrink-0 relative"
              style={{background:'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #3b82f6 100%)', boxShadow:'0 20px 50px rgba(168,85,247,0.4)'}}>
              <Brain size={48} className="text-white"/>
              <Sparkles size={18} className="absolute -top-1 -right-1 text-yellow-300 animate-pulse"/>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center"
                style={{background:'#0ea5e9', border:'2px solid #020a14'}}>
                <Cpu size={11} className="text-white"/>
              </div>
            </div>

            <div className="flex-1 min-w-[300px]">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded"
                  style={{background:'rgba(168,85,247,0.25)',color:'#c4b5fd',border:'1px solid rgba(168,85,247,0.4)'}}>
                  ⭐ FLAGSHIP FEATURE
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded"
                  style={{background:'rgba(56,189,248,0.2)',color:ACCENT,border:`1px solid ${ACCENT}40`}}>
                  POWERED BY CLAUDE
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded animate-pulse"
                  style={{background:'rgba(16,185,129,0.2)',color:'#0ea5e9',border:'1px solid rgba(16,185,129,0.4)'}}>
                  ● LIVE AI
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-2 leading-tight">
                AI Sport Intelligence
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed max-w-[700px] mb-1">
                Generate <strong className="text-white">Strategic Brief level konsultan tier-1</strong> langsung dari halaman ini.
                Claude AI menganalisa <strong style={{color:ACCENT}}>{stats.total} atlet</strong> · <strong style={{color:'#0ea5e9'}}>{stats.sudahTes} tes biomotorik</strong> · <strong style={{color:'#fbbf24'}}>{stats.totalEmas+stats.totalPerak+stats.totalPerunggu} prestasi historic</strong> dalam 30 detik.
              </p>
            </div>

            <div className="flex flex-col gap-2 flex-shrink-0">
              <button onClick={generateAIBrief} disabled={briefStreaming}
                className="px-7 py-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95"
                style={{
                  background:'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                  color:'#fff', boxShadow:'0 15px 40px rgba(168,85,247,0.5)',
                  minWidth:240,
                }}>
                {briefStreaming ? <Loader2 size={18} className="animate-spin"/> : <Wand2 size={18}/>}
                {briefStreaming ? 'AI Analyzing...' : hasBrief ? 'Generate Ulang' : 'Generate AI Brief'}
              </button>
              <a href="/konida/sipa/kabbandung" target="_blank" rel="noopener"
                className="px-7 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)'}}>
                <ExternalLink size={12}/> Open Sport Intel Hub
              </a>
            </div>
          </div>
        </div>

        {/* ═════════ AI BRIEF OUTPUT (INLINE) ═════════ */}
        {(briefStreaming || hasBrief) && (
          <div ref={briefSectionRef} className="rounded-3xl overflow-hidden"
            style={{background:'rgba(255,255,255,0.025)', border:`1px solid rgba(168,85,247,${briefStreaming?0.4:0.25})`}}>
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-2"
              style={{background:'rgba(168,85,247,0.06)', borderBottom:'1px solid rgba(168,85,247,0.15)'}}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Brain size={20} style={{color:'#a855f7'}}/>
                  {briefStreaming && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
                      style={{background:'#0ea5e9', boxShadow:'0 0 8px #0ea5e9'}}/>
                  )}
                </div>
                <div>
                  <div className="text-sm font-black text-white flex items-center gap-2">
                    AI Strategic Brief
                    {briefStreaming && <span className="text-[10px] font-mono text-sky-400 animate-pulse">● STREAMING</span>}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    Claude Sonnet 4.5 · {KONTINGEN_NAME} · {new Date().toLocaleTimeString('id-ID')}
                  </div>
                </div>
              </div>

              {hasBrief && !briefStreaming && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button onClick={copyBrief}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{background:briefCopied?'rgba(16,185,129,0.15)':'rgba(255,255,255,0.05)', color:briefCopied?'#0ea5e9':'rgba(255,255,255,0.7)', border:`1px solid ${briefCopied?'rgba(16,185,129,0.3)':'rgba(255,255,255,0.1)'}`}}>
                    {briefCopied ? <CheckCircle size={11}/> : <Copy size={11}/>}
                    {briefCopied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={downloadBrief}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.1)'}}>
                    <Download size={11}/> Markdown
                  </button>
                  <button onClick={printBrief}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{background:'rgba(168,85,247,0.15)', color:'#c4b5fd', border:'1px solid rgba(168,85,247,0.3)'}}>
                    <Printer size={11}/> Print PDF
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 md:p-8" style={{maxHeight:'70vh', overflowY:'auto'}}>
              {briefError ? (
                <div className="rounded-2xl p-6"
                  style={{background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.25)'}}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{background:'rgba(239,68,68,0.15)'}}>
                      <X size={18} className="text-red-400"/>
                    </div>
                    <div>
                      <div className="text-base font-bold text-red-300 mb-1">AI Brief Gagal Digenerate</div>
                      <div className="text-xs text-red-400/80 font-mono mb-4">{briefError}</div>
                      <div className="text-xs text-zinc-400 leading-relaxed space-y-1">
                        <div><strong className="text-white">Kemungkinan penyebab:</strong></div>
                        <div>• <code className="text-amber-400">ANTHROPIC_API_KEY</code> belum di-set di <code>.env.local</code></div>
                        <div>• API endpoint <code>/api/ai-brief/route.ts</code> belum dibuat</div>
                        <div>• Network error atau API rate limit Anthropic</div>
                        <div>• Saldo Anthropic habis (cek di console.anthropic.com)</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : briefStream.trim() === '' && briefStreaming ? (
                <div className="py-12 text-center">
                  <div className="relative inline-block">
                    <Loader2 size={48} className="animate-spin" style={{color:'#a855f7'}}/>
                    <Sparkles size={20} className="absolute -top-2 -right-2 text-yellow-300 animate-pulse"/>
                  </div>
                  <div className="text-base font-bold text-white mt-4 mb-1">Claude sedang menganalisa kontingen...</div>
                  <div className="text-xs text-zinc-500">Generating strategic brief level konsultan</div>
                  <div className="flex justify-center gap-1 mt-4">
                    {[0,1,2].map(i=>(
                      <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                        style={{background:'#a855f7', animationDelay:`${i*0.15}s`}}/>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="brief-content"
                  dangerouslySetInnerHTML={{__html: briefHTML}}/>
              )}

              {briefStreaming && briefStream.trim() !== '' && (
                <div className="inline-block w-2 h-4 align-middle animate-pulse ml-1"
                  style={{background:'#a855f7'}}/>
              )}
            </div>
          </div>
        )}

        {/* ═════════ STRATEGIC REPORTS ═════════ */}
        <div {...ani(40)} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full" style={{background:ACCENT}}/>
            <h3 className="text-sm font-black uppercase tracking-widest" style={{color:ACCENT}}>Strategic Reports</h3>
            <div className="flex-1 h-px" style={{background:`${ACCENT}15`}}/>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-2xl p-5 flex flex-col" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(168,85,247,0.25)'}}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'rgba(168,85,247,0.12)',border:'1px solid rgba(168,85,247,0.25)'}}><Presentation size={22} style={{color:'#a855f7'}}/></div>
                <div><h4 className="text-sm font-bold text-white mb-1">Executive Briefing Deck</h4><div className="text-[10px] text-zinc-500">10 slides · HTML 16:9</div></div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed flex-1 mb-4">Auto-generated presentation: Cover, Exec Summary, Target vs Prediksi, Top 10 Atlet, Cabor Strategic, Sport Science, Compliance, Anggaran, Risk, Closing.</p>
              <button onClick={generateExecutiveBriefing} disabled={loadingFile!==null} className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40" style={{background:'rgba(168,85,247,0.12)',border:'1px solid rgba(168,85,247,0.3)',color:'#c4b5fd'}}>{loadingFile==='BRIEFING'?<Loader2 size={14} className="animate-spin"/>:<Presentation size={14}/>}{loadingFile==='BRIEFING'?'Generating...':'GENERATE'}</button>
            </div>
            <div className="rounded-2xl p-5 flex flex-col" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(16,185,129,0.25)'}}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.25)'}}><Target size={22} style={{color:'#0ea5e9'}}/></div>
                <div><h4 className="text-sm font-bold text-white mb-1">Medal Projection Engine</h4><div className="text-[10px] text-zinc-500">Excel 3-sheet · Predictive</div></div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed flex-1 mb-4">Excel multi-sheet: Cabor Summary, Top 50 atlet projection, Gap Analysis Target vs Prediksi. Formula-based scoring.</p>
              <button onClick={generateMedalProjection} disabled={loadingFile!==null} className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40" style={{background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.3)',color:'#7dd3fc'}}>{loadingFile==='PROJECTION'?<Loader2 size={14} className="animate-spin"/>:<Download size={14}/>}{loadingFile==='PROJECTION'?'Computing...':'GENERATE'}</button>
            </div>
            <div className="rounded-2xl p-5 flex flex-col" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(59,130,246,0.25)'}}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'rgba(59,130,246,0.12)',border:'1px solid rgba(59,130,246,0.25)'}}><IdCard size={22} style={{color:'#3b82f6'}}/></div>
                <div><h4 className="text-sm font-bold text-white mb-1">Kartu Identitas Atlet</h4><div className="text-[10px] text-zinc-500">85.6×54mm · QR Code</div></div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed flex-1 mb-4">Mass print ID card credit-card size dengan QR code scan-able. 8 card per A4.</p>
              <button onClick={generateIDCardMassal} disabled={loadingFile!==null} className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40" style={{background:'rgba(59,130,246,0.12)',border:'1px solid rgba(59,130,246,0.3)',color:'#93c5fd'}}>{loadingFile==='IDCARD'?<Loader2 size={14} className="animate-spin"/>:<IdCard size={14}/>}{loadingFile==='IDCARD'?'Generating...':'PRINT 50'}</button>
            </div>
          </div>
        </div>

        {/* ═════════ OPERATIONAL ═════════ */}
        <div {...ani(80)} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full" style={{background:'#fbbf24'}}/>
            <h3 className="text-sm font-black uppercase tracking-widest" style={{color:'#fbbf24'}}>Operational Deliverables</h3>
            <div className="flex-1 h-px" style={{background:'rgba(251,191,36,0.15)'}}/>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-2xl p-5 flex flex-col" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,215,0,0.2)'}}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background:'rgba(255,215,0,0.1)',border:'1px solid rgba(255,215,0,0.2)'}}><Coins size={22} style={{color:'#ffd700'}}/></div>
                <div><h4 className="text-sm font-bold text-white">SPJ Bonus</h4><div className="text-[10px] text-zinc-500">{stats.hasRek} rekening</div></div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed flex-1 mb-4">Excel daftar rekening atlet siap transfer bonus.</p>
              <button onClick={generateSPJBonus} disabled={loadingFile!==null} className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40" style={{background:'rgba(255,215,0,0.1)',border:'1px solid rgba(255,215,0,0.25)',color:'#ffd700'}}>{loadingFile==='SPJ'?<Loader2 size={14} className="animate-spin"/>:<Download size={14}/>}{loadingFile==='SPJ'?'...':'EXCEL'}</button>
            </div>
            <div className="rounded-2xl p-5 flex flex-col" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(96,165,250,0.2)'}}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.2)'}}><FileCheck size={22} style={{color:'#60a5fa'}}/></div>
                <div><h4 className="text-sm font-bold text-white">Buku Hasil</h4><div className="text-[10px] text-zinc-500">{jurnalTotal.laga} laga · {jurnalTotal.total} medali</div></div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed flex-1 mb-4">Kompilasi jurnal harian jadi buku resmi.</p>
              <button onClick={generateBukuHasil} disabled={loadingFile!==null} className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40" style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.25)',color:'#60a5fa'}}>{loadingFile==='BUKU'?<Loader2 size={14} className="animate-spin"/>:<Printer size={14}/>}{loadingFile==='BUKU'?'...':'PRINT'}</button>
            </div>
            <div className="rounded-2xl p-5 flex flex-col" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(248,113,113,0.2)'}}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.2)'}}><Award size={22} style={{color:'#f87171'}}/></div>
                <div><h4 className="text-sm font-bold text-white">Sertifikat Juara</h4><div className="text-[10px] text-zinc-500">{stats.emas} peraih emas</div></div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed flex-1 mb-4">Template piagam A5 landscape siap cetak.</p>
              <button onClick={cetakSertifikat} disabled={loadingFile!==null} className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40" style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.25)',color:'#f87171'}}>{loadingFile==='CERT'?<Loader2 size={14} className="animate-spin"/>:<Printer size={14}/>}{loadingFile==='CERT'?'...':'CETAK'}</button>
            </div>
          </div>
        </div>

        <div {...ani(120)} className="rounded-2xl p-5 flex items-start gap-3"
          style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)'}}>
          <Info size={15} style={{color:ACCENT,flexShrink:0,marginTop:2}}/>
          <div className="text-xs text-zinc-400 leading-relaxed">
            <strong className="text-white">Premium Report Hub</strong> · 7 strategic & operational outputs · Powered by Supabase + Claude AI + XLSX
          </div>
        </div>
      </main>
    </div>
  )
}
