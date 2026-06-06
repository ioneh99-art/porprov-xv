'use client'
// src/app/superadmin/integrity/page.tsx
// DATA HEALTH SCANNER — cross-tenant integrity + anomaly detection

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  AlertTriangle, CheckCircle, ChevronDown, ChevronRight,
  FileSearch, Loader2, RefreshCw, Shield, ShieldAlert,
  ShieldCheck, XCircle, Zap,
} from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const C = {
  primary:   '#00f3ff',
  secondary: '#00ff66',
  accent:    '#ffb000',
  alert:     '#ff3366',
  purple:    '#a855f7',
  bg:        'rgba(10,25,47,0.4)',
  border:    'rgba(0,243,255,0.2)',
  muted:     '#7a8b9e',
}

// ── Types ──────────────────────────────────────────────────
interface IssueRow { severity: 'critical'|'warning'|'info'; message: string; count: number }
interface TenantHealth {
  kontingen_id:   number
  nama:           string
  issues:         IssueRow[]
  score:          number   // 0–100, higher = healthier
  totalAtlet:     number
}

const SEV_COLOR = { critical: C.alert, warning: C.accent, info: C.primary }
const SEV_ICON  = {
  critical: <XCircle      size={12} />,
  warning:  <AlertTriangle size={12} />,
  info:     <CheckCircle  size={12} />,
}

function healthGrade(score: number) {
  if (score >= 90) return { label: 'OPTIMAL',   color: C.secondary }
  if (score >= 70) return { label: 'STABLE',    color: C.primary   }
  if (score >= 50) return { label: 'DEGRADED',  color: C.accent    }
  return               { label: 'CRITICAL',  color: C.alert     }
}

