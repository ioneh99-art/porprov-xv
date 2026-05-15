'use client'
import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  Users, Trophy, CheckCircle, Clock, AlertTriangle,
  ChevronRight, Zap, Shield, Target, BarChart3,
  TrendingUp, Activity, AlertCircle, MapPin
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Issue {
  level: 'critical' | 'warning'
  msg: string
  link: string
}

interface KontingenStat {
  nama: string
  total: number
  putra: number
  putri: number
  siap: number
  menunggu: number
  ditolak: number
  progress: number
}

// ── Koordinat per kontingen ───────────────────────────────────────────────────
const KONTINGEN_COORDS: Record<string, [number, number]> = {
  'KAB. BOGOR':          [-6.595, 106.816],
  'KAB. SUKABUMI':       [-6.927, 106.630],
  'KAB. CIANJUR':        [-6.820, 107.140],
  'KAB. BANDUNG':        [-7.083, 107.550],
  'KAB. GARUT':          [-7.212, 107.905],
  'KAB. TASIKMALAYA':    [-7.350, 108.107],
  'KAB. CIAMIS':         [-7.330, 108.350],
  'KAB. KUNINGAN':       [-6.976, 108.485],
  'KAB. CIREBON':        [-6.760, 108.548],
  'KAB. MAJALENGKA':     [-6.836, 108.228],
  'KAB. SUMEDANG':       [-6.857, 107.919],
  'KAB. INDRAMAYU':      [-6.327, 108.320],
  'KAB. SUBANG':         [-6.571, 107.759],
  'KAB. PURWAKARTA':     [-6.556, 107.443],
  'KAB. KARAWANG':       [-6.321, 107.338],
  'KAB. BEKASI':         [-6.375, 107.038],
  'KAB. BANDUNG BARAT':  [-6.840, 107.421],
  'KAB. PANGANDARAN':    [-7.600, 108.490],
  'KOTA BOGOR':          [-6.597, 106.806],
  'KOTA SUKABUMI':       [-6.921, 106.930],
  'KOTA BANDUNG':        [-6.914, 107.609],
  'KOTA CIREBON':        [-6.706, 108.557],
  'KOTA BEKASI':         [-6.238, 106.975],
  'KOTA DEPOK':          [-6.402, 106.794],
  'KOTA TASIKMALAYA':    [-7.327, 108.220],
  'KOTA BANJAR':         [-7.368, 108.538],
  'KOTA CIMAHI':         [-6.872, 107.542],
}

function getMarkerColor(progress: number, total: number) {
  if (total === 0) return '#475569'
  if (progress >= 80) return '#10b981'
  if (progress >= 50) return '#f59e0b'
  if (progress > 0)   return '#3b82f6'
  return '#ef4444'
}

function getStatusLabel(progress: number, total: number) {
  if (total === 0) return 'Belum ada data'
  if (progress >= 80) return '✅ On Track'
  if (progress >= 50) return '⚡ Perlu Akselerasi'
  if (progress > 0)   return '⚠️ Tertinggal'
  return '🔴 Belum Mulai'
}

