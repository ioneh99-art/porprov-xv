'use client'
import { useEffect, useState } from 'react'
import {
  Users, CheckCircle, Clock, AlertTriangle, ChevronRight,
  MapPin, Monitor, Trophy, TrendingUp, Zap, Building2,
  Activity, Target, Shield
} from 'lucide-react'
import { useTenant } from '@/hooks/useTenant'

// ── Pie Chart SVG ─────────────────────────────────────────────────────────────
function PieChart({ segments, size = 80, label, sublabel }: {
  segments: { value: number; color: string }[]
  size?: number; label?: string; sublabel?: string
}) {
  const total = segments.reduce((a, b) => a + b.value, 0)
  if (total === 0) return (
    <div style={{ position:'relative', width:size, height:size }}>
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="28" fill="none" stroke="#1e293b" strokeWidth="12" />
      </svg>
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
        {paths}<circle cx="40" cy="40" r="17" fill="#0f172a" />
      </svg>
      {label && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <span style={{ color:'white', fontWeight:700, fontSize:12, lineHeight:1 }}>{label}</span>
          {sublabel && <span style={{ color:'#64748b', fontSize:9, marginTop:1 }}>{sublabel}</span>}
        </div>
      )}
    </div>
  )
}

export default function KonidaDashboard() {
  const tenant = useTenant()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [animIn, setAnimIn] = useState(false)

  const isPenyelenggara = ['bekasi', 'bogor', 'depok'].includes(tenant.id)

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (!loading) setTimeout(() => setAnimIn(true), 50) }, [loading])

  const loadData = async () => {
    const meRes = await fetch('/api/auth/me').then(r => r.json()).catch(() => null)
    setUser(meRes)

    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const kontingen_id = meRes?.kontingen_id
    if (!kontingen_id) { setLoading(false); return }

    const [
      { data: atletAll },
      { data: venueList },
      { data: medali },
    ] = await Promise.all([
      sb.from('atlet').select('id, gender, status_registrasi, cabor_id, cabang_olahraga(nama)')
        .eq('kontingen_id', kontingen_id),
      sb.from('venue').select('id, nama, alamat, klaster_id'),
      sb.from('klasemen_medali').select('*, kontingen(nama)')
        .order('emas', { ascending: false }).limit(5),
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
    const pctSiap = total > 0 ? Math.round((siap / total) * 100) : 0

    // Per cabor kontingen ini
    const caborMap: Record<string, number> = {}
    atlet.forEach((a: any) => {
      const nama = (a.cabang_olahraga as any)?.nama ?? 'Lainnya'
      caborMap[nama] = (caborMap[nama] || 0) + 1
    })
    const perCabor = Object.entries(caborMap)
      .map(([nama, total]) => ({ nama, total }))
      .sort((a, b) => b.total - a.total).slice(0, 6)

    // Venue klaster penyelenggara
    const myVenue = isPenyelenggara
      ? (venueList ?? []).filter((v: any) => {
          const klasterMap: Record<string, number> = { bekasi:1, bogor:2, depok:3 }
          return v.klaster_id === klasterMap[tenant.id]
        })
      : []

    setData({
      kpi: { total, putra, putri, draft, menunggu, verified, posted, ditolak, siap, pctSiap },
      perCabor,
      venue: myVenue,
      medali: medali ?? [],
    })
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )

  if (!data) return (
    <div className="text-center py-16 text-slate-600">Gagal memuat data</div>
  )

  const { kpi, perCabor, venue, medali } = data
  const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4']
  const ani = `transition-all duration-700 ${animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`

  return (
    <div className="space-y-5">

      {/* ── Hero Header ── */}
      <div className={ani}>
        <div className="relative overflow-hidden rounded-2xl border border-slate-800"
          style={{ background: tenant.gradient }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${tenant.primary}, transparent)` }} />
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full"
            style={{ background: `radial-gradient(circle, ${tenant.primary}15, transparent)` }} />

          <div className="relative px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: tenant.primary }} />
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: tenant.primary }}>
                    Live · Sistem Aktif
                  </span>
                </div>
                <h1 className="text-xl font-bold text-white mb-0.5">
                  Dashboard {tenant.nama}
                </h1>
                <p className="text-slate-400 text-sm">
                  PORPROV XV Jawa Barat 2026
                  {isPenyelenggara && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background:`${tenant.primary}20`, color:tenant.primary, border:`1px solid ${tenant.primary}40` }}>
                      🏟️ {tenant.badge}
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-3xl font-bold text-white">{kpi.total}</div>
                <div className="text-slate-400 text-xs">Total Atlet Kontingen</div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="mt-4 pt-4 border-t border-slate-800/60 grid grid-cols-5 gap-3">
              {[
                { label:'Putra', value:kpi.putra, Icon:Users, color:'text-blue-400' },
                { label:'Putri', value:kpi.putri, Icon:Users, color:'text-pink-400' },
                { label:'Siap Tanding', value:`${kpi.siap} (${kpi.pctSiap}%)`, Icon:CheckCircle, color:'text-emerald-400' },
                { label:'Menunggu', value:kpi.menunggu, Icon:Clock, color:kpi.menunggu>0?'text-amber-400':'text-slate-500' },
                { label:'Ditolak', value:kpi.ditolak, Icon:AlertTriangle, color:kpi.ditolak>0?'text-red-400':'text-slate-500' },
              ].map(({ label, value, Icon, color }) => (
                <div key={label} className="text-center">
                  <Icon size={13} className={`mx-auto mb-1 ${color}`} />
                  <div className={`font-bold text-sm ${color}`}>{value}</div>
                  <div className="text-slate-600 text-[9px]">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Alert ditolak ── */}
      {kpi.ditolak > 0 && (
        <div className={ani} style={{ transitionDelay:'50ms' }}>
          <a href="/konida/atlet"
            className="flex items-center justify-between bg-red-500/8 border border-red-500/20 rounded-2xl px-4 py-3 hover:bg-red-500/12 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={14} className="text-red-400" />
              </div>
              <div>
                <div className="text-red-400 text-sm font-semibold">{kpi.ditolak} atlet ditolak — perlu direvisi</div>
                <div className="text-slate-500 text-xs">Klik untuk lihat detail dan perbaiki</div>
              </div>
            </div>
            <ChevronRight size={14} className="text-slate-600 group-hover:text-red-400 transition-colors" />
          </a>
        </div>
      )}

      {/* ── Pie Charts ── */}
      <div className={`grid grid-cols-3 gap-4 ${ani}`} style={{ transitionDelay:'100ms' }}>

        {/* Status registrasi */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-white text-sm font-medium mb-4 flex items-center gap-2">
            <Activity size={13} style={{ color: tenant.primary }} /> Status Registrasi
          </div>
          <div className="flex items-center gap-4">
            <PieChart size={85} label={`${kpi.pctSiap}%`} sublabel="Siap"
              segments={[
                { value:kpi.siap, color:'#10b981' },
                { value:kpi.menunggu, color:'#f59e0b' },
                { value:kpi.draft, color:'#334155' },
                { value:kpi.ditolak, color:'#ef4444' },
              ]} />
            <div className="space-y-2 flex-1">
              {[
                { label:'Siap', value:kpi.siap, color:'#10b981' },
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

        {/* Top Cabor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-white text-sm font-medium mb-4 flex items-center gap-2">
            <Target size={13} className="text-amber-400" /> Cabor Terdaftar
          </div>
          <div className="flex items-center gap-4">
            <PieChart size={85}
              segments={perCabor.map((c: any, i: number) => ({ value:c.total, color:PIE_COLORS[i%6] }))} />
            <div className="flex-1 space-y-1.5">
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

        {/* Klasemen / Medali */}
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
              {medali.filter((m: any) => m.total > 0).map((m: any, i: number) => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="text-xs w-5 text-center flex-shrink-0">
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':<span className="text-slate-600">{i+1}</span>}
                  </span>
                  <span className={`text-xs truncate flex-1 ${
                    m.kontingen?.nama === user?.kontingen_nama
                      ? 'text-white font-bold' : 'text-slate-400'
                  }`}>{m.kontingen?.nama}</span>
                  <div className="flex gap-1 flex-shrink-0 text-[10px]">
                    <span className="text-yellow-400 font-bold">{m.emas}</span>
                    <span className="text-slate-400">{m.perak}</span>
                    <span className="text-amber-600">{m.perunggu}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SIPA Intelligence ── */}
      <div className={ani} style={{ transitionDelay:'150ms' }}>
        <div className="relative overflow-hidden rounded-2xl border"
          style={{ background:'linear-gradient(135deg, #022c22 0%, #0f172a 50%)', borderColor:'rgba(16,185,129,0.25)' }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background:'linear-gradient(90deg, transparent, #10b981, transparent)' }} />
          <div className="relative p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)' }}>
              <Zap size={18} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-bold text-sm">SIPA Intelligence</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background:'rgba(16,185,129,0.15)', color:'#10b981', border:'1px solid rgba(16,185,129,0.3)' }}>
                  ● Groq AI
                </span>
              </div>
              <p className="text-slate-400 text-xs">Tanya data kontingen {tenant.nama} dalam bahasa natural</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {['Atlet saya belum verified?','Cabor terbanyak?'].map(q => (
                <a key={q} href="/konida/sipa"
                  className="text-[11px] text-slate-400 hover:text-emerald-400 px-2.5 py-1 rounded-lg transition-all"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                  → {q}
                </a>
              ))}
              <a href="/konida/sipa"
                className="flex items-center gap-1.5 text-xs font-semibold text-white px-4 py-2 rounded-xl hover:opacity-90 transition-all"
                style={{ background:'linear-gradient(135deg, #10b981, #059669)' }}>
                Buka <ChevronRight size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── VENUE SECTION — hanya untuk penyelenggara ── */}
      {isPenyelenggara && venue.length > 0 && (
        <div className={ani} style={{ transitionDelay:'200ms' }}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={14} style={{ color: tenant.primary }} />
                <div className="text-white text-sm font-medium">
                  Venue Klaster {tenant.nama}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background:`${tenant.primary}15`, color:tenant.primary, border:`1px solid ${tenant.primary}30` }}>
                  {venue.length} venue
                </span>
              </div>
              <a href="/konida/penyelenggara/venue"
                className="text-xs flex items-center gap-1 transition-colors hover:opacity-80"
                style={{ color: tenant.primary }}>
                Lihat semua <ChevronRight size={12} />
              </a>
            </div>
            <div className="divide-y divide-slate-800/50">
              {venue.slice(0, 6).map((v: any) => (
                <div key={v.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background:`${tenant.primary}15` }}>
                    <MapPin size={12} style={{ color: tenant.primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-200 text-xs font-medium truncate">{v.nama}</div>
                    <div className="text-slate-500 text-[10px]">{v.alamat}</div>
                  </div>
                  <a href="/konida/penyelenggara/venue"
                    className="text-[10px] px-2.5 py-1 rounded-lg transition-all"
                    style={{ background:`${tenant.primary}15`, color:tenant.primary }}>
                    Detail
                  </a>
                </div>
              ))}
            </div>
            {venue.length > 6 && (
              <div className="px-5 py-3 border-t border-slate-800 text-center">
                <a href="/konida/penyelenggara/venue"
                  className="text-xs transition-colors" style={{ color: tenant.primary }}>
                  +{venue.length - 6} venue lainnya
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick actions penyelenggara */}
      {isPenyelenggara && (
        <div className={`grid grid-cols-3 gap-3 ${ani}`} style={{ transitionDelay:'250ms' }}>
          {[
            { label:'Command Center', desc:'Monitor semua venue', href:'/konida/penyelenggara', icon:Monitor },
            { label:'Kesiapan Teknis', desc:'Checklist venue', href:'/konida/penyelenggara/kesiapan', icon:CheckCircle },
            { label:'Laporan Harian', desc:'Generate laporan', href:'/konida/penyelenggara/laporan', icon:TrendingUp },
          ].map(({ label, desc, href, icon: Icon }) => (
            <a key={href} href={href}
              className="flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background:`${tenant.primary}15` }}>
                <Icon size={16} style={{ color: tenant.primary }} />
              </div>
              <div className="min-w-0">
                <div className="text-white text-xs font-medium">{label}</div>
                <div className="text-slate-500 text-[10px]">{desc}</div>
              </div>
              <ChevronRight size={12} className="text-slate-700 group-hover:text-slate-400 ml-auto transition-colors" />
            </a>
          ))}
        </div>
      )}

    </div>
  )
}