// ══════════════════════════════════════════════════════════
export default function IntegrityPage() {
  const [kontingens, setKontingens] = useState<{ id: number; nama: string }[]>([])
  const [atlet,      setAtlet]      = useState<any[]>([])
  const [dokumen,    setDokumen]    = useState<any[]>([])
  const [tesFisik,   setTesFisik]   = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [scanning,   setScanning]   = useState(false)
  const [expanded,   setExpanded]   = useState<number | null>(null)
  const [filterSev,  setFilterSev]  = useState<'all'|'critical'|'warning'>('all')
  const [animIn,     setAnimIn]     = useState(false)

  useEffect(() => { setTimeout(() => setAnimIn(true), 80) }, [])

  async function scan() {
    setScanning(true)
    const [kRes, aRes, dRes, tRes] = await Promise.all([
      sb.from('kontingen').select('id,nama').order('nama'),
      sb.from('atlet').select('id,kontingen_id,nik,nama,foto_url,gender,cabor_nama_raw,status_registrasi').order('kontingen_id'),
      sb.from('atlet_dokumen').select('atlet_id,status,jenis_dokumen').limit(5000),
      sb.from('atlet_tes_fisik').select('atlet_id,kesimpulan_persen').limit(5000),
    ])
    if (kRes.data) setKontingens(kRes.data)
    if (aRes.data) setAtlet(aRes.data)
    if (dRes.data) setDokumen(dRes.data)
    if (tRes.data) setTesFisik(tRes.data)
    setLoading(false)
    setScanning(false)
  }

  useEffect(() => { void scan() }, [])

  // ── Compute per-tenant health ──────────────────────────
  const tenantHealthList = useMemo<TenantHealth[]>(() => {
    if (!kontingens.length || !atlet.length) return []

    // Duplicate NIK finder
    const nikCount: Record<string, number> = {}
    atlet.forEach(a => { if (a.nik) nikCount[a.nik] = (nikCount[a.nik] || 0) + 1 })
    const dupNiks = new Set(Object.entries(nikCount).filter(([,c]) => c > 1).map(([k]) => k))

    // Dokumen per atlet
    const dokByAtlet: Record<string, string[]> = {}
    dokumen.forEach(d => {
      if (!dokByAtlet[d.atlet_id]) dokByAtlet[d.atlet_id] = []
      dokByAtlet[d.atlet_id].push(d.status)
    })

    // Tes fisik per atlet
    const tesByAtlet = new Set(tesFisik.map(t => t.atlet_id))

    return kontingens.map(k => {
      const mine = atlet.filter(a => a.kontingen_id === k.id)
      if (!mine.length) return null

      const issues: IssueRow[] = []
      let penalty = 0

      // NIK kosong
      const noNik = mine.filter(a => !a.nik || a.nik.trim() === '').length
      if (noNik > 0) {
        issues.push({ severity: 'critical', message: 'Atlet tanpa NIK', count: noNik })
        penalty += noNik * 3
      }

      // NIK format salah (bukan 16 digit)
      const badNik = mine.filter(a => a.nik && a.nik.replace(/\D/g,'').length !== 16).length
      if (badNik > 0) {
        issues.push({ severity: 'warning', message: 'NIK format salah (bukan 16 digit)', count: badNik })
        penalty += badNik * 2
      }

      // NIK duplikat cross-kontingen
      const dupInThis = mine.filter(a => a.nik && dupNiks.has(a.nik)).length
      if (dupInThis > 0) {
        issues.push({ severity: 'critical', message: 'NIK duplikat lintas sistem', count: dupInThis })
        penalty += dupInThis * 4
      }

      // Foto kosong
      const noFoto = mine.filter(a => !a.foto_url || a.foto_url.trim() === '').length
      if (noFoto > 0) {
        issues.push({ severity: 'warning', message: 'Atlet tanpa foto profil', count: noFoto })
        penalty += noFoto * 1
      }

      // Tanpa cabor
      const noCabor = mine.filter(a => !a.cabor_nama_raw || a.cabor_nama_raw.trim() === '').length
      if (noCabor > 0) {
        issues.push({ severity: 'critical', message: 'Atlet tanpa cabang olahraga', count: noCabor })
        penalty += noCabor * 3
      }

      // Tanpa gender
      const noGender = mine.filter(a => !a.gender).length
      if (noGender > 0) {
        issues.push({ severity: 'warning', message: 'Atlet tanpa data gender', count: noGender })
        penalty += noGender * 1
      }

      // Dokumen coverage
      const withDok  = mine.filter(a => (dokByAtlet[a.id] || []).length > 0).length
      const dokPct   = mine.length ? Math.round(withDok / mine.length * 100) : 0
      if (dokPct < 50) {
        issues.push({ severity: 'critical', message: `Dokumen coverage rendah (${dokPct}%)`, count: mine.length - withDok })
        penalty += 10
      } else if (dokPct < 80) {
        issues.push({ severity: 'warning', message: `Dokumen coverage parsial (${dokPct}%)`, count: mine.length - withDok })
        penalty += 5
      } else {
        issues.push({ severity: 'info', message: `Dokumen coverage baik (${dokPct}%)`, count: withDok })
      }

      // Tes fisik coverage
      const withTes  = mine.filter(a => tesByAtlet.has(a.id)).length
      const tesPct   = mine.length ? Math.round(withTes / mine.length * 100) : 0
      if (tesPct < 30) {
        issues.push({ severity: 'critical', message: `Tes fisik coverage sangat rendah (${tesPct}%)`, count: mine.length - withTes })
        penalty += 12
      } else if (tesPct < 60) {
        issues.push({ severity: 'warning', message: `Tes fisik coverage kurang (${tesPct}%)`, count: mine.length - withTes })
        penalty += 6
      } else {
        issues.push({ severity: 'info', message: `Tes fisik coverage ${tesPct}%`, count: withTes })
      }

      // Verified rate
      const verified = mine.filter(a => ['Verified','Posted'].includes(a.status_registrasi)).length
      const verPct   = mine.length ? Math.round(verified / mine.length * 100) : 0
      if (verPct < 50) {
        issues.push({ severity: 'warning', message: `Verifikasi masih rendah (${verPct}%)`, count: mine.length - verified })
        penalty += 5
      } else if (verPct < 80) {
        issues.push({ severity: 'info', message: `Verifikasi progres (${verPct}%)`, count: verified })
      } else {
        issues.push({ severity: 'info', message: `Verifikasi tinggi (${verPct}%)`, count: verified })
      }

      const score = Math.max(0, Math.min(100, 100 - penalty))
      return { kontingen_id: k.id, nama: k.nama, issues, score, totalAtlet: mine.length }
    }).filter(Boolean) as TenantHealth[]
  }, [kontingens, atlet, dokumen, tesFisik])

  const filtered = useMemo(() => {
    if (filterSev === 'all') return tenantHealthList
    return tenantHealthList.filter(t => t.issues.some(i => i.severity === filterSev))
  }, [tenantHealthList, filterSev])

  const systemScore  = tenantHealthList.length
    ? Math.round(tenantHealthList.reduce((s, t) => s + t.score, 0) / tenantHealthList.length)
    : 0

  const criticalTenants = tenantHealthList.filter(t => t.score < 50).length
  const totalCritIssues = tenantHealthList.reduce((s, t) => s + t.issues.filter(i => i.severity === 'critical').length, 0)
  const totalWarnIssues = tenantHealthList.reduce((s, t) => s + t.issues.filter(i => i.severity === 'warning').length, 0)
  const sysGrade = healthGrade(systemScore)

  const panel = { background: C.bg, border: `1px solid ${C.border}`, backdropFilter: 'blur(10px)' }
  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.5s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  return (
    <div className="p-6 space-y-5 font-sci min-h-screen" style={{ color: '#f1f5f9' }}>

      {/* Header */}
      <div {...ani(0)} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border flex items-center justify-center relative"
            style={{ borderColor: C.secondary, background: 'rgba(0,255,102,0.08)' }}>
            <div className="absolute inset-0 animate-pulse" style={{ background: 'rgba(0,255,102,0.06)' }} />
            <FileSearch size={18} style={{ color: C.secondary }} className="z-10" />
          </div>
          <div>
            <h1 className="font-lcd font-bold text-xl tracking-widest" style={{ color: C.secondary, textShadow: `0 0 12px ${C.secondary}` }}>
              DATA_INTEGRITY_SCANNER
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: C.muted }}>
              NIK · Foto · Dokumen · Tes Fisik · Verifikasi · {atlet.length} atlet di-scan
            </p>
          </div>
        </div>
        <button onClick={scan} disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 text-[10px] font-mono border uppercase tracking-wider disabled:opacity-40"
          style={{ borderColor: C.secondary, color: C.secondary, background: 'rgba(0,255,102,0.06)' }}>
          {scanning ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {scanning ? 'SCANNING...' : 'RUN_SCAN'}
        </button>
      </div>

      {/* System score + KPI */}
      <div {...ani(40)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 relative overflow-hidden" style={{ ...panel, borderColor: `${sysGrade.color}40` }}>
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: sysGrade.color }} />
          <div className="text-[8px] font-lcd uppercase tracking-wider mb-1" style={{ color: C.muted }}>SYSTEM_HEALTH</div>
          <div className="font-lcd font-bold text-3xl" style={{ color: sysGrade.color }}>{systemScore}</div>
          <div className="text-[9px] font-mono mt-1" style={{ color: sysGrade.color }}>{sysGrade.label}</div>
          {/* mini bar */}
          <div className="mt-2 h-1 rounded" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded" style={{ width: `${systemScore}%`, background: sysGrade.color }} />
          </div>
        </div>
        {[
          { l: 'CRITICAL_ISSUES', v: totalCritIssues, c: C.alert   },
          { l: 'WARNING_ISSUES',  v: totalWarnIssues, c: C.accent  },
          { l: 'CRITICAL_TENANTS',v: criticalTenants, c: C.purple  },
        ].map(s => (
          <div key={s.l} className="p-4 relative" style={panel}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: s.c }} />
            <div className="text-[8px] font-lcd uppercase tracking-wider mb-1" style={{ color: C.muted }}>{s.l}</div>
            <div className="font-lcd font-bold text-3xl" style={{ color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div {...ani(80)} className="flex gap-2">
        {(['all','critical','warning'] as const).map(f => (
          <button key={f} onClick={() => setFilterSev(f)}
            className="px-3 py-1.5 text-[10px] font-mono border uppercase tracking-wider transition-all"
            style={{
              borderColor: filterSev === f ? (f === 'critical' ? C.alert : f === 'warning' ? C.accent : C.primary) : C.border,
              color: filterSev === f ? (f === 'critical' ? C.alert : f === 'warning' ? C.accent : C.primary) : C.muted,
              background: filterSev === f ? 'rgba(255,255,255,0.04)' : 'transparent',
            }}>
            {f === 'all' ? `ALL (${tenantHealthList.length})` : f === 'critical' ? `CRITICAL (${tenantHealthList.filter(t=>t.issues.some(i=>i.severity==='critical')).length})` : `WARNING (${tenantHealthList.filter(t=>t.issues.some(i=>i.severity==='warning')).length})`}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin" style={{ color: C.primary }} />
        </div>
      )}

      {/* Tenant health list */}
      {!loading && (
        <div {...ani(120)} className="space-y-2">
          {filtered.map(t => {
            const grade  = healthGrade(t.score)
            const isOpen = expanded === t.kontingen_id
            const crit   = t.issues.filter(i => i.severity === 'critical')
            const warn   = t.issues.filter(i => i.severity === 'warning')
            return (
              <div key={t.kontingen_id} style={{ ...panel, borderColor: isOpen ? `${grade.color}40` : C.border }}>
                {/* Row header */}
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  onClick={() => setExpanded(isOpen ? null : t.kontingen_id)}>
                  {/* Score badge */}
                  <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center border font-lcd font-bold text-sm"
                    style={{ borderColor: `${grade.color}40`, color: grade.color, background: `${grade.color}10` }}>
                    {t.score}
                  </div>
                  {/* Name + pills */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-white">{t.nama}</span>
                      <span className="text-[8px] font-lcd px-1.5 py-0.5 font-bold"
                        style={{ background: `${grade.color}15`, color: grade.color, border: `1px solid ${grade.color}30` }}>
                        {grade.label}
                      </span>
                      {crit.length > 0 && (
                        <span className="text-[8px] font-mono px-1.5 py-0.5"
                          style={{ background: `${C.alert}10`, color: C.alert, border: `1px solid ${C.alert}30` }}>
                          {crit.length} CRITICAL
                        </span>
                      )}
                      {warn.length > 0 && (
                        <span className="text-[8px] font-mono px-1.5 py-0.5"
                          style={{ background: `${C.accent}10`, color: C.accent, border: `1px solid ${C.accent}30` }}>
                          {warn.length} WARNING
                        </span>
                      )}
                    </div>
                    {/* Score bar */}
                    <div className="h-1 rounded overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded transition-all" style={{ width: `${t.score}%`, background: grade.color }} />
                    </div>
                  </div>
                  <div className="text-[9px] font-mono flex-shrink-0" style={{ color: C.muted }}>{t.totalAtlet} atlet</div>
                  {isOpen ? <ChevronDown size={14} style={{ color: C.muted }} /> : <ChevronRight size={14} style={{ color: C.muted }} />}
                </button>

                {/* Issues list */}
                {isOpen && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: `${C.border}` }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-3">
                      {t.issues.map((issue, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2"
                          style={{
                            background: `${SEV_COLOR[issue.severity]}08`,
                            border: `1px solid ${SEV_COLOR[issue.severity]}25`,
                          }}>
                          <span style={{ color: SEV_COLOR[issue.severity] }}>{SEV_ICON[issue.severity]}</span>
                          <div className="flex-1 text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.75)' }}>{issue.message}</div>
                          <span className="font-lcd text-xs font-bold" style={{ color: SEV_COLOR[issue.severity] }}>
                            {issue.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