// ── Leaflet Map Component ─────────────────────────────────────────────────────
function PetaLeaflet({ perKontingen }: { perKontingen: KontingenStat[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Fix React StrictMode double-invoke & "Map container already initialized"
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }
    const container = mapRef.current as any
    if (container._leaflet_id) {
      container._leaflet_id = null
    }

    let cancelled = false

    const initMap = async () => {
      if (cancelled || !mapRef.current) return
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css' as any)
      if (cancelled || !mapRef.current) return

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, {
        center: [-6.9, 107.6],
        zoom: 8,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false,
      })

      mapInstanceRef.current = map

      // Dark tile - CartoDB
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)

      // Plot semua kontingen
      perKontingen.forEach(k => {
        const coords = KONTINGEN_COORDS[k.nama]
        if (!coords) return
        const color = getMarkerColor(k.progress, k.total)
        const status = getStatusLabel(k.progress, k.total)
        const radius = k.total > 50 ? 12 : k.total > 20 ? 9 : 7

        const marker = L.circleMarker(coords, {
          radius,
          fillColor: color,
          color: 'rgba(0,0,0,0.5)',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85,
        }).addTo(map)

        marker.bindPopup(`
          <div style="font-family:system-ui,sans-serif;min-width:190px;background:#0f172a;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px;color:white;">
            <div style="font-weight:700;font-size:13px;margin-bottom:8px;">${k.nama}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:8px;">
              <div style="background:rgba(255,255,255,0.05);border-radius:6px;padding:6px;text-align:center;">
                <div style="font-size:18px;font-weight:700;color:white;">${k.total}</div>
                <div style="font-size:9px;color:#94a3b8;">Total Atlet</div>
              </div>
              <div style="background:rgba(16,185,129,0.1);border-radius:6px;padding:6px;text-align:center;">
                <div style="font-size:18px;font-weight:700;color:#10b981;">${k.siap}</div>
                <div style="font-size:9px;color:#94a3b8;">Siap Tanding</div>
              </div>
            </div>
            <div style="display:flex;gap:8px;font-size:10px;color:#94a3b8;margin-bottom:8px;">
              <span>🔵 ${k.putra}L / ${k.putri}P</span>
              <span>⏳ ${k.menunggu} tunggu</span>
              <span style="color:${k.ditolak>0?'#ef4444':'#94a3b8'}">✗ ${k.ditolak} tolak</span>
            </div>
            <div style="background:rgba(255,255,255,0.05);border-radius:6px;padding:8px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="font-size:10px;color:#94a3b8;">Kesiapan</span>
                <span style="font-size:12px;font-weight:700;color:${color};">${k.progress}%</span>
              </div>
              <div style="background:#1e293b;border-radius:4px;height:5px;">
                <div style="height:100%;width:${k.progress}%;background:${color};border-radius:4px;"></div>
              </div>
              <div style="font-size:10px;margin-top:5px;color:${color};">${status}</div>
            </div>
          </div>
        `, { className: 'sipa-popup', maxWidth: 220 })

        marker.on('mouseover', () => {
          marker.setStyle({ fillOpacity: 1, radius: radius + 2 })
          marker.openPopup()
        })
        marker.on('mouseout', () => {
          marker.setStyle({ fillOpacity: 0.85, radius })
          marker.closePopup()
        })
      })

      map.fitBounds([[-7.85, 105.7], [-5.75, 109.1]], { padding: [15, 15] })
    }

    initMap()
    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [perKontingen])

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ height:'280px' }}>
      <style>{`
        .sipa-popup .leaflet-popup-content-wrapper{background:transparent!important;box-shadow:0 10px 40px rgba(0,0,0,0.7)!important;border-radius:12px!important;padding:0!important;}
        .sipa-popup .leaflet-popup-content{margin:0!important;}
        .sipa-popup .leaflet-popup-tip{background:#0f172a!important;}
        .leaflet-control-zoom{border:1px solid rgba(255,255,255,0.1)!important;border-radius:8px!important;overflow:hidden!important;}
        .leaflet-control-zoom a{background:#1e293b!important;color:#94a3b8!important;border-bottom:1px solid rgba(255,255,255,0.08)!important;}
        .leaflet-control-zoom a:hover{background:#334155!important;color:white!important;}
        .leaflet-container{background:#0f172a;}
      `}</style>
      <div ref={mapRef} className="w-full h-full" />
      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-[1000] flex items-center gap-2 bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-lg px-3 py-1.5">
        {[
          { color:'#10b981', label:'≥80%' },
          { color:'#f59e0b', label:'50-79%' },
          { color:'#3b82f6', label:'<50%' },
          { color:'#ef4444', label:'Belum' },
          { color:'#475569', label:'No data' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background:color }} />
            <span className="text-[9px] text-slate-400">{label}</span>
          </div>
        ))}
      </div>
      <div className="absolute top-2 left-2 z-[1000] bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-lg px-2.5 py-1.5">
        <span className="text-[10px] text-slate-400">Hover dot untuk detail kontingen</span>
      </div>
    </div>
  )
}

