'use client'
// src/app/superadmin/subscriptions/page.tsx — JARVIS THEME — v2
// 🆕 FIX: Level selector + better error handling + console logging

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  ChevronDown, ChevronUp, Edit3, Loader2, Package,
  Plus, RefreshCw, Search, ToggleLeft, ToggleRight, X, ShieldCheck,
  Crown, Award, Star, Shield, Zap,
} from 'lucide-react'
import {
  assignPlan, getPlans, getTenantLevels, F,
  PLAN_TO_LEVEL_MAP,
  type Plan, type UserLevel,
} from '@/lib/subscriptions'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── JARVIS palette ────────────────────────────────────────
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

const TIER_COLORS = ['#7a8b9e', '#00ff66', '#00f3ff', '#a855f7', '#ffb000']
function planColor(urutan: number) { return TIER_COLORS[Math.min(urutan, TIER_COLORS.length - 1)] }

const ALL_FEATURES = Object.values(F) as string[]
const DEFAULT_SHOW = 10

// ═══ LEVEL CONFIG ════════════════════════════════════════
const LEVEL_OPTIONS: { key: UserLevel; label: string; icon: any; color: string; desc: string }[] = [
  { key: 'level3',     label: 'L3 · BASIC',    icon: Star,   color: '#3b82f6', desc: 'Input atlet, view dashboard mini' },
  { key: 'level2',     label: 'L2 · SILVER',   icon: Award,  color: '#94a3b8', desc: 'Kontingen reguler — atlet + laporan' },
  { key: 'level1',     label: 'L1 · GOLD',     icon: Shield, color: '#f59e0b', desc: 'War Room + Penyelenggara' },
  { key: 'koni_jabar', label: 'KONI · JABAR',  icon: Zap,    color: '#10b981', desc: 'Lihat semua kontingen' },
  { key: 'superadmin', label: 'SUPER · ADMIN', icon: Crown,  color: '#ef4444', desc: 'Full access (jangan diubah)' },
]
const LEVEL_BY_KEY = Object.fromEntries(LEVEL_OPTIONS.map(l => [l.key, l]))

interface SubRow {
  id:              string
  kontingen_id:    number
  kontingen_nama:  string
  plan_id:         string
  level:           UserLevel       // 🆕
  is_active:       boolean
  is_trial:        boolean
  is_expired:      boolean
  days_left:       number | null
  valid_until:     string | null
  max_users:       number | null
  max_atlet:       number | null
  features_add:    string[]
  features_remove: string[]
  features:        string[]
  catatan:         string | null
  created_at:      string
}

interface AssignForm {
  kontingen_id:    number
  plan_id:         string
  level:           UserLevel       // 🆕
  valid_until:     string
  max_users:       string
  max_atlet:       string
  is_trial:        boolean
  features_add:    string[]
  features_remove: string[]
  catatan:         string
}

