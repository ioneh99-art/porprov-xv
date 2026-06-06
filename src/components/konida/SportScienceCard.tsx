'use client'
// src/components/konida/SportScienceCard.tsx
// Reusable widget — embed di Dashboard, Kualifikasi, Kejuaraan, dll
// Menampilkan ringkasan tes biomotorik: KPI, top performers, alert cabor lemah

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity, Flame, AlertTriangle, ChevronRight, Award, Target,
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const KATEGORI_COLOR: Record<string, string> = {
  'Baik Sekali':   '#10b981',
  'Baik':          '#3b82f6',
  'Cukup':         '#fbbf24',
  'Kurang':        '#f97316',
  'Kurang Sekali': '#ef4444',
}

interface Props {
  kontingenId: number
  tenantSlug:  string                  // e.g. 'kabbogor' untuk link
  primary?:    string                  // accent color
  variant?:    'full' | 'compact'      // full (panel besar) vs compact (1 row)
}

export default function SportScienceCard({
  kontingenId, tenantSlug, primary = '#10b981', variant = 'full',
}: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Parallel fetch: header tes + items + atlet info
        const [tesRes, itemsRes, atletRes] = await Promise.all([
          sb.from('atlet_tes_fisik')
            .select('id,atlet_id,kesimpulan_persen,kesimpulan_kategori,status_tes,bmi,cabor_nama')
            .eq('kontingen_id', kontingenId)
            .eq('tahap', 3),
          sb.from('atlet_tes_fisik_item')
            .select('tes_fisik_id,komponen,capaian_persen'),
          sb.from('atlet')
            .select('id,nama_lengkap,cabor_nama_raw')
            .eq('kontingen_id', kontingenId),
        ])

        const tes    = tesRes.data || []
        const items  = itemsRes.data || []
        const atlets = atletRes.data || []

        // Build atlet map
        const atletMap: Record<number, any> = {}
        atlets.forEach((a: any) => { atletMap[a.id] = a })

        // Compute stats
        const hadir = tes.filter((t: any) => t.status_tes === 'Hadir')
        const valid = hadir.filter((t: any) => t.kesimpulan_persen != null)
        const avgSkor = valid.length
          ? Math.round(valid.reduce((s: number, t: any) => s + t.kesimpulan_persen, 0) / valid.length)
          : 0

        // Top 3 performers
        const topPerformers = [...valid]
          .sort((a: any, b: any) => b.kesimpulan_persen - a.kesimpulan_persen)
          .slice(0, 3)
          .map((t: any) => ({
            ...t,
            nama: atletMap[t.atlet_id]?.nama_lengkap || 'Unknown',
            cabor: atletMap[t.atlet_id]?.cabor_nama_raw || t.cabor_nama,
          }))

        // Komponen aggregate (rata-rata per komponen)
        const komponenMap: Record<string, { total: number; count: number }> = {}
        items.forEach((it: any) => {
          if (!komponenMap[it.komponen]) komponenMap[it.komponen] = { total: 0, count: 0 }
          komponenMap[it.komponen].total += it.capaian_persen || 0
          komponenMap[it.komponen].count++
        })
        const komponenAgg = Object.entries(komponenMap)
          .map(([k, v]) => ({ komponen: k, rata: Math.round(v.total / v.count) }))
          .sort((a, b) => a.rata - b.rata)

        // Cabor terlemah (need cabor stats)
        const caborMap: Record<string, { sum: number; count: number }> = {}
        valid.forEach((t: any) => {
          const c = t.cabor_nama || atletMap[t.atlet_id]?.cabor_nama_raw || 'Unknown'
          if (!caborMap[c]) caborMap[c] = { sum: 0, count: 0 }
          caborMap[c].sum += t.kesimpulan_persen
          caborMap[c].count++
        })
        const caborStats = Object.entries(caborMap)
          .map(([nama, v]) => ({ nama, rata: Math.round(v.sum / v.count), count: v.count }))
          .filter(c => c.count >= 2)
          .sort((a, b) => a.rata - b.rata)
        const weakestCabor = caborStats.slice(0, 3)

        setData({
          total: tes.length,
          hadir: hadir.length,
          dns: tes.length - hadir.length,
          avgSkor,
          topPerformers,
          komponenAgg,
          weakestCabor,
          topAtletCount: valid.filter((t: any) => t.kesimpulan_persen >= 80).length,
        })
      } catch (e) {
        console.error('[SportScienceCard]', e)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [kontingenId])

  if (loading) return (
    <div className="rounded-2xl p-5 flex items-center justify-center"
      style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', minHeight: variant === 'full' ? 240 : 100 }}>
      <div className="w-6 h-6 border-2 rounded-full animate-spin"
        style={{ borderColor: `${primary}30`, borderTopColor: primary }}/>
    </div>
  )

  if (!data || data.total === 0) return (
    <div className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Activity size={14} style={{ color: primary }}/>
        <h3 className="text-sm font-bold text-white">Sport Science Overview</h3>
      </div>
      <div className="text-xs text-zinc-500 italic">Belum ada data tes biomotorik.</div>
    </div>
  )

  // Radar data (top 8 komponen, sorted asc by capaian)
  const radarData = data.komponenAgg.slice(0, 8).map((k: any) => ({
    komponen: k.komponen, rata: k.rata, fullMark: 100,
  }))

  const linkHref = `/konida/Premiumreport/${tenantSlug}/tes-fisik`

  // ────────── COMPACT VARIANT ──────────
  if (variant === 'compact') {
    return (
      <Link href={linkHref}
        className="block rounded-2xl p-4 transition-all hover:scale-[1.01]"
        style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.15)' }}>
            <Activity size={18} style={{ color: primary }}/>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Sport Science Overview</h3>
              <span className="text-[9px] uppercase tracking-widest font-mono"
                style={{ color: 'rgba(255,255,255,0.3)' }}>FPOK UPI · Tahap 3</span>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-[11px]">
              <span className="text-zinc-400">
                <strong className="text-emerald-400">{data.hadir}</strong>/{data.total} sudah tes
              </span>
              <span className="text-zinc-400">
                Rata-rata: <strong className="text-white">{data.avgSkor}%</strong>
              </span>
              <span className="text-zinc-400">
                Elit: <strong className="text-amber-400">{data.topAtletCount}</strong>
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="text-zinc-500"/>
        </div>
      </Link>
    )
  }

  // ────────── FULL VARIANT ──────────
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.18)' }}>

      {/* Decorative glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: primary }}/>

      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.15)' }}>
            <Activity size={16} style={{ color: primary }}/>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Sport Science Overview</h3>
            <p className="text-[10px] uppercase tracking-widest font-mono"
              style={{ color: 'rgba(255,255,255,0.3)' }}>
              FPOK UPI · Tahap 3 · {data.hadir} atlet tercatat
            </p>
          </div>
        </div>
        <Link href={linkHref}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:scale-105"
          style={{ background: 'rgba(16,185,129,0.15)', color: primary, border: `1px solid ${primary}40` }}>
          Detail Lengkap <ChevronRight size={12}/>
        </Link>
      </div>

      {/* Body grid: left = KPI + radar, right = top performers + alert */}
      <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* KPI + Radar (left) */}
        <div className="lg:col-span-2 space-y-3">
          {/* KPI Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-2.5 text-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">Hadir</div>
              <div className="text-xl font-black text-emerald-400">{data.hadir}</div>
              <div className="text-[9px] text-zinc-500">
                {data.total > 0 ? Math.round(data.hadir / data.total * 100) : 0}%
              </div>
            </div>
            <div className="rounded-xl p-2.5 text-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">Rata Skor</div>
              <div className="text-xl font-black"
                style={{ color: data.avgSkor >= 70 ? '#10b981' : data.avgSkor >= 50 ? '#fbbf24' : '#f97316' }}>
                {data.avgSkor}%
              </div>
              <div className="text-[9px] text-zinc-500">
                {data.avgSkor >= 70 ? 'Baik Sekali' : data.avgSkor >= 60 ? 'Baik' : data.avgSkor >= 50 ? 'Cukup' : 'Kurang'}
              </div>
            </div>
            <div className="rounded-xl p-2.5 text-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">Top ≥80%</div>
              <div className="text-xl font-black text-amber-400">{data.topAtletCount}</div>
              <div className="text-[9px] text-zinc-500">atlet elit</div>
            </div>
          </div>

          {/* Mini Radar */}
          {radarData.length > 2 && (
            <div className="rounded-xl p-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: primary }}>
                Profil Komponen Fisik
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)"/>
                  <PolarAngleAxis dataKey="komponen" tick={{ fill: '#94a3b8', fontSize: 8 }}/>
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false}/>
                  <Radar dataKey="rata" stroke={primary} fill={primary} fillOpacity={0.35} strokeWidth={1.5}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top performers + alert (right) */}
        <div className="lg:col-span-3 space-y-3">

          {/* Top 3 Performers */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Flame size={12} className="text-amber-400"/>
              <h4 className="text-[10px] uppercase tracking-widest font-bold text-amber-400">
                Top 3 Performers
              </h4>
            </div>
            {data.topPerformers.length === 0 ? (
              <div className="text-xs text-zinc-500 italic">Belum ada data</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {data.topPerformers.map((p: any, i: number) => {
                  const medals = ['🥇', '🥈', '🥉']
                  const colors = ['#fbbf24', '#cbd5e1', '#cd7f32']
                  return (
                    <div key={p.id} className="rounded-xl p-2.5"
                      style={{
                        background: `linear-gradient(135deg, ${colors[i]}12, transparent)`,
                        border: `1px solid ${colors[i]}30`,
                      }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base">{medals[i]}</span>
                        <span className="text-base font-black" style={{ color: colors[i] }}>
                          {p.kesimpulan_persen}%
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-white truncate">{p.nama}</div>
                      <div className="text-[9px] text-zinc-500 truncate">{p.cabor}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Critical alert: cabor lemah */}
          {data.weakestCabor.length > 0 && data.weakestCabor[0].rata < 55 && (
            <div className="rounded-xl p-3"
              style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={12} className="text-orange-400"/>
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-orange-400">
                  Perlu Perhatian
                </h4>
              </div>
              <div className="space-y-1">
                {data.weakestCabor.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-600 font-mono">#{i + 1}</span>
                      <span className="text-zinc-200">{c.nama}</span>
                      <span className="text-[9px] text-zinc-500">({c.count} atlet)</span>
                    </div>
                    <span className="font-bold font-mono"
                      style={{ color: c.rata < 45 ? '#ef4444' : '#f97316' }}>
                      {c.rata}%
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-zinc-500 italic">
                → Rekomendasi: program latihan stamina dasar 8 minggu
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
