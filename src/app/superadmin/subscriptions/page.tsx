'use client'
// Superadmin — Kelola Subscription
// src/app/superadmin/subscriptions/page.tsx

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Award, Calendar, CheckCircle,
  ChevronRight, Clock, Edit3, Layers,
  Loader2, Plus, RefreshCw, Search,
  Shield, Star, Trash2, Users, X, Zap,
  AlertTriangle, Package,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { assignPlan, getPlans, type Plan } from '../../../lib/subscriptions'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const C = {
  primary: '#ef4444', secondary: '#f97316', accent: '#fbbf24',
  green: '#10b981', cyan: '#06b6d4', blue: '#3b82f6', muted: '#64748b',
  bg: '#0b0e14', bgCard: '#111827', border: 'rgba(255,255,255,0.07)', text: '#f1f5f9',
}

const PLAN_COLORS: Record<string, string> = {
  basic:      '#3b82f6',
  standard:   '#10b981',
  premium:    '#f59e0b',
  enterprise: '#ef4444',
}
const PLAN_ICONS: Record<string, string> = {
  basic: '🏅', standard: '🥈', premium: '🥇', enterprise: '⚡'
}

interface SubRow {
  id:             string
  kontingen_id:   number
  kontingen_nama: string
  plan_id:        string
  is_active:      boolean
  is_trial:       boolean
  is_expired:     boolean
  valid_until:    string | null
  max_users:      number | null
  max_atlet:      number | null
  features_add:   string[]
  features_remove:string[]
  catatan:        string | null
  created_by:     string | null
  created_at:     string
}

interface AssignForm {
  kontingen_id:   number
  plan_id:        string
  valid_until:    string
  max_users:      string
  max_atlet:      string
  features_add:   string
  features_remove:string
  catatan:        string
}

