'use client'
// src/components/konida/DashboardHelpers.tsx
// Sprint 3B — Transform dashboard from "data display" to "actionable intelligence"
// 4 reusable components:
//  - HealthIndexGauge: composite kontingen health score
//  - CriticalAlertsCard: auto-prioritize 3 most urgent action items
//  - CriticalPathTimeline: countdown H-X with daily tasks
//  - MissionControlActions: action-driven quick links

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, CheckCircle, Clock, ChevronRight, Zap,
  Calendar, Target, TrendingUp, TrendingDown, Flame, Activity,
  Users, Trophy, Wallet, FileCheck, Bell,
} from 'lucide-react'

// ───────────────────────────────────────────────────
// useCountUp animation
// ───────────────────────────────────────────────────
function useCount(target: number, duration = 1500) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let start: number | null = null
    let raf = 0
    const tick = (now: number) => {
      if (start === null) start = now
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) raf = requestAnimationFrame(tick)
      else setValue(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

// ═══════════════════════════════════════════════════════════════════
// 1. HEALTH INDEX COMPOSITE GAUGE
// ═══════════════════════════════════════════════════════════════════
interface HealthDimension {
  label: string
  score: number    // 0-100
  weight: number   // 0-1 (sum should be 1)
  icon?: any
}

export function HealthIndexGauge({
  dimensions,
  primary = '#10b981',
  size = 240,
}: {
  dimensions: HealthDimension[]
  primary?: string
  size?: number
}) {
  // Composite: weighted avg
  const composite = Math.round(
    dimensions.reduce((s, d) => s + d.score * d.weight, 0)
  )
  const animated = useCount(composite, 2000)

  // Color by zone
  const color = composite >= 85 ? '#10b981'
              : composite >= 70 ? '#3b82f6'
              : composite >= 55 ? '#fbbf24'
              : composite >= 40 ? '#f97316'
              : '#ef4444'
  const grade = composite >= 85 ? 'EXCELLENT'
              : composite >= 70 ? 'GOOD'
              : composite >= 55 ? 'FAIR'
              : composite >= 40 ? 'NEEDS WORK'
              : 'CRITICAL'

  // SVG circle
  const radius = size / 2 - 16
  const cx = size / 2
  const cy = size / 2
  const fullCircum = 2 * Math.PI * radius
  const semiCircum = Math.PI * radius
  const progress = Math.min(animated / 100, 1)
  const offset = semiCircum * (1 - progress)

  return (
    <div className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: color }}/>

      <div className="relative flex items-center gap-5">
        {/* Gauge */}
        <div className="relative flex-shrink-0" style={{ width: size, height: size / 2 + 40 }}>
          <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
            {/* Background arc */}
            <path
              d={`M 12 ${cy} A ${radius} ${radius} 0 0 1 ${size - 12} ${cy}`}
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={18}
              strokeLinecap="round"/>
            {/* Progress arc */}
            <path
              d={`M 12 ${cy} A ${radius} ${radius} 0 0 1 ${size - 12} ${cy}`}
              fill="none" stroke={color} strokeWidth={18}
              strokeLinecap="round"
              strokeDasharray={semiCircum}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.3s ease, stroke 0.5s ease',
                       filter: `drop-shadow(0 0 12px ${color}80)` }}/>
          </svg>
          {/* Center value */}
          <div className="absolute top-1/2 left-0 right-0 text-center" style={{ transform: 'translateY(-50%)' }}>
            <div className="text-5xl font-black leading-none" style={{ color }}>
              {Math.round(animated)}
              <span className="text-base text-zinc-500 font-normal">/100</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest font-bold mt-2" style={{ color }}>
              {grade}
            </div>
            <div className="text-[9px] uppercase tracking-widest text-zinc-500 mt-0.5">
              Kontingen Health Index
            </div>
          </div>
        </div>

        {/* Dimensions breakdown */}
        <div className="flex-1 space-y-2">
          <div className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: primary }}>
            Komposisi Skor
          </div>
          {dimensions.map((d, i) => {
            const dColor = d.score >= 85 ? '#10b981'
                         : d.score >= 70 ? '#3b82f6'
                         : d.score >= 55 ? '#fbbf24'
                         : d.score >= 40 ? '#f97316'
                         : '#ef4444'
            const Icon = d.icon
            return (
              <div key={i} className="flex items-center gap-2">
                {Icon && <Icon size={11} style={{ color: dColor }}/>}
                <span className="text-[11px] text-zinc-300 w-20 truncate">{d.label}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="h-full rounded-full transition-all duration-1500"
                    style={{
                      width: `${d.score}%`,
                      background: `linear-gradient(90deg, ${dColor}90, ${dColor})`,
                      boxShadow: `0 0 6px ${dColor}40`,
                    }}/>
                </div>
                <span className="text-[11px] font-mono font-bold w-9 text-right" style={{ color: dColor }}>
                  {d.score}%
                </span>
                <span className="text-[9px] text-zinc-600 font-mono w-8">
                  ×{(d.weight * 100).toFixed(0)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 2. CRITICAL ALERTS CARD
// ═══════════════════════════════════════════════════════════════════
export interface CriticalAlert {
  severity: 'urgent' | 'important' | 'info'
  icon?: any
  title: string
  message: string
  action?: string
  actionHref?: string
  count?: number
  drilldownKey?: 'kritis' | 'pending' | 'ditolak' | 'dns' | 'locked_nik' | 'cabor_lemah'
}

export function CriticalAlertsCard({
  alerts, primary = '#10b981', maxShow = 3, title = 'Critical Alerts Hari Ini', columns = 1,
}: {
  alerts: CriticalAlert[]
  primary?: string
  maxShow?: number
  title?: string
  columns?: number
}) {
  const sorted = [...alerts].sort((a, b) => {
    const order = { urgent: 0, important: 1, info: 2 }
    return order[a.severity] - order[b.severity]
  })
  const shown = sorted.slice(0, maxShow)
  const urgentCount = alerts.filter(a => a.severity === 'urgent').length

  const sevConfig = {
    urgent:    { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   label: 'URGENT' },
    important: { color: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)',  label: 'PENTING' },
    info:      { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)',  label: 'INFO' },
  }

  return (
    <div className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>

      <div className="flex items-center gap-2 mb-4">
        <Bell size={14} style={{ color: urgentCount > 0 ? '#ef4444' : primary }}
          className={urgentCount > 0 ? 'animate-pulse' : ''}/>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {urgentCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest animate-pulse"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
            {urgentCount} URGENT
          </span>
        )}
        <span className="ml-auto text-[10px] text-zinc-500">{alerts.length} total alerts</span>
      </div>

      {shown.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle size={32} className="text-emerald-400 mx-auto mb-2 opacity-50"/>
          <div className="text-sm text-emerald-300 font-bold">Semua kondisi normal! ✨</div>
          <div className="text-xs text-zinc-500 mt-1">Tidak ada action item urgent</div>
        </div>
      ) : (
        <div className={columns > 1 ? `grid gap-2.5` : 'space-y-2.5'}
          style={columns > 1 ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}>
          {shown.map((a, i) => {
            const cfg = sevConfig[a.severity]
            const Icon = a.icon || AlertTriangle
            return (
              <div key={i} className="rounded-xl p-3"
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                <div className="flex items-start gap-3">
                  <Icon size={14} style={{ color: cfg.color, flexShrink: 0, marginTop: 2 }}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] uppercase tracking-widest font-black"
                        style={{ color: cfg.color }}>
                        {cfg.label}
                      </span>
                      {a.count != null && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: `${cfg.color}20`, color: cfg.color }}>
                          {a.count}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-white mb-0.5">{a.title}</div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">{a.message}</p>
                    {a.action && a.actionHref && (
                      <Link href={a.actionHref}
                        className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold transition-all hover:gap-2"
                        style={{ color: cfg.color }}>
                        {a.action} <ChevronRight size={10}/>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {alerts.length > maxShow && (
            <button className="w-full text-center text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors pt-1">
              Lihat {alerts.length - maxShow} alert lainnya →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 3. CRITICAL PATH TIMELINE (H-Countdown + tasks)
// ═══════════════════════════════════════════════════════════════════
export interface TimelineTask {
  hari: string         // e.g. 'HARI INI', 'BESOK', 'H-7'
  date: string         // e.g. '6 Jun'
  tasks: string[]      // list of tasks
  highlight?: boolean
}

export function CriticalPathTimeline({
  targetDate, targetLabel = 'OPENING CEREMONY',
  tasks, primary = '#10b981',
}: {
  targetDate: string    // ISO date e.g. '2026-06-15'
  targetLabel?: string
  tasks: TimelineTask[]
  primary?: string
}) {
  const daysUntil = Math.max(0, Math.ceil(
    (new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ))
  const animDays = useCount(daysUntil, 1500)

  const urgency = daysUntil <= 3 ? '#ef4444'
                : daysUntil <= 7 ? '#f97316'
                : daysUntil <= 14 ? '#fbbf24'
                : primary

  return (
    <div className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: urgency }}/>

      <div className="relative">
        {/* Header with countdown */}
        <div className="flex items-center justify-between mb-4 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={14} style={{ color: urgency }}/>
              <h3 className="text-sm font-bold text-white">Critical Path Timeline</h3>
            </div>
            <p className="text-[10px] uppercase tracking-widest font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Menuju {targetLabel}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black leading-none" style={{ color: urgency, textShadow: `0 0 16px ${urgency}40` }}>
              H-{Math.round(animDays)}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
              {new Date(targetDate).toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'})}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          {tasks.map((t, i) => (
            <div key={i} className="flex gap-3">
              {/* Date column */}
              <div className="flex flex-col items-center w-16 flex-shrink-0">
                <div className={`w-3 h-3 rounded-full ${t.highlight?'animate-pulse':''}`}
                  style={{
                    background: t.highlight ? urgency : 'rgba(255,255,255,0.15)',
                    boxShadow: t.highlight ? `0 0 8px ${urgency}` : 'none',
                  }}/>
                {i < tasks.length - 1 && (
                  <div className="flex-1 w-px my-1" style={{ background: 'rgba(255,255,255,0.06)' }}/>
                )}
              </div>
              {/* Content */}
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] uppercase tracking-widest font-black"
                    style={{ color: t.highlight ? urgency : 'rgba(255,255,255,0.6)' }}>
                    {t.hari}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono">{t.date}</span>
                </div>
                <ul className="space-y-1">
                  {t.tasks.map((task, j) => (
                    <li key={j} className="text-[11px] text-zinc-300 flex items-start gap-2">
                      <span className="text-zinc-600 mt-0.5">▸</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 4. MISSION CONTROL QUICK ACTIONS
// ═══════════════════════════════════════════════════════════════════
export interface MissionAction {
  type: 'urgent' | 'important' | 'opportunity'
  title: string
  description: string
  count?: number
  href: string
  icon?: any
}

export function MissionControlActions({
  actions, primary = '#10b981',
}: {
  actions: MissionAction[]
  primary?: string
}) {
  const typeConfig = {
    urgent:      { color: '#ef4444', label: 'URGENT',      bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)'  },
    important:   { color: '#f97316', label: 'PENTING',     bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)' },
    opportunity: { color: '#10b981', label: 'PELUANG',     bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
  }

  return (
    <div className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Zap size={14} style={{ color: primary }}/>
        <h3 className="text-sm font-bold text-white">Mission Control · Apa yang Harus Dilakukan?</h3>
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-6 text-xs text-zinc-500">Tidak ada action items saat ini</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {actions.slice(0, 6).map((a, i) => {
            const cfg = typeConfig[a.type]
            const Icon = a.icon || Target
            return (
              <Link key={i} href={a.href}
                className="block rounded-xl p-4 transition-all hover:scale-[1.02] hover:shadow-lg group"
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: `${cfg.color}20` }}>
                    <Icon size={16} style={{ color: cfg.color }}/>
                  </div>
                  <span className="text-[9px] uppercase tracking-widest font-black"
                    style={{ color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>
                <div className="text-sm font-bold text-white mb-1">{a.title}</div>
                <div className="text-[11px] text-zinc-400 leading-relaxed mb-2">{a.description}</div>
                <div className="flex items-center justify-between mt-3">
                  {a.count != null && (
                    <span className="text-2xl font-black" style={{ color: cfg.color }}>{a.count}</span>
                  )}
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold transition-all group-hover:gap-2"
                    style={{ color: cfg.color }}>
                    Lakukan <ChevronRight size={10}/>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 5. AUTO-GENERATE ALERTS & ACTIONS FROM DATA
// ═══════════════════════════════════════════════════════════════════
export function buildAlertsFromData(d: {
  pendingVerifikasi: number
  dnsAtlet: number
  lowSkorAtlet: number
  daysToEvent: number
  lockedNik?: number
  cabors_lemah_count: number
  apparelIncomplete?: number
}): CriticalAlert[] {
  const alerts: CriticalAlert[] = []

  if (d.pendingVerifikasi > 10) {
    alerts.push({
      severity: 'urgent',
      icon: FileCheck,
      title: `${d.pendingVerifikasi} Atlet Pending Verifikasi`,
      message: `${d.pendingVerifikasi} atlet menunggu verifikasi admin >7 hari. Closing pendaftaran semakin dekat.`,
      action: 'Lihat Atlet',
      actionHref: '/konida/atlet/kabbandung?status=Menunggu+Admin',
      count: d.pendingVerifikasi,
      drilldownKey: 'pending',
    })
  }
  if (d.lowSkorAtlet > 0) {
    alerts.push({
      severity: 'urgent',
      icon: Activity,
      title: `${d.lowSkorAtlet} Atlet Tes Fisik Kritis`,
      message: `${d.lowSkorAtlet} atlet dengan skor <35% (KRITIS) perlu evaluasi medis sebelum kompetisi.`,
      action: 'Lihat Atlet',
      actionHref: '/konida/atlet/kabbandung',
      count: d.lowSkorAtlet,
      drilldownKey: 'kritis',
    })
  }
  if (d.cabors_lemah_count > 0) {
    alerts.push({
      severity: 'important',
      icon: Activity,
      title: `${d.cabors_lemah_count} Cabor Perlu Intervensi`,
      message: `Rata-rata fitness <55%. Program latihan intensif direkomendasikan.`,
      action: 'Lihat Cabor',
      actionHref: '/konida/atlet/kabbandung',
      count: d.cabors_lemah_count,
      drilldownKey: 'cabor_lemah',
    })
  }
  if (d.dnsAtlet > 0) {
    alerts.push({
      severity: 'important',
      icon: Clock,
      title: `${d.dnsAtlet} Atlet Belum Tes Fisik`,
      message: `${d.dnsAtlet} atlet belum / tidak hadir tes fisik. Perlu dijadwalkan tes susulan.`,
      action: 'Lihat Atlet',
      actionHref: '/konida/atlet/kabbandung',
      count: d.dnsAtlet,
      drilldownKey: 'dns',
    })
  }
  if ((d.lockedNik ?? 0) > 0) {
    alerts.push({
      severity: 'important',
      icon: AlertTriangle,
      title: `${d.lockedNik} NIK Perlu Verifikasi KONI`,
      message: `${d.lockedNik} atlet NIK tidak valid — diisolasi sistem, menunggu verifikasi manual KTP/Akta oleh KONI.`,
      action: 'Lihat Detail',
      actionHref: '/konida/atlet/kabbandung',
      count: d.lockedNik,
      drilldownKey: 'locked_nik',
    })
  }
  if (d.daysToEvent <= 14) {
    alerts.push({
      severity: 'urgent',
      icon: Calendar,
      title: `H-${d.daysToEvent} Hari Menuju PORPROV XV`,
      message: `Pastikan semua persiapan final: ID Card, apparel, manifest, briefing pelatih.`,
      action: 'Lihat Timeline',
      actionHref: '#timeline',
    })
  }
  if (d.apparelIncomplete && d.apparelIncomplete > 0) {
    alerts.push({
      severity: 'important',
      icon: Trophy,
      title: `${d.apparelIncomplete} Atlet Apparel Belum Lengkap`,
      message: `Uniform & atribut belum lengkap. Risiko atlet tidak bisa tampil di opening.`,
      action: 'Cek Logistik',
      actionHref: '/konida/atlet/kabbogor',
      count: d.apparelIncomplete,
    })
  }

  return alerts
}

export function buildMissionActions(d: {
  pendingVerifikasi: number
  dnsAtlet: number
  lowSkorAtlet: number
  topPerformers: number
  cabors_lemah_count: number
  nonLokal: number
}): MissionAction[] {
  const actions: MissionAction[] = []

  if (d.pendingVerifikasi > 0) {
    actions.push({
      type: 'urgent',
      title: 'Selesaikan Verifikasi',
      description: 'Atlet pending audit menunggu approval',
      count: d.pendingVerifikasi,
      href: '/konida/atlet/kabbogor',
      icon: FileCheck,
    })
  }
  if (d.dnsAtlet > 0) {
    actions.push({
      type: 'important',
      title: 'Jadwalkan Tes Susulan',
      description: 'Atlet DNS perlu tes biomotorik susulan',
      count: d.dnsAtlet,
      href: '/konida/Premiumreport/kabbogor/tes-fisik',
      icon: Activity,
    })
  }
  if (d.topPerformers > 0) {
    actions.push({
      type: 'opportunity',
      title: 'Promo Top Performers',
      description: 'Atlet elit (skor 80%+) — kandidat medali emas',
      count: d.topPerformers,
      href: '/konida/Premiumreport/kabbogor/tes-fisik',
      icon: Trophy,
    })
  }
  if (d.cabors_lemah_count > 0) {
    actions.push({
      type: 'important',
      title: 'Program Latihan Cabor Lemah',
      description: 'Setup program stamina 8 minggu',
      count: d.cabors_lemah_count,
      href: '/konida/Premiumreport/kabbogor/tes-fisik',
      icon: Flame,
    })
  }
  if (d.nonLokal > 0) {
    actions.push({
      type: 'urgent',
      title: 'Review NIK Anomali',
      description: 'Atlet dengan NIK luar Kab. Bogor',
      count: d.nonLokal,
      href: '/konida/atlet/kabbogor',
      icon: Users,
    })
  }
  if (d.lowSkorAtlet > 0) {
    actions.push({
      type: 'urgent',
      title: 'Evaluasi Medis Atlet',
      description: 'Atlet skor <35% (KRITIS) perlu konsultasi medis',
      count: d.lowSkorAtlet,
      href: '/konida/Premiumreport/kabbogor/tes-fisik',
      icon: AlertTriangle,
    })
  }

  return actions
}

export function buildDefaultTimeline(targetDate: string): TimelineTask[] {
  const today = new Date()
  const target = new Date(targetDate)
  const daysUntil = Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000))

  const fmt = (offset: number) => {
    const d = new Date(today.getTime() + offset * 86400000)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  return [
    {
      hari: 'HARI INI',
      date: fmt(0),
      highlight: true,
      tasks: [
        'Selesaikan verifikasi atlet pending',
        'Review proposal anggaran tambahan',
        'Koordinasi dengan pelatih cabor presisi',
      ],
    },
    {
      hari: 'BESOK',
      date: fmt(1),
      tasks: [
        'Tes biomotorik susulan untuk atlet DNS',
        'Briefing kepala kontingen per cabor',
      ],
    },
    daysUntil > 7 ? {
      hari: `H-${daysUntil - 7}`,
      date: fmt(daysUntil - 7),
      tasks: [
        'Final closing pendaftaran atlet',
        'Submit manifest atlet ke PB PORPROV',
        'Distribusi apparel & atribut',
      ],
    } : null,
    daysUntil > 3 ? {
      hari: `H-3`,
      date: fmt(daysUntil - 3),
      tasks: [
        'Briefing umum kontingen',
        'Final check perlengkapan',
        'Persiapan opening ceremony',
      ],
    } : null,
    {
      hari: `H-0`,
      date: fmt(daysUntil),
      highlight: false,
      tasks: ['🎉 OPENING CEREMONY PORPROV XV'],
    },
  ].filter((t): t is TimelineTask => t !== null)
}