// ── SVG Charts ────────────────────────────────────────────────────────────────
function PieChart({ segments, size = 90, label, sublabel }: {
  segments: { value: number; color: string }[]
  size?: number; label?: string; sublabel?: string
}) {
  const total = segments.reduce((a, b) => a + b.value, 0)
  if (total === 0) return (
    <div style={{ position:'relative', width:size, height:size }}>
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="28" fill="none" stroke="#1e293b" strokeWidth="12" />
      </svg>
      {label && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <span style={{ color:'#475569', fontWeight:700, fontSize:13 }}>0</span>
          {sublabel && <span style={{ color:'#334155', fontSize:9 }}>{sublabel}</span>}
        </div>
      )}
    </div>
  )
  let cum = 0
  const paths = segments.filter(s => s.value > 0).map((seg, i) => {
    const pct = seg.value / total
    const s0 = cum * 2 * Math.PI - Math.PI / 2; cum += pct
    const e0 = cum * 2 * Math.PI - Math.PI / 2
    const r = 28; const cx = 40; const cy = 40
    const x1 = cx + r * Math.cos(s0); const y1 = cy + r * Math.sin(s0)
    const x2 = cx + r * Math.cos(e0); const y2 = cy + r * Math.sin(e0)
    return <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${pct>0.5?1:0} 1 ${x2},${y2}Z`} fill={seg.color} />
  })
  return (
    <div style={{ position:'relative', width:size, height:size }}>
      <svg width={size} height={size} viewBox="0 0 80 80">
        {paths}
        <circle cx="40" cy="40" r="17" fill="#0f172a" />
      </svg>
      {label && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <span style={{ color:'white', fontWeight:700, fontSize:size>80?13:11, lineHeight:1 }}>{label}</span>
          {sublabel && <span style={{ color:'#64748b', fontSize:9, marginTop:1 }}>{sublabel}</span>}
        </div>
      )}
    </div>
  )
}

function DonutChart({ value, total, color, size = 52 }: {
  value: number; total: number; color: string; size?: number
}) {
  const pct = total > 0 ? value / total : 0
  const r = 20; const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
      <circle cx="24" cy="24" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
      <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${pct*c} ${(1-pct)*c}`} strokeLinecap="round" />
    </svg>
  )
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data); const min = Math.min(...data); const range = max-min||1
  const w = 80; const h = 28
  const pts = data.map((v, i) => `${(i/(data.length-1))*w},${h-((v-min)/range)*(h-4)-2}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity="0.07" />
    </svg>
  )
}

function HBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width:`${max>0?(value/max)*100:0}%`, background:color, transition:'width 0.7s ease' }} />
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardKONI() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<any>(null)
  const [animIn, setAnimIn] = useState(false)

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (!loading) setTimeout(() => setAnimIn(true), 50) }, [loading])

  const loadData = async () => {
    const meRes = await fetch('/api/auth/me').then(r => r.json()).catch(() => null)
    setMe(meRes)
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    const [
      { data: atletAll },
      { data: kontingenList },
      { data: caborList },
      { data: medali },
      { data: kejuaraan },
      { data: nomorList },
    ] = await Promise.all([
      sb.from('atlet').select('id, gender, status_registrasi, status_verifikasi, kontingen_id, cabor_id, created_at, cabang_olahraga(nama), kontingen(nama)'),
      sb.from('kontingen').select('id, nama').order('nama'),
      sb.from('cabang_olahraga').select('id, nama').order('nama'),
      sb.from('klasemen_medali').select('*, kontingen(nama)').order('emas', { ascending:false }).limit(10),
      sb.from('riwayat_kejuaraan').select('id, status'),
      sb.from('nomor_pertandingan').select('id'),
    ])

    const atlet = atletAll ?? []
    const total = atlet.length
    const putra = atlet.filter((a: any) => a.gender === 'L').length
    const putri = atlet.filter((a: any) => a.gender === 'P').length
    const draft = atlet.filter((a: any) => a.status_registrasi === 'Draft').length
    const menunggu = atlet.filter((a: any) => a.status_registrasi?.includes('Menunggu')).length
    const verified = atlet.filter((a: any) => a.status_registrasi === 'Verified').length
    const posted = atlet.filter((a: any) => a.status_registrasi === 'Posted').length
    const ditolak = atlet.filter((a: any) => a.status_registrasi?.includes('Ditolak')).length
    const siap = verified + posted
    const pctSiap = total > 0 ? Math.round((siap/total)*100) : 0
    const pctPutra = total > 0 ? Math.round((putra/total)*100) : 0

    const kjPending = (kejuaraan ?? []).filter((k: any) => k.status === 'Menunggu Admin').length
    const kjVerified = (kejuaraan ?? []).filter((k: any) => k.status === 'Verified').length

    const now = new Date()
    const trend7 = Array.from({ length:7 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (6-i))
      const ds = d.toISOString().split('T')[0]
      return atlet.filter((a: any) => a.created_at?.startsWith(ds)).length
    })

    const kontingenAktif = (kontingenList ?? []).filter((k: any) =>
      atlet.some((a: any) => a.kontingen_id === k.id)
    )
    const perKontingen: KontingenStat[] = kontingenAktif.map((k: any) => {
      const atletK = atlet.filter((a: any) => a.kontingen_id === k.id)
      const siapK = atletK.filter((a: any) =>
        a.status_registrasi === 'Verified' || a.status_registrasi === 'Posted'
      ).length
      return {
        nama: k.nama, total: atletK.length,
        putra: atletK.filter((a: any) => a.gender === 'L').length,
        putri: atletK.filter((a: any) => a.gender === 'P').length,
        siap: siapK,
        menunggu: atletK.filter((a: any) => a.status_registrasi?.includes('Menunggu')).length,
        ditolak: atletK.filter((a: any) => a.status_registrasi?.includes('Ditolak')).length,
        progress: atletK.length > 0 ? Math.round((siapK/atletK.length)*100) : 0,
      }
    }).sort((a: KontingenStat, b: KontingenStat) => b.total - a.total)

    const perCabor = (caborList ?? []).map((c: any) => {
      const n = atlet.filter((a: any) => a.cabor_id === c.id).length
      return { nama: c.nama, total: n }
    }).filter((c: any) => c.total > 0).sort((a: any, b: any) => b.total - a.total).slice(0, 6)

    // Issues
    const issues: Issue[] = []
    const pctSiapVal = total > 0 ? (siap/total)*100 : 0
    if (pctSiapVal < 30 && total > 0) issues.push({ level:'critical', msg:`Kesiapan atlet hanya ${Math.round(pctSiapVal)}% — butuh kebijakan percepatan registrasi`, link:'/dashboard/verifikasi' })
    if (menunggu > 50) issues.push({ level:'critical', msg:`${menunggu} atlet menumpuk di antrian — pertimbangkan tambah operator`, link:'/dashboard/verifikasi' })
    else if (menunggu > 0) issues.push({ level:'warning', msg:`${menunggu} atlet menunggu verifikasi`, link:'/dashboard/verifikasi' })
    if (ditolak > 20) issues.push({ level:'critical', msg:`${ditolak} atlet ditolak — perlu evaluasi persyaratan`, link:'/dashboard/verifikasi' })
    else if (ditolak > 0) issues.push({ level:'warning', msg:`${ditolak} atlet ditolak — perlu review`, link:'/dashboard/verifikasi' })
    if (kjPending > 0) issues.push({ level:'warning', msg:`${kjPending} kejuaraan menunggu verifikasi final Admin`, link:'/dashboard/kejuaraan' })
    const laggardCount = perKontingen.filter(k => k.total > 0 && k.progress === 0).length
    if (laggardCount > 3) issues.push({ level:'warning', msg:`${laggardCount} kontingen belum ada atlet siap — perlu koordinasi`, link:'/dashboard/atlet' })

    const leaders = [...perKontingen].sort((a, b) => b.progress - a.progress).slice(0, 3)
    const lagList = perKontingen.filter(k => k.total > 0 && k.progress < 30).sort((a, b) => a.progress - b.progress).slice(0, 4)

    setData({
      kpi: { total, putra, putri, draft, menunggu, verified, posted, ditolak, siap, pctSiap, pctPutra },
      perCabor, perKontingen,
      medali: medali ?? [],
      kejuaraan: { total:(kejuaraan??[]).length, pending:kjPending, verified:kjVerified },
      nomorTotal: (nomorList??[]).length,
      kontingenAktif: kontingenAktif.length,
      caborTotal: perCabor.length,
      trend7, issues, leaders, lagList,
    })
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="relative">
        <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  )

  const { kpi, perCabor, perKontingen, medali, kejuaraan, nomorTotal, kontingenAktif, caborTotal, trend7, issues, leaders, lagList } = data
  const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4']
  const ani = `transition-all duration-700 ${animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4'}`

  return (
    <div className="space-y-4">

      {/* ══ 1. SIPA + ALERT ══════════════════════════════════════════════════ */}
      <div className={`grid gap-4 ${issues.length > 0 ? 'grid-cols-2' : 'grid-cols-1'} ${ani}`}>

        {/* SIPA Intelligence */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-800/30"
          style={{ background:'linear-gradient(135deg, #022c22 0%, #0f172a 50%, #0c1a2e 100%)' }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background:'linear-gradient(90deg, transparent, #10b981, transparent)' }} />
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full"
            style={{ background:'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)' }} />
          <div className="relative p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)' }}>
              <Zap size={22} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-bold text-sm">SIPA Intelligence</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                  style={{ background:'rgba(16,185,129,0.15)', color:'#10b981', border:'1px solid rgba(16,185,129,0.3)' }}>
                  ● Groq AI · Online
                </span>
              </div>
              <p className="text-slate-400 text-xs mb-3">AI Analitik PORPROV XV — jawaban strategis untuk pimpinan KONI</p>
              <div className="flex flex-wrap gap-2">
                {['Kontingen paling tertinggal?','Prediksi potensi medali?','Analisa kesiapan keseluruhan'].map(q => (
                  <a key={q} href="/dashboard/ai"
                    className="text-[11px] text-slate-400 hover:text-emerald-400 px-2.5 py-1 rounded-lg transition-all"
                    style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                    → {q}
                  </a>
                ))}
              </div>
            </div>
            <a href="/dashboard/ai"
              className="flex items-center gap-1.5 text-xs font-semibold text-white px-4 py-2 rounded-xl flex-shrink-0 hover:opacity-90 transition-all"
              style={{ background:'linear-gradient(135deg, #10b981, #059669)' }}>
              Buka SIPA <ChevronRight size={13} />
            </a>
          </div>
        </div>

        {/* Alert — hanya kalau ada isu */}
        {issues.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-red-500/20 bg-red-500/5">
            <div className="px-4 py-2.5 border-b border-red-500/15 flex items-center gap-2">
              <AlertCircle size={13} className="text-red-400" />
              <span className="text-red-400 text-xs font-semibold uppercase tracking-wider">
                Perhatian Pimpinan · {issues.length} isu aktif
              </span>
            </div>
            <div className="p-3 space-y-2">
              {issues.slice(0, 3).map((issue: Issue, i: number) => (
                <a key={i} href={issue.link}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all group ${
                    issue.level === 'critical'
                      ? 'bg-red-500/8 border-red-500/20 hover:bg-red-500/15'
                      : 'bg-amber-500/8 border-amber-500/20 hover:bg-amber-500/15'
                  }`}>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    issue.level === 'critical' ? 'bg-red-500/20' : 'bg-amber-500/20'
                  }`}>
                    {issue.level === 'critical'
                      ? <AlertTriangle size={10} className="text-red-400" />
                      : <Clock size={10} className="text-amber-400" />}
                  </div>
                  <span className={`text-xs leading-relaxed flex-1 ${
                    issue.level === 'critical' ? 'text-red-300' : 'text-amber-300'
                  }`}>{issue.msg}</span>
                  <ChevronRight size={11} className="text-slate-600 group-hover:text-white flex-shrink-0 transition-colors" />
                </a>
              ))}
              {issues.length > 3 && (
                <div className="text-center text-slate-600 text-[10px] pt-1">+{issues.length-3} isu lainnya</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ 2. HERO HEADER ══════════════════════════════════════════════════ */}
      <div className={ani} style={{ transitionDelay:'50ms' }}>
        <div className="relative overflow-hidden rounded-2xl border border-slate-800"
          style={{ background:'linear-gradient(135deg, #0c1a2e 0%, #0f172a 60%, #0c1a2e 100%)' }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background:'linear-gradient(90deg, transparent, #3b82f6, #10b981, transparent)' }} />
          <div className="relative px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-slate-500 text-[11px] uppercase tracking-widest mb-1 font-medium">PORPROV XV · Jawa Barat 2026</p>
                <h1 className="text-xl font-bold text-white mb-0.5">
                  Dashboard Eksekutif KONI
                  {me?.nama && <span className="text-slate-400 font-normal text-base"> · {me.nama.split(' ')[0]}</span>}
                </h1>
                <p className="text-slate-500 text-xs">
                  {new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-3xl font-bold text-white">{kpi.total.toLocaleString()}</div>
                <div className="text-slate-500 text-xs mb-1">Total Atlet</div>
                <Sparkline data={trend7} color="#3b82f6" />
                <div className="text-slate-600 text-[9px] mt-0.5">Trend 7 hari terakhir</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/60 grid grid-cols-6 gap-3">
              {[
                { label:'Siap Tanding', value:`${kpi.siap} (${kpi.pctSiap}%)`, color:'text-emerald-400', Icon:CheckCircle },
                { label:'Kontingen Aktif', value:kontingenAktif, color:'text-blue-400', Icon:Shield },
                { label:'Cabor Aktif', value:caborTotal, color:'text-purple-400', Icon:Target },
                { label:'Nomor Pertandingan', value:nomorTotal, color:'text-amber-400', Icon:BarChart3 },
                { label:'Menunggu Verif', value:kpi.menunggu, color:kpi.menunggu>0?'text-orange-400':'text-slate-500', Icon:Clock },
                { label:'Ditolak', value:kpi.ditolak, color:kpi.ditolak>0?'text-red-400':'text-slate-500', Icon:AlertTriangle },
              ].map(({ label, value, color, Icon }) => (
                <div key={label} className="text-center">
                  <Icon size={13} className={`mx-auto mb-1 ${color}`} />
                  <div className={`font-bold text-base leading-tight ${color}`}>{value}</div>
                  <div className="text-slate-600 text-[9px] mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 3. KPI CARDS ════════════════════════════════════════════════════ */}
      <div className={`grid grid-cols-4 gap-3 ${ani}`} style={{ transitionDelay:'100ms' }}>
        {[
          { label:'Putra', value:kpi.putra, sub:`${kpi.pctPutra}% dari total`, color:'#3b82f6', bg:'bg-blue-500/10', border:'border-blue-500/20' },
          { label:'Putri', value:kpi.putri, sub:`${100-kpi.pctPutra}% dari total`, color:'#ec4899', bg:'bg-pink-500/10', border:'border-pink-500/20' },
          { label:'Menunggu Review', value:kpi.menunggu, sub:'Perlu tindakan segera', color:'#f59e0b', bg:'bg-amber-500/10', border:'border-amber-500/20' },
          { label:'Ditolak', value:kpi.ditolak, sub:'Perlu evaluasi kebijakan', color:'#ef4444', bg:'bg-red-500/10', border:'border-red-500/20' },
        ].map(({ label, value, sub, color, bg, border }) => (
          <div key={label} className={`${bg} border ${border} rounded-2xl p-4`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-slate-400 text-xs mb-2">{label}</div>
                <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>
                <div className="text-slate-500 text-[10px] mt-1">{sub}</div>
              </div>
              <DonutChart value={value} total={kpi.total} color={color} />
            </div>
          </div>
        ))}
      </div>

      {/* ══ 4. PIE CHARTS ═══════════════════════════════════════════════════ */}
      <div className={`grid grid-cols-3 gap-4 ${ani}`} style={{ transitionDelay:'150ms' }}>
        {/* Status Registrasi */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-white text-sm font-medium mb-4 flex items-center gap-2">
            <Activity size={13} className="text-blue-400" /> Status Registrasi
          </div>
          <div className="flex items-center gap-4">
            <PieChart size={90} label={`${kpi.pctSiap}%`} sublabel="Siap"
              segments={[
                { value:kpi.siap, color:'#10b981' },
                { value:kpi.menunggu, color:'#f59e0b' },
                { value:kpi.draft, color:'#334155' },
                { value:kpi.ditolak, color:'#ef4444' },
              ]} />
            <div className="space-y-2 flex-1">
              {[
                { label:'Siap Tanding', value:kpi.siap, color:'#10b981' },
                { label:'Menunggu', value:kpi.menunggu, color:'#f59e0b' },
                { label:'Draft', value:kpi.draft, color:'#334155' },
                { label:'Ditolak', value:kpi.ditolak, color:'#ef4444' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:color }} />
                    <span className="text-slate-400 text-[11px]">{label}</span>
                  </div>
                  <span className="text-white text-[11px] font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gender + Kejuaraan */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-white text-sm font-medium mb-4 flex items-center gap-2">
            <Users size={13} className="text-purple-400" /> Komposisi & Kejuaraan
          </div>
          <div className="flex items-center gap-4 mb-4">
            <PieChart size={90} label={`${kpi.pctPutra}%`} sublabel="Putra"
              segments={[
                { value:kpi.putra, color:'#3b82f6' },
                { value:kpi.putri, color:'#ec4899' },
              ]} />
            <div className="space-y-3 flex-1">
              {[
                { label:'Putra', value:kpi.putra, color:'text-blue-400', dot:'bg-blue-500' },
                { label:'Putri', value:kpi.putri, color:'text-pink-400', dot:'bg-pink-500' },
              ].map(({ label, value, color, dot }) => (
                <div key={label}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className={`w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-slate-400 text-xs">{label}</span>
                  </div>
                  <div className={`text-xl font-bold ${color}`}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
            {[
              { label:'Total Kej.', value:kejuaraan.total, color:'text-white' },
              { label:'Pending', value:kejuaraan.pending, color:'text-amber-400' },
              { label:'Verified', value:kejuaraan.verified, color:'text-emerald-400' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className={`text-base font-bold ${color}`}>{value}</div>
                <div className="text-slate-600 text-[9px]">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Klasemen Medali */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-white text-sm font-medium mb-4 flex items-center gap-2">
            <Trophy size={13} className="text-yellow-400" /> Klasemen Medali
          </div>
          {medali.filter((m: any) => m.total > 0).length === 0 ? (
            <div className="text-center py-8">
              <Trophy size={24} className="text-slate-700 mx-auto mb-2" />
              <div className="text-slate-600 text-xs">Belum ada data medali</div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {medali.filter((m: any) => m.total > 0).slice(0, 7).map((m: any, i: number) => (
                <div key={m.id} className="flex items-center gap-2.5">
                  <span className="text-xs w-5 text-center flex-shrink-0">
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':<span className="text-slate-600">{i+1}</span>}
                  </span>
                  <span className="text-slate-300 text-xs truncate flex-1">{m.kontingen?.nama}</span>
                  <div className="flex gap-1 flex-shrink-0">
                    <span className="text-yellow-400 text-[10px] font-bold">{m.emas}</span>
                    <span className="text-slate-400 text-[10px]">{m.perak}</span>
                    <span className="text-amber-600 text-[10px]">{m.perunggu}</span>
                  </div>
                  <span className="text-white text-xs font-bold w-5 text-right">{m.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ 5. PETA LEAFLET + TOP CABOR ═════════════════════════════════════ */}
      <div className={`grid grid-cols-5 gap-4 ${ani}`} style={{ transitionDelay:'200ms' }}>
        {/* Peta Leaflet */}
        <div className="col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-white text-sm font-medium mb-3 flex items-center gap-2">
            <MapPin size={13} className="text-blue-400" /> Peta Kesiapan Kontingen Jawa Barat
          </div>
          <PetaLeaflet perKontingen={perKontingen} />
        </div>

        {/* Top Cabor */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-white text-sm font-medium mb-4 flex items-center gap-2">
            <Target size={13} className="text-amber-400" /> Distribusi per Cabor
          </div>
          <div className="flex items-center gap-4">
            <PieChart size={100}
              segments={perCabor.map((c: any, i: number) => ({ value:c.total, color:PIE_COLORS[i%6] }))} />
            <div className="flex-1 space-y-2">
              {perCabor.map((c: any, i: number) => (
                <div key={c.nama} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:PIE_COLORS[i%6] }} />
                  <span className="text-slate-400 text-[11px] truncate flex-1">{c.nama}</span>
                  <span className="text-white text-[11px] font-bold">{c.total}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 6. SOROTAN + TABEL KONTINGEN ════════════════════════════════════ */}
      <div className={`grid grid-cols-3 gap-4 ${ani}`} style={{ transitionDelay:'250ms' }}>
        {/* Leaders & Laggards */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="text-slate-400 text-xs uppercase tracking-wider font-medium">Sorotan Kontingen</div>
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <TrendingUp size={12} className="text-emerald-400" />
              <span className="text-emerald-400 text-xs font-medium">Progress Terbaik</span>
            </div>
            <div className="space-y-2.5">
              {leaders.slice(0, 3).map((k: KontingenStat, i: number) => (
                <div key={k.nama} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                    style={{ background:['rgba(16,185,129,0.15)','rgba(16,185,129,0.1)','rgba(16,185,129,0.07)'][i], color:'#10b981' }}>
                    {k.progress}%
                  </div>
                  <div className="min-w-0">
                    <div className="text-white text-xs font-medium truncate">{k.nama}</div>
                    <div className="text-slate-500 text-[10px]">{k.total} atlet · {k.siap} siap</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="h-px bg-slate-800" />
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <AlertTriangle size={12} className="text-amber-400" />
              <span className="text-amber-400 text-xs font-medium">Perlu Perhatian</span>
            </div>
            {lagList.length === 0 ? (
              <div className="text-slate-600 text-xs py-2 text-center">Semua kontingen on track ✓</div>
            ) : (
              <div className="space-y-2.5">
                {lagList.slice(0, 4).map((k: KontingenStat) => (
                  <div key={k.nama} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                      style={{ background:'rgba(239,68,68,0.12)', color:'#f87171' }}>
                      {k.progress}%
                    </div>
                    <div className="min-w-0">
                      <div className="text-white text-xs font-medium truncate">{k.nama}</div>
                      <div className="text-slate-500 text-[10px]">{k.total} atlet · {k.siap} siap</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Full Tabel Kontingen */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="text-white text-sm font-medium flex items-center gap-2">
              <Shield size={13} className="text-blue-400" /> Rekapitulasi Kontingen
            </div>
            <span className="text-slate-600 text-xs">{perKontingen.length} kontingen</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight:'280px' }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm">
                <tr className="border-b border-slate-800">
                  {['#','Kontingen','Total','L/P','Siap','Tunggu','Tolak','Progress'].map(h => (
                    <th key={h} className="text-left text-slate-500 font-medium px-3 py-2 whitespace-nowrap text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perKontingen.map((k: KontingenStat, i: number) => (
                  <tr key={k.nama} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-2 text-slate-600">{i+1}</td>
                    <td className="px-3 py-2 text-slate-200 font-medium truncate max-w-[140px]">{k.nama}</td>
                    <td className="px-3 py-2 text-white font-bold">{k.total}</td>
                    <td className="px-3 py-2">
                      <span className="text-blue-400">{k.putra}</span>
                      <span className="text-slate-700">/</span>
                      <span className="text-pink-400">{k.putri}</span>
                    </td>
                    <td className="px-3 py-2 text-emerald-400 font-medium">{k.siap}</td>
                    <td className="px-3 py-2"><span className={k.menunggu>0?'text-amber-400':'text-slate-700'}>{k.menunggu}</span></td>
                    <td className="px-3 py-2"><span className={k.ditolak>0?'text-red-400':'text-slate-700'}>{k.ditolak}</span></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <HBar value={k.siap} max={k.total}
                          color={k.progress>=80?'#10b981':k.progress>=50?'#f59e0b':'#3b82f6'} />
                        <span className={`text-[10px] font-bold w-7 text-right flex-shrink-0 ${
                          k.progress>=80?'text-emerald-400':k.progress>=50?'text-amber-400':'text-slate-400'
                        }`}>{k.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  )
}