function daysLeft(validUntil: string | null): number | null {
  if (!validUntil) return null
  return Math.ceil((new Date(validUntil).getTime() - Date.now()) / 86_400_000)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ══════════════════════════════════════════════════════════
export default function SubscriptionsPage() {
  const [subs,         setSubs]         = useState<SubRow[]>([])
  const [plans,        setPlans]        = useState<Plan[]>([])
  const [kontingens,   setKontingens]   = useState<{ id: number; nama: string }[]>([])
  const [tenantLevels, setTenantLevels] = useState<Record<number, UserLevel>>({})
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [filterPlan,   setFilterPlan]   = useState('semua')
  const [showAll,      setShowAll]      = useState(false)
  const [modal,        setModal]        = useState<SubRow | 'new' | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null)
  const [animIn,       setAnimIn]       = useState(false)
  const [form,         setForm]         = useState<AssignForm>({
    kontingen_id: 0, plan_id: '', level: 'level3',
    valid_until: '', max_users: '', max_atlet: '',
    is_trial: false, features_add: [], features_remove: [], catatan: '',
  })

  useEffect(() => { setTimeout(() => setAnimIn(true), 80) }, [])

  function showToast(msg: string, ok = true) {
    console.log(`[Toast ${ok ? '✓' : '✗'}]`, msg)
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3800)
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [subRes, planData, kRes, levelMap] = await Promise.all([
        sb.from('subscriptions')
          .select('*, kontingen(nama)')
          .order('created_at', { ascending: false }),
        getPlans(),
        sb.from('kontingen').select('id,nama').order('nama'),
        getTenantLevels(),
      ])

      if (subRes.error) {
        console.error('[fetchAll] subs error:', subRes.error)
        showToast(`Gagal load subs: ${subRes.error.message}`, false)
      }

      setSubs((subRes.data ?? []).map((s: any) => {
        const dl = daysLeft(s.valid_until)
        return {
          id:              s.id,
          kontingen_id:    s.kontingen_id,
          kontingen_nama:  s.kontingen?.nama ?? '—',
          plan_id:         s.plan_id,
          level:           levelMap[s.kontingen_id] ?? 'level3',
          is_active:       s.is_active,
          is_trial:        s.is_trial ?? false,
          is_expired:      dl !== null && dl < 0,
          days_left:       dl,
          valid_until:     s.valid_until,
          max_users:       s.max_users,
          max_atlet:       s.max_atlet,
          features_add:    s.features_add ?? [],
          features_remove: s.features_remove ?? [],
          features:        s.features ?? [],
          catatan:         s.catatan,
          created_at:      s.created_at,
        }
      }))
      setPlans(planData)
      setKontingens(kRes.data ?? [])
      setTenantLevels(levelMap)
    } catch (e: any) {
      console.error('[fetchAll] fatal error:', e)
      showToast(`Fatal: ${e.message ?? 'unknown'}`, false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchAll() }, [fetchAll])

  const planIndexMap = useMemo(() => {
    const m: Record<string, number> = {}
    plans.forEach((p, i) => { m[p.id] = i })
    return m
  }, [plans])

  const planColorMap = useMemo(() => {
    const m: Record<string, string> = {}
    plans.forEach((p, i) => { m[p.id] = planColor(i) })
    return m
  }, [plans])

  const sorted = useMemo(() => [...subs].sort((a, b) => {
    if (a.is_expired !== b.is_expired) return a.is_expired ? 1 : -1
    if (a.is_active !== b.is_active)   return a.is_active ? -1 : 1
    const tierDiff = (planIndexMap[b.plan_id] ?? 0) - (planIndexMap[a.plan_id] ?? 0)
    if (tierDiff !== 0) return tierDiff
    return a.kontingen_nama.localeCompare(b.kontingen_nama)
  }), [subs, planIndexMap])

  const filtered = useMemo(() => {
    let r = sorted
    if (filterPlan !== 'semua') r = r.filter(s => s.plan_id === filterPlan)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(s => s.kontingen_nama.toLowerCase().includes(q))
    }
    return r
  }, [sorted, filterPlan, search])

  const displayed = showAll ? filtered : filtered.slice(0, DEFAULT_SHOW)
  const hiddenCount = filtered.length - DEFAULT_SHOW

  const topPlan    = useMemo(() => plans.length > 0 ? plans[plans.length - 1] : null, [plans])
  const secondPlan = useMemo(() => plans.length > 1 ? plans[plans.length - 2] : null, [plans])

  const summary = useMemo(() => ({
    total:   subs.length,
    aktif:   subs.filter(s => s.is_active && !s.is_expired).length,
    expired: subs.filter(s => s.is_expired).length,
    trial:   subs.filter(s => s.is_trial).length,
    premium: secondPlan ? subs.filter(s => s.plan_id === secondPlan.id || s.plan_id === (topPlan?.id??'')).length : 0,
    top:     topPlan    ? subs.filter(s => s.plan_id === topPlan.id).length : 0,
  }), [subs, topPlan, secondPlan])

  // ── Open modal ──────────────────────────────────────────
  function openEdit(s: SubRow) {
    setForm({
      kontingen_id:    s.kontingen_id,
      plan_id:         s.plan_id,
      level:           s.level,
      valid_until:     s.valid_until ? s.valid_until.slice(0, 10) : '',
      max_users:       s.max_users?.toString() ?? '',
      max_atlet:       s.max_atlet?.toString() ?? '',
      is_trial:        s.is_trial,
      features_add:    [...s.features_add],
      features_remove: [...s.features_remove],
      catatan:         s.catatan ?? '',
    })
    setModal(s)
  }

  function openNew() {
    const defaultPlan = plans[0]?.id ?? ''
    setForm({
      kontingen_id: 0, plan_id: defaultPlan, level: 'level3',
      valid_until: '', max_users: '', max_atlet: '',
      is_trial: false, features_add: [], features_remove: [], catatan: '',
    })
    setModal('new')
  }

  // 🆕 Saat plan berubah, auto-suggest level (kalau user belum touch level manual)
  function handlePlanChange(newPlanId: string) {
    const planIdx = plans.findIndex(p => p.id === newPlanId)
    const suggestedLevel = PLAN_TO_LEVEL_MAP[planIdx] ?? 'level3'
    setForm(p => ({ ...p, plan_id: newPlanId, level: suggestedLevel }))
  }

  // ── Save ────────────────────────────────────────────────
  async function handleSave() {
    console.log('[handleSave] start', form)

    // 🆕 Replace silent return with toast feedback
    if (!form.kontingen_id) {
      showToast('Pilih kontingen dulu', false)
      return
    }
    if (!form.plan_id) {
      showToast('Pilih plan dulu', false)
      return
    }

    setSaving(true)
    try {
      const res = await assignPlan({
        kontingen_id:     form.kontingen_id,
        plan_id:          form.plan_id,
        level:            form.level,                       // 🆕 KIRIM LEVEL
        valid_until:      form.valid_until || null,
        max_users:        form.max_users ? Number(form.max_users) : undefined,
        max_atlet:        form.max_atlet ? Number(form.max_atlet) : undefined,
        features_add:     form.features_add,
        features_remove:  form.features_remove,
        catatan:          form.catatan || undefined,
        is_trial:         form.is_trial,
        created_by:       'superadmin',
      })

      console.log('[handleSave] result:', res)

      if (res.ok) {
        const planNama = plans.find(p => p.id === form.plan_id)?.nama ?? form.plan_id
        const levelNama = LEVEL_BY_KEY[form.level]?.label ?? form.level
        showToast(`✅ ${planNama} · ${levelNama} berhasil di-assign`)

        if (res.warnings?.length) {
          console.warn('[handleSave] warnings:', res.warnings)
          setTimeout(() => showToast(`⚠ ${res.warnings!.join('; ')}`, false), 1000)
        }

        setModal(null)
        await fetchAll()
      } else {
        showToast(res.error || 'Gagal menyimpan', false)
      }
    } catch (e: any) {
      console.error('[handleSave] exception:', e)
      showToast(`Exception: ${e.message ?? 'unknown'}`, false)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(s: SubRow) {
    const { error } = await sb.from('subscriptions').update({ is_active: !s.is_active }).eq('id', s.id)
    if (error) {
      console.error('[toggleActive] error:', error)
      showToast(`Gagal toggle: ${error.message}`, false)
      return
    }
    setSubs(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !s.is_active } : x))
    showToast(`${s.kontingen_nama}: ${!s.is_active ? 'ACTIVATED' : 'DEACTIVATED'}`, !s.is_active)
  }

  // ── Feature toggle helpers ──────────────────────────────
  function toggleFeatureAdd(feat: string) {
    setForm(p => ({
      ...p,
      features_add: p.features_add.includes(feat) ? p.features_add.filter(f => f !== feat) : [...p.features_add, feat],
      features_remove: p.features_remove.filter(f => f !== feat),
    }))
  }
  function toggleFeatureRemove(feat: string) {
    setForm(p => ({
      ...p,
      features_remove: p.features_remove.includes(feat) ? p.features_remove.filter(f => f !== feat) : [...p.features_remove, feat],
      features_add: p.features_add.filter(f => f !== feat),
    }))
  }

  // ── Style helpers ───────────────────────────────────────
  const panel = { background: C.bg, border: `1px solid ${C.border}`, backdropFilter: 'blur(10px)' }
  const ani   = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.5s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  const planFeatures = useMemo(
    () => plans.find(p => p.id === form.plan_id)?.features ?? [],
    [plans, form.plan_id]
  )

  return (
    <div className="p-6 space-y-5 font-sci min-h-screen" style={{ color: '#f1f5f9' }}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 text-xs font-mono border backdrop-blur-md max-w-md"
          style={{ background: toast.ok ? 'rgba(0,255,102,0.1)' : 'rgba(255,51,102,0.1)', borderColor: toast.ok ? C.secondary : C.alert, color: toast.ok ? C.secondary : C.alert }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div {...ani(0)} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border flex items-center justify-center relative"
            style={{ borderColor: C.purple, background: 'rgba(168,85,247,0.08)' }}>
            <div className="absolute inset-0 animate-pulse" style={{ background: 'rgba(168,85,247,0.06)' }} />
            <Package size={18} style={{ color: C.purple }} className="z-10" />
          </div>
          <div>
            <h1 className="font-lcd font-bold text-xl tracking-widest" style={{ color: C.purple, textShadow: `0 0 12px ${C.purple}` }}>
              SUBSCRIPTION_MANAGER
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: C.muted }}>
              Plan · Level · Feature flags · Quota · {subs.length} subscription
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void fetchAll()} disabled={loading}
            className="p-2 border transition-all"
            style={{ borderColor: C.border, color: C.muted }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-mono border uppercase tracking-wider"
            style={{ borderColor: C.secondary, color: C.secondary, background: 'rgba(0,255,102,0.06)' }}>
            <Plus size={12} /> ASSIGN_PLAN
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div {...ani(30)} className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { l: 'TOTAL',                              v: summary.total,   c: C.purple    },
          { l: 'AKTIF',                              v: summary.aktif,   c: C.secondary },
          { l: 'EXPIRED',                            v: summary.expired, c: C.alert     },
          { l: 'TRIAL',                              v: summary.trial,   c: C.primary   },
          { l: (secondPlan?.nama ?? 'TIER 2') + '+', v: summary.premium, c: '#00f3ff'  },
          { l: topPlan?.nama ?? 'TOP TIER',          v: summary.top,     c: C.purple   },
        ].map(s => (
          <div key={s.l} className="p-3 relative overflow-hidden" style={panel}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: s.c }} />
            <div className="text-[8px] font-lcd uppercase tracking-widest mb-1" style={{ color: C.muted }}>{s.l}</div>
            <div className="font-lcd font-bold text-2xl" style={{ color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div {...ani(60)} className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 border px-3 py-1.5 flex-1 min-w-48" style={{ borderColor: C.border }}>
          <Search size={11} style={{ color: C.muted }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setShowAll(false) }}
            placeholder="Cari kontingen..." className="bg-transparent text-xs font-mono text-white outline-none flex-1" />
        </div>
        {[{ id: 'semua', nama: 'ALL', color: C.primary, count: subs.length },
          ...[...plans].reverse().map(p => ({
            id: p.id, nama: p.nama, color: planColorMap[p.id] || C.muted,
            count: subs.filter(s=>s.plan_id===p.id).length,
          }))
        ].map(p => (
          <button key={p.id} onClick={() => { setFilterPlan(p.id); setShowAll(false) }}
            className="px-3 py-1.5 text-[10px] font-mono border uppercase tracking-wider transition-all"
            style={{
              borderColor: filterPlan === p.id ? p.color : C.border,
              color:       filterPlan === p.id ? p.color : C.muted,
              background:  filterPlan === p.id ? `${p.color}10` : 'transparent',
            }}>
            {p.nama} ({p.count})
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin" style={{ color: C.primary }} />
        </div>
      )}

      {/* Subscription list */}
      {!loading && (
        <div {...ani(90)} style={panel}>
          {/* 🆕 Table header — added LEVEL column */}
          <div className="grid px-5 py-3 text-[9px] font-lcd uppercase tracking-widest border-b"
            style={{ gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 1.2fr auto', borderColor: C.border, background: 'rgba(0,243,255,0.03)', color: C.muted }}>
            <div>KONTINGEN</div>
            <div>PLAN</div>
            <div>LEVEL</div>
            <div>VALID_UNTIL</div>
            <div className="text-center">QUOTA</div>
            <div>FEATURES</div>
            <div>AKSI</div>
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-xs font-mono" style={{ color: C.muted }}>
              NO_SUBSCRIPTION_FOUND
            </div>
          )}

          {displayed.map((s) => {
            const pc = planColorMap[s.plan_id] || C.muted
            const planNama = plans.find(p => p.id === s.plan_id)?.nama?.toUpperCase() ?? s.plan_id.toUpperCase()
            const levelCfg = LEVEL_BY_KEY[s.level] ?? LEVEL_BY_KEY['level3']
            const LevelIcon = levelCfg.icon
            const statusLabel =
              s.is_expired  ? { l: 'EXPIRED', c: C.alert    } :
              !s.is_active  ? { l: 'INACTIVE',c: C.muted    } :
              s.is_trial    ? { l: 'TRIAL',   c: C.primary  } :
                              { l: 'ACTIVE',  c: C.secondary }
            const dLeft = s.days_left
            return (
              <div key={s.id}
                className="grid px-5 py-3.5 border-b items-center group transition-colors"
                style={{ gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 1.2fr auto', borderColor: 'rgba(0,243,255,0.06)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,243,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-1 h-8 flex-shrink-0 rounded-full" style={{ background: pc }} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{s.kontingen_nama}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[8px] font-lcd px-1.5 py-0.5 font-bold"
                        style={{ background: `${statusLabel.c}15`, color: statusLabel.c, border: `1px solid ${statusLabel.c}30` }}>
                        {statusLabel.l}
                      </span>
                      {s.features_add.length > 0 && (
                        <span className="text-[8px] font-mono" style={{ color: C.secondary }}>+{s.features_add.length}</span>
                      )}
                      {s.features_remove.length > 0 && (
                        <span className="text-[8px] font-mono" style={{ color: C.alert }}>-{s.features_remove.length}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-lcd font-bold px-2 py-1"
                    style={{ background: `${pc}15`, color: pc, border: `1px solid ${pc}30` }}>
                    {planNama}
                  </span>
                </div>

                {/* 🆕 LEVEL CELL */}
                <div className="flex items-center gap-1.5">
                  <LevelIcon size={11} style={{ color: levelCfg.color }} />
                  <span className="text-[10px] font-mono font-bold"
                    style={{ color: levelCfg.color }}>
                    {levelCfg.label}
                  </span>
                </div>

                <div>
                  {s.valid_until ? (
                    <>
                      <div className="text-xs font-mono" style={{ color: dLeft !== null && dLeft < 30 ? C.alert : 'rgba(255,255,255,0.65)' }}>
                        {fmtDate(s.valid_until)}
                      </div>
                      {dLeft !== null && (
                        <div className="text-[9px] font-mono mt-0.5" style={{ color: dLeft < 0 ? C.alert : dLeft < 30 ? C.accent : C.muted }}>
                          {dLeft < 0 ? `${Math.abs(dLeft)}h expired` : `${dLeft}h lagi`}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs font-mono font-bold" style={{ color: C.secondary }}>
                      ∞ UNLIMITED
                    </div>
                  )}
                </div>

                <div className="text-center text-[11px] font-mono">
                  <div><span style={{ color: C.primary }}>{s.max_users ?? '∞'}</span> <span style={{ color: C.muted }}>usr</span></div>
                  <div><span style={{ color: C.secondary }}>{s.max_atlet ?? '∞'}</span> <span style={{ color: C.muted }}>atlet</span></div>
                </div>

                <div className="text-[9px] font-mono" style={{ color: C.muted }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{s.features.length}</span> aktif
                  {s.catatan && (
                    <div className="truncate mt-0.5 max-w-[100px]" title={s.catatan}>{s.catatan}</div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(s)}
                    className="p-1.5 border transition-all"
                    style={{ borderColor: `${C.purple}40`, color: C.purple }}>
                    <Edit3 size={11} />
                  </button>
                  <button onClick={() => toggleActive(s)}
                    className="p-1.5 border transition-all"
                    style={{
                      borderColor: s.is_active ? `${C.secondary}40` : C.border,
                      color: s.is_active ? C.secondary : C.muted,
                    }}>
                    {s.is_active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                  </button>
                </div>
              </div>
            )
          })}

          {filtered.length > DEFAULT_SHOW && (
            <div className="px-5 py-3 border-t" style={{ borderColor: C.border }}>
              <button onClick={() => setShowAll(p => !p)}
                className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider transition-all"
                style={{ color: C.primary }}>
                {showAll
                  ? <><ChevronUp size={12} /> COLLAPSE</>
                  : <><ChevronDown size={12} /> EXPAND — {hiddenCount} kontingen tersembunyi</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ MODAL ASSIGN / EDIT ═══════════════════════════════ */}
      {modal !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-3xl flex flex-col font-sci"
            style={{ ...panel, borderColor: `${C.purple}40`, maxHeight: '92vh' }}>

            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
              style={{ borderColor: `${C.purple}20` }}>
              <div>
                <div className="font-lcd font-bold tracking-widest text-sm" style={{ color: C.purple }}>
                  {modal === 'new' ? 'ASSIGN_NEW_PLAN' : 'EDIT_SUBSCRIPTION'}
                </div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: C.muted }}>
                  {modal === 'new' ? 'Pilih kontingen & konfigurasi plan + level' : (modal as SubRow).kontingen_nama}
                </div>
              </div>
              <button onClick={() => setModal(null)}
                className="p-2 border" style={{ borderColor: C.border, color: C.muted }}>
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ scrollbarWidth: 'thin', scrollbarColor: `${C.purple}30 transparent` }}>

              {modal === 'new' && (
                <div>
                  <Label>KONTINGEN *</Label>
                  <select value={form.kontingen_id}
                    onChange={e => setForm(p => ({ ...p, kontingen_id: Number(e.target.value) }))}
                    className="w-full bg-transparent border px-3 py-2 text-xs font-mono text-white outline-none"
                    style={{ borderColor: C.border, background: 'rgba(10,25,47,0.6)' }}>
                    <option value={0} style={{ background: '#0a192f' }}>— Pilih Kontingen —</option>
                    {kontingens.map(k => <option key={k.id} value={k.id} style={{ background: '#0a192f' }}>{k.nama}</option>)}
                  </select>
                </div>
              )}

              {/* Plan selector */}
              <div>
                <Label>PLAN *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {plans.map((pl, i) => {
                    const pc  = planColorMap[pl.id] || planColor(i)
                    const sel = form.plan_id === pl.id
                    return (
                      <button key={pl.id} onClick={() => handlePlanChange(pl.id)}
                        className="p-3 text-left border transition-all"
                        style={{
                          borderColor: sel ? pc : 'rgba(0,243,255,0.1)',
                          background:  sel ? `${pc}10` : 'rgba(255,255,255,0.02)',
                        }}>
                        <div className="font-lcd text-xs font-bold mb-1" style={{ color: pc }}>
                          {pl.nama.toUpperCase()}
                        </div>
                        <div className="text-[9px] font-mono" style={{ color: C.muted }}>
                          {pl.harga_bulan > 0 ? `Rp ${(pl.harga_bulan/1000).toFixed(0)}rb/bln` : 'Custom'}
                          {' · '}{pl.features.length} fitur
                          {' · '}{pl.max_users} user · {pl.max_atlet} atlet
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ═══ 🆕 LEVEL SELECTOR ═══════════════════════ */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>LEVEL TENANT *</Label>
                  <span className="text-[8px] font-mono" style={{ color: C.muted }}>
                    Auto-suggest dari plan · bisa di-override manual
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {LEVEL_OPTIONS.map(lvl => {
                    const sel = form.level === lvl.key
                    const Icon = lvl.icon
                    return (
                      <button key={lvl.key}
                        onClick={() => setForm(p => ({ ...p, level: lvl.key }))}
                        className="p-2.5 text-left border transition-all"
                        style={{
                          borderColor: sel ? lvl.color : 'rgba(255,255,255,0.08)',
                          background:  sel ? `${lvl.color}15` : 'rgba(255,255,255,0.02)',
                        }}
                        title={lvl.desc}>
                        <div className="flex items-center gap-1 mb-1">
                          <Icon size={10} style={{ color: sel ? lvl.color : C.muted }} />
                          <div className="font-lcd text-[9px] font-bold"
                            style={{ color: sel ? lvl.color : C.muted }}>
                            {lvl.label}
                          </div>
                        </div>
                        <div className="text-[7px] font-mono leading-tight"
                          style={{ color: sel ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}>
                          {lvl.desc}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Validity + Quota */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <Label>VALID SAMPAI</Label>
                  <input type="date" value={form.valid_until}
                    onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))}
                    className="w-full bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none"
                    style={{ borderColor: C.border, colorScheme: 'dark' }} />
                  <div className="text-[8px] font-mono mt-1" style={{ color: C.muted }}>Kosong = tidak terbatas</div>
                </div>
                <div>
                  <Label>MAX USER</Label>
                  <input type="number" value={form.max_users}
                    onChange={e => setForm(p => ({ ...p, max_users: e.target.value }))}
                    placeholder={`${plans.find(p=>p.id===form.plan_id)?.max_users ?? '—'}`}
                    className="w-full bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none"
                    style={{ borderColor: C.border }} />
                </div>
                <div>
                  <Label>MAX ATLET</Label>
                  <input type="number" value={form.max_atlet}
                    onChange={e => setForm(p => ({ ...p, max_atlet: e.target.value }))}
                    placeholder={`${plans.find(p=>p.id===form.plan_id)?.max_atlet ?? '—'}`}
                    className="w-full bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none"
                    style={{ borderColor: C.border }} />
                </div>
              </div>

              <div className="flex items-center gap-3 py-2 px-3 border"
                style={{ borderColor: form.is_trial ? `${C.primary}40` : 'rgba(255,255,255,0.06)' }}>
                <button onClick={() => setForm(p => ({ ...p, is_trial: !p.is_trial }))}>
                  {form.is_trial
                    ? <ToggleRight size={22} style={{ color: C.primary }} />
                    : <ToggleLeft  size={22} style={{ color: C.muted  }} />}
                </button>
                <div>
                  <div className="text-xs font-mono text-white">IS_TRIAL</div>
                  <div className="text-[9px] font-mono" style={{ color: C.muted }}>Mode trial — fitur penuh tapi tandai sebagai uji coba</div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Label>FEATURE_OVERRIDE</Label>
                  <div className="flex gap-3 text-[8px] font-mono ml-auto">
                    <span style={{ color: C.secondary }}>● TAMBAH (override +)</span>
                    <span style={{ color: C.alert }}>● KURANGI (override -)</span>
                    <span style={{ color: C.muted }}>● BAWAAN PLAN</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: `${C.purple}20 transparent` }}>
                  {ALL_FEATURES.map(feat => {
                    const inPlan   = planFeatures.includes(feat)
                    const isAdded  = form.features_add.includes(feat)
                    const isRemoved= form.features_remove.includes(feat)
                    const effective = (inPlan && !isRemoved) || isAdded

                    const bgC = isAdded ? `${C.secondary}10` : isRemoved ? `${C.alert}10` : inPlan ? 'rgba(0,243,255,0.04)' : 'rgba(255,255,255,0.02)'
                    const borderC = isAdded ? `${C.secondary}30` : isRemoved ? `${C.alert}30` : inPlan ? 'rgba(0,243,255,0.12)' : 'rgba(255,255,255,0.05)'
                    const textC   = effective ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)'

                    return (
                      <div key={feat}
                        className="flex items-center gap-2 px-2.5 py-1.5"
                        style={{ background: bgC, border: `1px solid ${borderC}` }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: isAdded ? C.secondary : isRemoved ? C.alert : inPlan ? C.primary : 'rgba(255,255,255,0.1)' }} />
                        <span className="flex-1 text-[10px] font-mono" style={{ color: textC }}>{feat}</span>
                        {inPlan && <span className="text-[7px] font-mono" style={{ color: 'rgba(0,243,255,0.4)' }}>PLAN</span>}
                        <button onClick={() => toggleFeatureAdd(feat)}
                          className="text-[8px] font-mono px-1.5 py-0.5 border transition-all"
                          style={{ borderColor: isAdded ? C.secondary : 'rgba(0,255,102,0.2)', color: isAdded ? C.secondary : 'rgba(0,255,102,0.4)' }}>
                          +
                        </button>
                        <button onClick={() => toggleFeatureRemove(feat)}
                          className="text-[8px] font-mono px-1.5 py-0.5 border transition-all"
                          style={{ borderColor: isRemoved ? C.alert : 'rgba(255,51,102,0.2)', color: isRemoved ? C.alert : 'rgba(255,51,102,0.4)' }}>
                          -
                        </button>
                      </div>
                    )
                  })}
                </div>
                {(form.features_add.length > 0 || form.features_remove.length > 0) && (
                  <div className="flex gap-3 mt-2 text-[9px] font-mono">
                    {form.features_add.length > 0 && <span style={{ color: C.secondary }}>+{form.features_add.length} ditambah</span>}
                    {form.features_remove.length > 0 && <span style={{ color: C.alert }}>-{form.features_remove.length} dikurangi</span>}
                  </div>
                )}
              </div>

              <div>
                <Label>CATATAN INTERNAL</Label>
                <textarea value={form.catatan}
                  onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))}
                  rows={2} placeholder="Catatan untuk keperluan audit..."
                  className="w-full bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none resize-none"
                  style={{ borderColor: C.border }} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0"
              style={{ borderColor: `${C.purple}15`, background: 'rgba(0,0,0,0.2)' }}>
              <button onClick={() => setModal(null)} disabled={saving}
                className="px-5 py-2 text-[10px] font-mono border uppercase tracking-wider"
                style={{ borderColor: C.border, color: C.muted }}>
                CANCEL
              </button>
              <button onClick={handleSave}
                disabled={saving || !form.kontingen_id || !form.plan_id}
                className="flex items-center gap-2 px-6 py-2 text-[10px] font-mono border uppercase tracking-wider disabled:opacity-40"
                style={{ borderColor: C.purple, color: C.purple, background: 'rgba(168,85,247,0.1)' }}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                {saving ? 'SAVING...' : modal === 'new' ? 'ASSIGN_PLAN' : 'UPDATE_PLAN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Label({ children }: { children: ReactNode }) {
  return (
    <label className="block text-[9px] font-mono uppercase tracking-widest mb-1.5" style={{ color: '#7a8b9e' }}>
      {children}
    </label>
  )
}