export default function SubscriptionsPage() {
  const [subs, setSubs]       = useState<SubRow[]>([])
  const [plans, setPlans]     = useState<Plan[]>([])
  const [kontingens, setKontingens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [animIn, setAnimIn]   = useState(false)
  const [search, setSearch]   = useState('')
  const [filterPlan, setFilterPlan] = useState('semua')
  const [modal, setModal]     = useState<SubRow | 'new' | null>(null)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState<AssignForm>({
    kontingen_id: 0, plan_id: 'basic', valid_until: '',
    max_users: '', max_atlet: '', features_add: '', features_remove: '', catatan: '',
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: subData }, planData, { data: kData }] = await Promise.all([
        sb.from('subscriptions')
          .select('*, kontingen(nama)')
          .order('created_at', { ascending: false }),
        getPlans(),
        sb.from('kontingen').select('id, nama').order('nama'),
      ])

      setSubs((subData ?? []).map((s: any) => ({
        id:             s.id,
        kontingen_id:   s.kontingen_id,
        kontingen_nama: s.kontingen?.nama ?? '—',
        plan_id:        s.plan_id,
        is_active:      s.is_active,
        is_trial:       s.is_trial,
        is_expired:     s.valid_until ? new Date(s.valid_until) < new Date() : false,
        valid_until:    s.valid_until,
        max_users:      s.max_users,
        max_atlet:      s.max_atlet,
        features_add:   s.features_add ?? [],
        features_remove:s.features_remove ?? [],
        catatan:        s.catatan,
        created_by:     s.created_by,
        created_at:     s.created_at,
      })))
      setPlans(planData)
      setKontingens(kData ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAll()
    setTimeout(() => setAnimIn(true), 80)
  }, [fetchAll])

  const filtered = useMemo(() => {
    let r = subs
    if (search) r = r.filter(s => s.kontingen_nama.toLowerCase().includes(search.toLowerCase()))
    if (filterPlan !== 'semua') r = r.filter(s => s.plan_id === filterPlan)
    return r
  }, [subs, search, filterPlan])

  const summary = useMemo(() => ({
    total:     subs.length,
    aktif:     subs.filter(s => s.is_active && !s.is_expired).length,
    expired:   subs.filter(s => s.is_expired).length,
    trial:     subs.filter(s => s.is_trial).length,
    premium:   subs.filter(s => s.plan_id === 'premium' || s.plan_id === 'enterprise').length,
  }), [subs])

  function openAssign(sub?: SubRow) {
    if (sub) {
      setForm({
        kontingen_id:   sub.kontingen_id,
        plan_id:        sub.plan_id,
        valid_until:    sub.valid_until ? sub.valid_until.slice(0,10) : '',
        max_users:      sub.max_users?.toString() ?? '',
        max_atlet:      sub.max_atlet?.toString() ?? '',
        features_add:   sub.features_add.join(', '),
        features_remove:sub.features_remove.join(', '),
        catatan:        sub.catatan ?? '',
      })
      setModal(sub)
    } else {
      setForm({ kontingen_id:0, plan_id:'basic', valid_until:'', max_users:'', max_atlet:'', features_add:'', features_remove:'', catatan:'' })
      setModal('new')
    }
  }

  async function handleSave() {
    if (!form.kontingen_id || !form.plan_id) return
    setSaving(true)
    try {
      const res = await assignPlan({
        kontingen_id:     form.kontingen_id,
        plan_id:          form.plan_id,
        valid_until:      form.valid_until || null,
        max_users:        form.max_users ? Number(form.max_users) : undefined,
        max_atlet:        form.max_atlet ? Number(form.max_atlet) : undefined,
        features_add:     form.features_add ? form.features_add.split(',').map(s=>s.trim()).filter(Boolean) : [],
        features_remove:  form.features_remove ? form.features_remove.split(',').map(s=>s.trim()).filter(Boolean) : [],
        catatan:          form.catatan || undefined,
        created_by:       'superadmin',
      })
      if (res.ok) { setModal(null); await fetchAll() }
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(sub: SubRow) {
    await sb.from('subscriptions').update({ is_active: !sub.is_active }).eq('id', sub.id)
    setSubs(prev => prev.map(s => s.id===sub.id ? {...s, is_active:!s.is_active} : s))
  }

  const ani = (d=0) => ({
    style: { transitionDelay:`${d}ms`, transition:'all 0.6s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  const inputStyle = { background:'rgba(255,255,255,0.05)', borderColor:C.border, color:C.text }
  const inputCls   = "w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all"

  return (
    <div className="min-h-screen p-8 space-y-6" style={{ background:C.bg, fontFamily:'Inter,system-ui,sans-serif' }}>

      {/* Header */}
      <div {...ani(0)} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/superadmin"
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors hover:text-white"
            style={{ borderColor:C.border, color:C.muted }}>
            <ArrowLeft size={16}/>
          </Link>
          <div>
            <h1 className="text-xl font-black text-white">Kelola Subscription</h1>
            <p className="text-xs mt-0.5" style={{ color:C.muted }}>
              Assign plan & fitur per kontingen · data real-time
            </p>
          </div>
        </div>
        <button onClick={() => openAssign()}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-white font-bold rounded-xl hover:opacity-90"
          style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
          <Plus size={14}/> Assign Plan Baru
        </button>
      </div>

      {/* KPI */}
      <div {...ani(40)} className="grid grid-cols-5 gap-4">
        {[
          { label:'Total',    value:summary.total,   color:C.secondary, icon:Package   },
          { label:'Aktif',    value:summary.aktif,   color:C.green,     icon:CheckCircle},
          { label:'Expired',  value:summary.expired, color:C.primary,   icon:Clock     },
          { label:'Trial',    value:summary.trial,   color:C.cyan,      icon:Star      },
          { label:'Premium+', value:summary.premium, color:C.accent,    icon:Award     },
        ].map(c => (
          <div key={c.label} className="rounded-2xl p-4 border flex items-center gap-3"
            style={{ background:C.bgCard, borderColor:C.border }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:`${c.color}20` }}>
              <c.icon size={18} style={{ color:c.color }}/>
            </div>
            <div>
              <div className="text-xl font-black text-white">{c.value}</div>
              <div className="text-xs" style={{ color:C.muted }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div {...ani(60)} className="rounded-2xl p-4 border flex gap-3 items-center"
        style={{ background:C.bgCard, borderColor:C.border }}>
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:C.muted }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Cari kontingen..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border outline-none"
            style={{ background:'rgba(255,255,255,0.04)', borderColor:C.border, color:C.text }}/>
        </div>
        <div className="flex gap-1.5">
          {['semua',...plans.map(p=>p.id)].map(p => (
            <button key={p} onClick={() => setFilterPlan(p)}
              className="text-[10px] px-3 py-1.5 rounded-lg border transition-all font-bold"
              style={{
                background: filterPlan===p ? `${PLAN_COLORS[p]??C.secondary}30` : 'rgba(255,255,255,0.04)',
                borderColor: filterPlan===p ? `${PLAN_COLORS[p]??C.secondary}50` : C.border,
                color: filterPlan===p ? (PLAN_COLORS[p]??C.secondary) : C.muted,
              }}>
              {p==='semua' ? 'Semua' : `${PLAN_ICONS[p]??''} ${p}`}
            </button>
          ))}
        </div>
        <button onClick={() => void fetchAll()}
          className="w-9 h-9 rounded-xl border flex items-center justify-center"
          style={{ borderColor:C.border, color:C.muted }}>
          <RefreshCw size={14} className={loading?'animate-spin':''}/>
        </button>
      </div>

      {/* Table */}
      <div {...ani(80)} className="rounded-2xl border overflow-hidden"
        style={{ background:C.bgCard, borderColor:C.border }}>
        <div className="grid px-5 py-3 text-[9px] font-black uppercase tracking-wider"
          style={{ gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto', background:'rgba(255,255,255,0.02)', color:C.muted }}>
          <div>Kontingen</div><div>Plan</div><div>Valid Sampai</div>
          <div className="text-center">Max User</div><div className="text-center">Max Atlet</div>
          <div>Aksi</div>
        </div>

        {loading ? (
          <div className="py-16 text-center"><Loader2 size={24} className="animate-spin mx-auto" style={{ color:C.secondary }}/></div>
        ) : filtered.length===0 ? (
          <div className="py-16 text-center text-sm" style={{ color:C.muted }}>Tidak ada data</div>
        ) : filtered.map(s => {
          const planColor = PLAN_COLORS[s.plan_id] ?? C.muted
          return (
            <div key={s.id}
              className="grid px-5 py-3.5 border-b items-center transition-colors"
              style={{ gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto', borderColor:C.border }}
              onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.02)')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>

              <div>
                <div className="text-sm font-semibold text-white">{s.kontingen_nama}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {!s.is_active && <span className="text-[9px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded">nonaktif</span>}
                  {s.is_trial   && <span className="text-[9px] bg-cyan-900/30 text-cyan-400 px-1.5 py-0.5 rounded">trial</span>}
                  {s.is_expired && <span className="text-[9px] bg-orange-900/30 text-orange-400 px-1.5 py-0.5 rounded">expired</span>}
                  {s.features_add.length>0 && <span className="text-[9px]" style={{ color:C.green }}>+{s.features_add.length} fitur</span>}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background:`${planColor}20`, color:planColor }}>
                  {PLAN_ICONS[s.plan_id]} {s.plan_id}
                </span>
              </div>

              <div className="text-xs" style={{ color:C.muted }}>
                {s.valid_until
                  ? new Date(s.valid_until).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
                  : <span style={{ color:C.green }}>Tidak terbatas</span>}
              </div>

              <div className="text-center text-sm font-bold text-white">
                {s.max_users ?? '∞'}
              </div>
              <div className="text-center text-sm font-bold text-white">
                {s.max_atlet ?? '∞'}
              </div>

              <div className="flex items-center gap-1.5">
                <button onClick={() => openAssign(s)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:text-white"
                  style={{ borderColor:C.border, color:C.muted }}>
                  <Edit3 size={12}/>
                </button>
                <button onClick={() => toggleActive(s)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors"
                  style={{ borderColor:C.border, color:s.is_active?C.green:C.muted }}>
                  {s.is_active ? <CheckCircle size={12}/> : <X size={12}/>}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Assign Plan */}
      {modal !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4"
          style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)' }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden border shadow-2xl"
            style={{ background:C.bgCard, borderColor:C.border }}>

            <div className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor:C.border, background:`linear-gradient(135deg,${C.primary}15,${C.secondary}08)` }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
                  <Package size={16} className="text-white"/>
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">
                    {modal==='new' ? 'Assign Plan Baru' : 'Edit Subscription'}
                  </h3>
                  <p className="text-[10px]" style={{ color:C.muted }}>
                    {modal==='new' ? 'Pilih kontingen & plan' : (modal as SubRow).kontingen_nama}
                  </p>
                </div>
              </div>
              <button onClick={()=>setModal(null)} style={{ color:C.muted }}><X size={16}/></button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Kontingen */}
              {modal==='new' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Kontingen *</label>
                  <select value={form.kontingen_id} onChange={e=>setForm(f=>({...f,kontingen_id:Number(e.target.value)}))}
                    className={inputCls} style={inputStyle}>
                    <option value={0}>— Pilih Kontingen —</option>
                    {kontingens.map(k=><option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </div>
              )}

              {/* Plan */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Plan *</label>
                <div className="grid grid-cols-2 gap-2">
                  {plans.map(p => (
                    <button key={p.id} type="button"
                      onClick={()=>setForm(f=>({...f,plan_id:p.id}))}
                      className="p-3 rounded-xl border text-left transition-all"
                      style={{
                        borderColor: form.plan_id===p.id ? PLAN_COLORS[p.id] : C.border,
                        background: form.plan_id===p.id ? `${PLAN_COLORS[p.id]}20` : 'rgba(255,255,255,0.03)',
                      }}>
                      <div className="text-sm font-bold" style={{ color: PLAN_COLORS[p.id] }}>
                        {PLAN_ICONS[p.id]} {p.nama}
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color:C.muted }}>
                        {p.harga_bulan>0 ? `Rp ${(p.harga_bulan/1000).toFixed(0)}rb/bln` : 'Custom'}
                        {' · '}{p.features.length} fitur
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Valid Until */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>
                  Berlaku Sampai (kosong = tidak terbatas)
                </label>
                <input type="date" value={form.valid_until}
                  onChange={e=>setForm(f=>({...f,valid_until:e.target.value}))}
                  className={inputCls} style={inputStyle}/>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Max User (kosong = ikut plan)</label>
                  <input type="number" value={form.max_users} onChange={e=>setForm(f=>({...f,max_users:e.target.value}))}
                    placeholder={`Default: ${plans.find(p=>p.id===form.plan_id)?.max_users??5}`}
                    className={inputCls} style={inputStyle}/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Max Atlet (kosong = ikut plan)</label>
                  <input type="number" value={form.max_atlet} onChange={e=>setForm(f=>({...f,max_atlet:e.target.value}))}
                    placeholder={`Default: ${plans.find(p=>p.id===form.plan_id)?.max_atlet??50}`}
                    className={inputCls} style={inputStyle}/>
                </div>
              </div>

              {/* Feature override */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>
                  Tambah Fitur (comma-separated, override plan)
                </label>
                <input value={form.features_add}
                  onChange={e=>setForm(f=>({...f,features_add:e.target.value}))}
                  placeholder="contoh: export_pdf, ai_analytics"
                  className={inputCls} style={inputStyle}/>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>
                  Kurangi Fitur (comma-separated)
                </label>
                <input value={form.features_remove}
                  onChange={e=>setForm(f=>({...f,features_remove:e.target.value}))}
                  placeholder="contoh: export_excel"
                  className={inputCls} style={inputStyle}/>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Catatan</label>
                <textarea value={form.catatan}
                  onChange={e=>setForm(f=>({...f,catatan:e.target.value}))}
                  placeholder="Catatan internal..."
                  rows={2} className={`${inputCls} resize-none`} style={inputStyle}/>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor:C.border }}>
              <button onClick={()=>setModal(null)}
                className="px-5 py-2.5 text-sm rounded-xl border" style={{ borderColor:C.border, color:C.muted }}>
                Batal
              </button>
              <button onClick={handleSave} disabled={saving || !form.kontingen_id || !form.plan_id}
                className="flex items-center gap-2 px-5 py-2.5 text-sm text-white font-bold rounded-xl disabled:opacity-50"
                style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
                {saving ? <><Loader2 size={14} className="animate-spin"/>Menyimpan...</> : <><CheckCircle size={14}/>Simpan Plan</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}