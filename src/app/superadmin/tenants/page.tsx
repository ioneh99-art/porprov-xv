'use client'
// src/app/superadmin/tenants/page.tsx
// TENANT CONFIG MANAGER — edit branding, slug, plan, login page per tenant

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  CheckCircle, Edit3, Eye, Globe, Loader2, KeyRound,
  Plus, RefreshCw, Save, Shield, Sliders,
  ToggleLeft, ToggleRight, X, Palette, UserPlus,
  Link, Monitor, Settings, Trash2, AlertTriangle,
  ExternalLink, Copy, User, Users, UserX,
} from 'lucide-react'
import { PLAN_FEATURES } from '@/lib/features'

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

const PLAN_COLOR: Record<string, string> = {
  enterprise: '#a855f7',
  premium:    '#00f3ff',
  standard:   '#00ff66',
  basic:      '#7a8b9e',
}

const PLAN_FEATURES_LIST = PLAN_FEATURES

const DASHBOARD_TYPES = ['standard','war_room','koni_exec','superadmin','basic','premium','bekasi','bogor','depok']
const THEMES          = ['dark','light'] as const
const LAYOUTS         = ['split','centered','minimal'] as const
const LEVELS          = ['superadmin','koni_jabar','level1','level2','level3']
const PLANS           = ['basic','standard','premium','enterprise']

interface Tenant {
  id:              string
  kontingen_id:    number | null
  nama:            string
  nama_pendek:     string
  color_primary:   string
  color_secondary: string
  color_accent:    string
  logo_url:        string
  tagline:         string
  login_slug:      string
  login_title:     string
  login_subtitle:  string
  login_hero_text: string
  login_theme:     'dark' | 'light'
  login_layout:    'split' | 'centered' | 'minimal'
  dashboard_type:  string
  level:           string
  plan_id:         string
  login_stats:     any[]
  login_venues:    any[]
  is_active:       boolean
}

interface Kontingen { id: number; nama: string }

const EMPTY_TENANT: Omit<Tenant,'id'> = {
  kontingen_id: null, nama: '', nama_pendek: '', tagline: '',
  color_primary: '00f3ff', color_secondary: '00ff66', color_accent: 'ffb000',
  logo_url: '', login_slug: '', login_title: 'Masuk ke Portal',
  login_subtitle: 'Sistem Informasi PORPROV XV', login_hero_text: '',
  login_theme: 'dark', login_layout: 'split', dashboard_type: 'standard',
  level: 'level2', plan_id: 'basic', login_stats: [], login_venues: [], is_active: true,
}

type ModalTab = 'identity' | 'branding' | 'login' | 'system' | 'users'

const USER_ROLES  = ['konida','operator_cabor','koni_jabar','penyelenggara','superadmin']
const USER_LEVELS = ['level1','level2','level3','koni_jabar','superadmin']

interface UserRow {
  id:           string
  username:     string
  nama:         string
  email:        string | null
  role:         string
  level:        string | null
  kontingen_id: number | null
  is_active:    boolean
  created_at:   string
}

interface UserForm {
  username:  string
  password:  string
  nama:      string
  email:     string
  role:      string
  level:     string
  is_active: boolean
}

const EMPTY_USER: UserForm = {
  username: '', password: '', nama: '', email: '',
  role: 'konida', level: 'level2', is_active: true,
}

function tc(hex: string) { return hex.startsWith('#') ? hex : `#${hex}` }

// ── Inline color input ───────────────────────────────────
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = tc(value)
  return (
    <div>
      <label className="block text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: C.muted }}>{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8 flex-shrink-0 cursor-pointer border" style={{ border: `1px solid ${C.border}` }}>
          <input type="color" value={hex}
            onChange={e => onChange(e.target.value.replace('#', ''))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <div className="w-full h-full" style={{ background: hex }} />
        </div>
        <input value={value} onChange={e => onChange(e.target.value.replace('#', ''))}
          className="flex-1 bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none"
          style={{ borderColor: C.border }}
          placeholder="hex without #" maxLength={6} />
        <div className="w-5 h-5 flex-shrink-0 rounded-sm" style={{ background: hex }} />
      </div>
    </div>
  )
}

// ── Login preview card ────────────────────────────────────
function LoginPreview({ t }: { t: Partial<Tenant> }) {
  const primary = tc(t.color_primary || '00f3ff')
  const bg      = t.login_theme === 'light' ? '#f8fafc' : '#0a0f1a'
  const textC   = t.login_theme === 'light' ? '#111' : '#f1f5f9'
  return (
    <div className="rounded-xl overflow-hidden text-[10px] font-mono scale-[0.85] origin-top" style={{ background: bg, border: `2px solid ${primary}30`, minHeight: 180 }}>
      <div className="h-1" style={{ background: `linear-gradient(90deg,${primary},${tc(t.color_secondary||'00ff66')})` }} />
      <div className="p-4">
        <div className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center text-base" style={{ background: `${primary}20`, border: `1px solid ${primary}40` }}>
          🏆
        </div>
        <div className="font-bold text-sm mb-0.5" style={{ color: primary }}>{t.login_title || 'TITLE'}</div>
        <div className="text-[9px] mb-3 opacity-60" style={{ color: textC }}>{t.login_subtitle || 'subtitle'}</div>
        <div className="h-6 rounded" style={{ background: `${primary}15`, border: `1px solid ${primary}30` }} />
        <div className="h-5 rounded mt-2" style={{ background: `${primary}15`, border: `1px solid ${primary}30` }} />
        <div className="h-7 rounded mt-3 flex items-center justify-center text-[9px] font-bold"
          style={{ background: primary, color: '#000' }}>LOGIN</div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function TenantsPage() {
  const [tenants,    setTenants]    = useState<Tenant[]>([])
  const [kontingens, setKontingens] = useState<Kontingen[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [search,     setSearch]     = useState('')
  const [editing,    setEditing]    = useState<Tenant | null>(null)
  const [isNew,      setIsNew]      = useState(false)
  const [tab,        setTab]        = useState<ModalTab>('identity')
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null)
  const [animIn,     setAnimIn]     = useState(false)
  const [confirmDel,    setConfirmDel]    = useState<string | null>(null)
  // ── Users tab state ─────────────────────────────────
  const [tenantUsers,   setTenantUsers]   = useState<UserRow[]>([])
  const [loadingUsers,  setLoadingUsers]  = useState(false)
  const [savingUser,    setSavingUser]    = useState(false)
  const [editingUser,   setEditingUser]   = useState<UserRow | null>(null)
  const [userForm,      setUserForm]      = useState<UserForm>(EMPTY_USER)
  const [showUserForm,  setShowUserForm]  = useState(false)
  const [confirmDelUser,setConfirmDelUser]= useState<string | null>(null)

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 2800)
  }

  async function load() {
    setLoading(true)
    const [tRes, kRes] = await Promise.all([
      sb.from('tenants').select('*').order('nama'),
      sb.from('kontingen').select('id,nama').order('nama'),
    ])
    if (tRes.data) setTenants(tRes.data as Tenant[])
    if (kRes.data) setKontingens(kRes.data as Kontingen[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const displayed = useMemo(() => {
    if (!search) return tenants
    const q = search.toLowerCase()
    return tenants.filter(t =>
      t.nama.toLowerCase().includes(q) ||
      t.login_slug.toLowerCase().includes(q) ||
      t.plan_id.toLowerCase().includes(q)
    )
  }, [tenants, search])

  function openEdit(t: Tenant) {
    setEditing({ ...t })
    setIsNew(false)
    setTab('identity')
    setTenantUsers([])
    setShowUserForm(false)
  }

  function openNew() {
    setEditing({ id: crypto.randomUUID(), ...EMPTY_TENANT } as Tenant)
    setIsNew(true)
    setTab('identity')
  }

  function closeModal() { setEditing(null); setTenantUsers([]) }

  async function loadUsers(kontingenId: number | null) {
    if (!kontingenId) { setTenantUsers([]); return }
    setLoadingUsers(true)
    const { data } = await sb.from('users')
      .select('id,username,nama,email,role,level,kontingen_id,is_active,created_at')
      .eq('kontingen_id', kontingenId)
      .order('nama')
    setTenantUsers((data || []) as UserRow[])
    setLoadingUsers(false)
  }

  async function saveUser() {
    if (!editing || !userForm.username || !userForm.nama) return
    setSavingUser(true)
    try {
      if (editingUser) {
        const payload: any = {
          username: userForm.username, nama: userForm.nama, email: userForm.email || null,
          role: userForm.role, level: userForm.level, is_active: userForm.is_active,
        }
        if (userForm.password) payload.password = userForm.password
        const { error } = await sb.from('users').update(payload).eq('id', editingUser.id)
        if (error) throw error
        showToast(`User "${userForm.nama}" diupdate`)
      } else {
        const { error } = await sb.from('users').insert({
          username: userForm.username, password: userForm.password,
          nama: userForm.nama, email: userForm.email || null,
          role: userForm.role, level: userForm.level,
          kontingen_id: editing.kontingen_id, is_active: userForm.is_active,
        })
        if (error) throw error
        showToast(`User "${userForm.nama}" dibuat`)
      }
      await loadUsers(editing.kontingen_id)
      setShowUserForm(false)
      setEditingUser(null)
      setUserForm(EMPTY_USER)
    } catch (e: any) {
      showToast(e.message || 'Gagal menyimpan user', false)
    } finally {
      setSavingUser(false)
    }
  }

  async function toggleUserActive(u: UserRow) {
    await sb.from('users').update({ is_active: !u.is_active }).eq('id', u.id)
    setTenantUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !u.is_active } : x))
  }

  async function deleteUser(id: string) {
    const { error } = await sb.from('users').delete().eq('id', id)
    if (error) { showToast(error.message, false); return }
    setTenantUsers(prev => prev.filter(u => u.id !== id))
    setConfirmDelUser(null)
    showToast('User dihapus')
  }

  function openNewUser() {
    setEditingUser(null)
    setUserForm(EMPTY_USER)
    setShowUserForm(true)
  }

  function openEditUser(u: UserRow) {
    setEditingUser(u)
    setUserForm({ username: u.username, password: '', nama: u.nama, email: u.email || '', role: u.role, level: u.level || 'level2', is_active: u.is_active })
    setShowUserForm(true)
  }

  function patch(field: keyof Tenant, value: any) {
    setEditing(prev => prev ? { ...prev, [field]: value } : prev)
  }

  async function save() {
    if (!editing) return
    setSaving(true)
    try {
      if (isNew) {
        const { error } = await sb.from('tenants').insert(editing)
        if (error) throw error
        showToast(`Tenant "${editing.nama}" berhasil dibuat`)
      } else {
        const { error } = await sb.from('tenants').update(editing).eq('id', editing.id)
        if (error) throw error
        showToast(`Tenant "${editing.nama}" berhasil diupdate`)
      }
      await load()
      closeModal()
    } catch (e: any) {
      showToast(e.message || 'Gagal menyimpan', false)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(t: Tenant) {
    const next = !t.is_active
    await sb.from('tenants').update({ is_active: next }).eq('id', t.id)
    setTenants(prev => prev.map(x => x.id === t.id ? { ...x, is_active: next } : x))
    showToast(`${t.nama}: ${next ? 'ACTIVATED' : 'DEACTIVATED'}`, next)
  }

  async function deleteTenant(id: string) {
    const { error } = await sb.from('tenants').delete().eq('id', id)
    if (error) { showToast(error.message, false); return }
    setTenants(prev => prev.filter(t => t.id !== id))
    setConfirmDel(null)
    showToast('Tenant dihapus')
  }

  function copySlugLink(slug: string) {
    const url = `${window.location.origin}/login/${slug}`
    navigator.clipboard.writeText(url)
    showToast('Link login di-copy ke clipboard')
  }

  const panel = {
    background: C.bg, border: `1px solid ${C.border}`,
    backdropFilter: 'blur(10px)', boxShadow: `inset 0 0 20px rgba(0,243,255,0.03)`,
  }

  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.5s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5 font-sci min-h-screen" style={{ color: '#f1f5f9' }}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] px-4 py-3 text-xs font-mono border backdrop-blur-md animate-in fade-in"
          style={{
            background: toast.ok ? 'rgba(0,255,102,0.1)' : 'rgba(255,51,102,0.1)',
            borderColor: toast.ok ? C.secondary : C.alert,
            color: toast.ok ? C.secondary : C.alert,
          }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div {...ani(0)} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border flex items-center justify-center relative"
            style={{ borderColor: C.purple, background: 'rgba(168,85,247,0.08)' }}>
            <div className="absolute inset-0 animate-pulse" style={{ background: 'rgba(168,85,247,0.08)' }} />
            <Globe size={18} style={{ color: C.purple }} className="z-10" />
          </div>
          <div>
            <h1 className="font-lcd font-bold text-xl tracking-widest" style={{ color: C.purple, textShadow: `0 0 12px ${C.purple}` }}>
              TENANT_CONFIG_MANAGER
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: C.muted }}>
              Branding · Login page · Plan · Feature flags · {tenants.length} tenant terdaftar
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tenant..."
            className="bg-transparent border px-3 py-1.5 text-xs font-mono outline-none w-40"
            style={{ borderColor: C.border, color: '#f1f5f9' }} />
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono border uppercase tracking-wider transition-all disabled:opacity-40"
            style={{ borderColor: C.border, color: C.muted }}>
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-mono border uppercase tracking-wider transition-all"
            style={{ borderColor: C.secondary, color: C.secondary, background: 'rgba(0,255,102,0.06)' }}>
            <Plus size={12} /> NEW_TENANT
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div {...ani(40)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'TOTAL_TENANT',  v: tenants.length,                               c: C.purple },
          { l: 'ACTIVE',        v: tenants.filter(t => t.is_active).length,       c: C.secondary },
          { l: 'ENTERPRISE',    v: tenants.filter(t => t.plan_id==='enterprise').length, c: '#a855f7' },
          { l: 'NO_KONTINGEN',  v: tenants.filter(t => !t.kontingen_id).length,   c: C.accent },
        ].map(s => (
          <div key={s.l} className="p-3 relative overflow-hidden" style={panel}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: s.c }} />
            <div className="text-[8px] font-lcd uppercase tracking-wider mb-1" style={{ color: C.muted }}>{s.l}</div>
            <div className="font-lcd font-bold text-2xl" style={{ color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Tenant grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin" style={{ color: C.primary }} />
        </div>
      ) : (
        <div {...ani(80)} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map(t => {
            const primary = tc(t.color_primary)
            const planC   = PLAN_COLOR[t.plan_id] || C.muted
            const kNama   = kontingens.find(k => k.id === t.kontingen_id)?.nama

            return (
              <div key={t.id} className="relative overflow-hidden transition-all hover:scale-[1.01]"
                style={{ ...panel, borderColor: t.is_active ? C.border : 'rgba(255,255,255,0.08)', opacity: t.is_active ? 1 : 0.6 }}>

                {/* Color bar */}
                <div className="h-1.5"
                  style={{ background: `linear-gradient(90deg,${primary},${tc(t.color_secondary)},${tc(t.color_accent)})` }} />

                <div className="p-4">
                  {/* Top row */}
                  <div className="flex items-start gap-3 mb-3">
                    {/* Color swatch */}
                    <div className="w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center text-lg font-bold"
                      style={{ background: `${primary}20`, border: `1px solid ${primary}40`, color: primary }}>
                      {t.nama_pendek?.slice(0, 2).toUpperCase() || 'T'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="text-[8px] font-lcd px-1.5 py-0.5 font-bold"
                          style={{ background: `${planC}15`, color: planC, border: `1px solid ${planC}30` }}>
                          {t.plan_id.toUpperCase()}
                        </span>
                        {!t.is_active && (
                          <span className="text-[8px] font-lcd px-1.5 py-0.5" style={{ background: 'rgba(255,255,255,0.05)', color: C.muted }}>
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-sm text-white truncate">{t.nama}</div>
                      <div className="text-[9px] font-mono" style={{ color: C.muted }}>/{t.login_slug}</div>
                    </div>
                  </div>

                  {/* Info rows */}
                  <div className="space-y-1 mb-3 text-[9px] font-mono">
                    <div className="flex justify-between">
                      <span style={{ color: C.muted }}>KONTINGEN</span>
                      <span className="text-white truncate ml-2 max-w-[140px]">{kNama || '— unlinked'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: C.muted }}>DASHBOARD</span>
                      <span style={{ color: C.primary }}>{t.dashboard_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: C.muted }}>THEME</span>
                      <span style={{ color: t.login_theme === 'dark' ? C.primary : C.accent }}>
                        {t.login_theme} / {t.login_layout}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: C.muted }}>FEATURES</span>
                      <span style={{ color: planC }}>
                        {((PLAN_FEATURES_LIST as any)[t.plan_id] || []).length} flags
                      </span>
                    </div>
                  </div>

                  {/* Feature pills (top 4) */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {((PLAN_FEATURES_LIST as any)[t.plan_id] || []).slice(0, 5).map((f: string) => (
                      <span key={f} className="text-[7px] font-mono px-1.5 py-0.5"
                        style={{ background: `${planC}10`, color: planC, border: `1px solid ${planC}20` }}>
                        {f}
                      </span>
                    ))}
                    {((PLAN_FEATURES_LIST as any)[t.plan_id] || []).length > 5 && (
                      <span className="text-[7px] font-mono px-1.5 py-0.5" style={{ color: C.muted }}>
                        +{((PLAN_FEATURES_LIST as any)[t.plan_id] || []).length - 5}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-2 border-t" style={{ borderColor: 'rgba(0,243,255,0.08)' }}>
                    <button onClick={() => openEdit(t)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-mono border uppercase tracking-wide transition-all"
                      style={{ borderColor: C.purple, color: C.purple, background: 'rgba(168,85,247,0.06)' }}>
                      <Edit3 size={10} /> EDIT
                    </button>
                    <button onClick={() => copySlugLink(t.login_slug)}
                      className="px-2.5 py-1.5 border transition-all"
                      style={{ borderColor: C.border, color: C.muted }}
                      title="Copy login URL">
                      <Copy size={10} />
                    </button>
                    <button onClick={() => window.open(`/login/${t.login_slug}`, '_blank')}
                      className="px-2.5 py-1.5 border transition-all"
                      style={{ borderColor: C.border, color: C.muted }}
                      title="Open login page">
                      <ExternalLink size={10} />
                    </button>
                    <button onClick={() => toggleActive(t)}
                      className="px-2.5 py-1.5 border transition-all"
                      style={{
                        borderColor: t.is_active ? `${C.secondary}40` : C.border,
                        color: t.is_active ? C.secondary : C.muted,
                      }}
                      title={t.is_active ? 'Deactivate' : 'Activate'}>
                      {t.is_active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                    </button>
                    <button onClick={() => setConfirmDel(t.id)}
                      className="px-2.5 py-1.5 border transition-all"
                      style={{ borderColor: `${C.alert}30`, color: C.alert }}
                      title="Delete tenant">
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="p-6 max-w-sm w-full font-mono" style={{ ...panel, borderColor: `${C.alert}40` }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} style={{ color: C.alert }} />
              <span className="font-lcd text-sm font-bold" style={{ color: C.alert }}>CONFIRM_DELETE</span>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Tenant <strong className="text-white">{tenants.find(t=>t.id===confirmDel)?.nama}</strong> akan dihapus permanen. Aksi ini tidak bisa di-undo.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 py-2 text-[10px] border uppercase tracking-wider"
                style={{ borderColor: C.border, color: C.muted }}>
                CANCEL
              </button>
              <button onClick={() => deleteTenant(confirmDel)}
                className="flex-1 py-2 text-[10px] border uppercase tracking-wider"
                style={{ borderColor: C.alert, color: C.alert, background: 'rgba(255,51,102,0.08)' }}>
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ─────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-4xl flex flex-col" style={{ ...panel, borderColor: `${C.purple}40`, maxHeight: '92vh' }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
              style={{ borderColor: `${C.purple}20` }}>
              <div>
                <div className="font-lcd font-bold tracking-widest text-sm" style={{ color: C.purple }}>
                  {isNew ? 'CREATE_TENANT' : 'EDIT_TENANT'}
                </div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: C.muted }}>
                  {editing.login_slug || 'new-slug'} · {editing.plan_id}
                </div>
              </div>
              <button onClick={closeModal}
                className="p-2 border transition-all"
                style={{ borderColor: C.border, color: C.muted }}>
                <X size={14} />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b flex-shrink-0" style={{ borderColor: `${C.purple}20` }}>
              {([
                { k: 'identity', l: 'IDENTITY',  icon: Settings  },
                { k: 'branding', l: 'BRANDING',  icon: Palette   },
                { k: 'login',    l: 'LOGIN_PAGE', icon: Monitor   },
                { k: 'system',   l: 'SYSTEM',     icon: Sliders   },
                { k: 'users',    l: 'USERS',      icon: Users     },
              ] as const).map(t => (
                <button key={t.k} onClick={() => { setTab(t.k); if (t.k === 'users') loadUsers(editing?.kontingen_id ?? null) }}
                  className="flex items-center gap-1.5 px-4 py-3 text-[10px] font-mono uppercase tracking-wider transition-all border-b-2"
                  style={{
                    color: tab === t.k ? C.purple : C.muted,
                    borderBottomColor: tab === t.k ? C.purple : 'transparent',
                    background: tab === t.k ? `${C.purple}08` : 'transparent',
                  }}>
                  <t.icon size={11} /> {t.l}
                </button>
              ))}
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin', scrollbarColor: `${C.purple}30 transparent` }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">

                {/* ── IDENTITY TAB ─────────────────────────── */}
                {tab === 'identity' && (
                  <>
                    <Field label="Nama Lengkap" value={editing.nama} onChange={v => patch('nama', v)} required />
                    <Field label="Nama Pendek (badge)" value={editing.nama_pendek} onChange={v => patch('nama_pendek', v)} />
                    <Field label="Login Slug (URL key)" value={editing.login_slug} onChange={v => patch('login_slug', v.toLowerCase().replace(/\s/g,''))} mono required
                      hint={`/login/${editing.login_slug || '...'}`} />
                    <Field label="Tagline" value={editing.tagline} onChange={v => patch('tagline', v)} />
                    <div>
                      <label className="block text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: C.muted }}>
                        Kontingen (link ke DB)
                      </label>
                      <select value={editing.kontingen_id ?? ''} onChange={e => patch('kontingen_id', e.target.value ? Number(e.target.value) : null)}
                        className="w-full bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none"
                        style={{ borderColor: C.border, background: 'rgba(10,25,47,0.6)' }}>
                        <option value="" style={{ background: '#0a192f' }}>— Tidak di-link ke kontingen</option>
                        {kontingens.map(k => (
                          <option key={k.id} value={k.id} style={{ background: '#0a192f' }}>{k.nama}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: C.muted }}>Level</label>
                      <select value={editing.level} onChange={e => patch('level', e.target.value)}
                        className="w-full bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none"
                        style={{ borderColor: C.border, background: 'rgba(10,25,47,0.6)' }}>
                        {LEVELS.map(l => <option key={l} value={l} style={{ background: '#0a192f' }}>{l}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {/* ── BRANDING TAB ─────────────────────────── */}
                {tab === 'branding' && (
                  <>
                    <div className="space-y-4">
                      <ColorField label="Primary Color" value={editing.color_primary} onChange={v => patch('color_primary', v)} />
                      <ColorField label="Secondary Color" value={editing.color_secondary} onChange={v => patch('color_secondary', v)} />
                      <ColorField label="Accent Color" value={editing.color_accent} onChange={v => patch('color_accent', v)} />
                      <Field label="Logo URL" value={editing.logo_url} onChange={v => patch('logo_url', v)} mono />
                    </div>
                    {/* Live preview */}
                    <div>
                      <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: C.muted }}>
                        LIVE_PREVIEW
                      </div>
                      <LoginPreview t={editing} />
                      {/* Color palette strip */}
                      <div className="flex gap-2 mt-3">
                        {[editing.color_primary, editing.color_secondary, editing.color_accent].map((c, i) => (
                          <div key={i} className="flex-1 h-6 rounded" style={{ background: tc(c || 'ffffff') }} />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ── LOGIN PAGE TAB ────────────────────────── */}
                {tab === 'login' && (
                  <>
                    <div className="space-y-4">
                      <Field label="Login Title" value={editing.login_title} onChange={v => patch('login_title', v)} />
                      <Field label="Login Subtitle" value={editing.login_subtitle} onChange={v => patch('login_subtitle', v)} />
                      <div>
                        <label className="block text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: C.muted }}>Login Hero Text</label>
                        <textarea value={editing.login_hero_text} onChange={e => patch('login_hero_text', e.target.value)}
                          rows={3}
                          className="w-full bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none resize-none"
                          style={{ borderColor: C.border }} />
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: C.muted }}>Theme</label>
                        <div className="flex gap-2">
                          {THEMES.map(t => (
                            <button key={t} onClick={() => patch('login_theme', t)}
                              className="flex-1 py-1.5 text-[10px] font-mono border uppercase tracking-wider transition-all"
                              style={{
                                borderColor: editing.login_theme === t ? C.primary : C.border,
                                color: editing.login_theme === t ? C.primary : C.muted,
                                background: editing.login_theme === t ? `${C.primary}10` : 'transparent',
                              }}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: C.muted }}>Layout</label>
                        <div className="flex gap-2">
                          {LAYOUTS.map(l => (
                            <button key={l} onClick={() => patch('login_layout', l)}
                              className="flex-1 py-1.5 text-[10px] font-mono border uppercase tracking-wider transition-all"
                              style={{
                                borderColor: editing.login_layout === l ? C.accent : C.border,
                                color: editing.login_layout === l ? C.accent : C.muted,
                                background: editing.login_layout === l ? `${C.accent}10` : 'transparent',
                              }}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Preview */}
                    <div>
                      <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: C.muted }}>LIVE_PREVIEW</div>
                      <LoginPreview t={editing} />
                    </div>
                  </>
                )}

                {/* ── SYSTEM TAB ──────────────────────────── */}
                {tab === 'system' && (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: C.muted }}>Plan ID</label>
                        <div className="grid grid-cols-2 gap-2">
                          {PLANS.map(p => (
                            <button key={p} onClick={() => patch('plan_id', p)}
                              className="py-2 text-[10px] font-mono border uppercase tracking-wider transition-all"
                              style={{
                                borderColor: editing.plan_id === p ? (PLAN_COLOR[p] || C.primary) : C.border,
                                color: editing.plan_id === p ? (PLAN_COLOR[p] || C.primary) : C.muted,
                                background: editing.plan_id === p ? `${PLAN_COLOR[p] || C.primary}10` : 'transparent',
                              }}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: C.muted }}>Dashboard Type</label>
                        <select value={editing.dashboard_type} onChange={e => patch('dashboard_type', e.target.value)}
                          className="w-full bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none"
                          style={{ borderColor: C.border, background: 'rgba(10,25,47,0.6)' }}>
                          {DASHBOARD_TYPES.map(d => <option key={d} value={d} style={{ background: '#0a192f' }}>{d}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center justify-between p-3 border"
                        style={{ borderColor: editing.is_active ? `${C.secondary}30` : C.border }}>
                        <div>
                          <div className="text-xs font-mono text-white">IS_ACTIVE</div>
                          <div className="text-[9px]" style={{ color: C.muted }}>Tenant aktif & dapat diakses user</div>
                        </div>
                        <button onClick={() => patch('is_active', !editing.is_active)}>
                          {editing.is_active
                            ? <ToggleRight size={28} style={{ color: C.secondary }} />
                            : <ToggleLeft size={28} style={{ color: C.muted }} />}
                        </button>
                      </div>
                    </div>

                    {/* Features dari plan */}
                    <div>
                      <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: C.muted }}>
                        FEATURES — {editing.plan_id.toUpperCase()} PLAN
                      </div>
                      <div className="space-y-1 max-h-56 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${C.purple}20 transparent` }}>
                        {Object.values(
                          Object.fromEntries(
                            Object.entries(PLAN_FEATURES_LIST).map(([plan, feats]) => [plan, feats])
                          )
                        ).reduce((acc: string[], feats) => {
                          feats.forEach((f: string) => { if (!acc.includes(f)) acc.push(f) })
                          return acc
                        }, []).map((feat: string) => {
                          const has = ((PLAN_FEATURES_LIST as any)[editing.plan_id] || []).includes(feat)
                          return (
                            <div key={feat} className="flex items-center gap-2 py-1 px-2"
                              style={{ background: has ? `${PLAN_COLOR[editing.plan_id]}06` : 'rgba(255,255,255,0.02)', border: `1px solid ${has ? PLAN_COLOR[editing.plan_id]+'25' : 'rgba(255,255,255,0.05)'}` }}>
                              {has
                                ? <CheckCircle size={10} style={{ color: PLAN_COLOR[editing.plan_id] || C.secondary }} />
                                : <div className="w-2.5 h-2.5 rounded-full border" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />}
                              <span className="text-[9px] font-mono" style={{ color: has ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)' }}>
                                {feat}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="text-[8px] font-mono mt-2" style={{ color: C.muted }}>
                        Ubah fitur custom → gunakan halaman Subscriptions
                      </div>
                    </div>
                  </>
                )}
              </div>

                {/* ── USERS TAB ──────────────────────────────── */}
                {tab === 'users' && (
                  <div className="col-span-2">
                    {/* No kontingen warning */}
                    {!editing?.kontingen_id && (
                      <div className="p-4 border text-xs font-mono" style={{ borderColor: `${C.accent}40`, background: `${C.accent}08`, color: C.accent }}>
                        ⚠ Tenant ini belum di-link ke kontingen. Set Kontingen ID di tab IDENTITY terlebih dahulu untuk mengelola user.
                      </div>
                    )}

                    {editing?.kontingen_id && (
                      <>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-[9px] font-mono uppercase tracking-widest" style={{ color: C.muted }}>
                            {tenantUsers.length} USER · kontingen_id={editing.kontingen_id}
                          </div>
                          <button onClick={openNewUser}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono border uppercase tracking-wider"
                            style={{ borderColor: C.secondary, color: C.secondary, background: 'rgba(0,255,102,0.06)' }}>
                            <UserPlus size={11} /> ADD_USER
                          </button>
                        </div>

                        {/* Inline user form */}
                        {showUserForm && (
                          <div className="p-4 mb-3 border" style={{ borderColor: `${C.purple}40`, background: 'rgba(168,85,247,0.04)' }}>
                            <div className="text-[9px] font-lcd uppercase tracking-widest mb-3" style={{ color: C.purple }}>
                              {editingUser ? 'EDIT_USER' : 'CREATE_USER'}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <InlineField label="Username *" value={userForm.username} onChange={v => setUserForm(p=>({...p,username:v}))} mono />
                              <InlineField label={editingUser ? 'Password baru (kosongkan=tidak ubah)' : 'Password *'} value={userForm.password} onChange={v => setUserForm(p=>({...p,password:v}))} mono type="password" />
                              <InlineField label="Nama Lengkap *" value={userForm.nama} onChange={v => setUserForm(p=>({...p,nama:v}))} />
                              <InlineField label="Email" value={userForm.email} onChange={v => setUserForm(p=>({...p,email:v}))} />
                              <div>
                                <label className="block text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: C.muted }}>Role</label>
                                <select value={userForm.role} onChange={e => setUserForm(p=>({...p,role:e.target.value}))}
                                  className="w-full bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none"
                                  style={{ borderColor: C.border, background: 'rgba(10,25,47,0.6)' }}>
                                  {USER_ROLES.map(r => <option key={r} value={r} style={{ background: '#0a192f' }}>{r}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: C.muted }}>Level</label>
                                <select value={userForm.level} onChange={e => setUserForm(p=>({...p,level:e.target.value}))}
                                  className="w-full bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none"
                                  style={{ borderColor: C.border, background: 'rgba(10,25,47,0.6)' }}>
                                  {USER_LEVELS.map(l => <option key={l} value={l} style={{ background: '#0a192f' }}>{l}</option>)}
                                </select>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-2">
                                <button onClick={() => setUserForm(p=>({...p,is_active:!p.is_active}))}>
                                  {userForm.is_active
                                    ? <ToggleRight size={20} style={{ color: C.secondary }} />
                                    : <ToggleLeft  size={20} style={{ color: C.muted    }} />}
                                </button>
                                <span className="text-[10px] font-mono" style={{ color: C.muted }}>Active</span>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => { setShowUserForm(false); setEditingUser(null); setUserForm(EMPTY_USER) }}
                                  className="px-3 py-1.5 text-[10px] font-mono border uppercase tracking-wider"
                                  style={{ borderColor: C.border, color: C.muted }}>CANCEL</button>
                                <button onClick={saveUser} disabled={savingUser || !userForm.username || !userForm.nama}
                                  className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-mono border uppercase tracking-wider disabled:opacity-40"
                                  style={{ borderColor: C.purple, color: C.purple, background: 'rgba(168,85,247,0.1)' }}>
                                  {savingUser ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                                  {savingUser ? 'SAVING...' : editingUser ? 'UPDATE' : 'CREATE'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* User list */}
                        {loadingUsers ? (
                          <div className="flex items-center justify-center h-24">
                            <Loader2 size={18} className="animate-spin" style={{ color: C.primary }} />
                          </div>
                        ) : tenantUsers.length === 0 ? (
                          <div className="text-center py-10">
                            <Users size={28} className="mx-auto mb-2 opacity-20" style={{ color: C.primary }} />
                            <div className="text-xs font-mono" style={{ color: C.muted }}>Belum ada user untuk kontingen ini</div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {tenantUsers.map(u => (
                              <div key={u.id} className="flex items-center gap-3 px-3 py-2 border"
                                style={{ borderColor: u.is_active ? 'rgba(0,243,255,0.12)' : 'rgba(255,255,255,0.05)', background: u.is_active ? 'rgba(0,243,255,0.03)' : 'rgba(255,255,255,0.01)', opacity: u.is_active ? 1 : 0.5 }}>
                                <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center text-[10px] font-bold font-lcd"
                                  style={{ background: 'rgba(0,243,255,0.1)', color: C.primary, border: `1px solid ${C.primary}30` }}>
                                  {u.nama[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-white font-semibold">{u.nama}</div>
                                  <div className="text-[9px] font-mono" style={{ color: C.muted }}>@{u.username} · {u.role} · {u.level}</div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => toggleUserActive(u)} title={u.is_active ? 'Deactivate' : 'Activate'}
                                    className="p-1.5 border transition-all"
                                    style={{ borderColor: u.is_active ? `${C.secondary}30` : C.border, color: u.is_active ? C.secondary : C.muted }}>
                                    {u.is_active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                                  </button>
                                  <button onClick={() => openEditUser(u)} title="Edit"
                                    className="p-1.5 border transition-all"
                                    style={{ borderColor: `${C.purple}30`, color: C.purple }}>
                                    <Edit3 size={11} />
                                  </button>
                                  <button onClick={() => setConfirmDelUser(u.id)} title="Delete"
                                    className="p-1.5 border transition-all"
                                    style={{ borderColor: `${C.alert}30`, color: C.alert }}>
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Confirm delete user */}
                        {confirmDelUser && (
                          <div className="mt-3 p-3 border" style={{ borderColor: `${C.alert}40`, background: `${C.alert}06` }}>
                            <div className="text-[10px] font-mono mb-2" style={{ color: C.alert }}>
                              Hapus user <strong className="text-white">{tenantUsers.find(u=>u.id===confirmDelUser)?.nama}</strong>?
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setConfirmDelUser(null)}
                                className="flex-1 py-1.5 text-[10px] border uppercase tracking-wider font-mono"
                                style={{ borderColor: C.border, color: C.muted }}>CANCEL</button>
                              <button onClick={() => deleteUser(confirmDelUser)}
                                className="flex-1 py-1.5 text-[10px] border uppercase tracking-wider font-mono"
                                style={{ borderColor: C.alert, color: C.alert, background: 'rgba(255,51,102,0.08)' }}>DELETE</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0"
              style={{ borderColor: `${C.purple}15`, background: 'rgba(0,0,0,0.2)' }}>
              <button onClick={closeModal} disabled={saving}
                className="px-5 py-2 text-[10px] font-mono border uppercase tracking-wider transition-all disabled:opacity-40"
                style={{ borderColor: C.border, color: C.muted }}>
                CANCEL
              </button>
              <button onClick={save} disabled={saving || !editing.nama || !editing.login_slug}
                className="flex items-center gap-2 px-6 py-2 text-[10px] font-mono border uppercase tracking-wider transition-all disabled:opacity-40"
                style={{ borderColor: C.purple, color: C.purple, background: 'rgba(168,85,247,0.1)' }}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {saving ? 'SAVING...' : isNew ? 'CREATE_TENANT' : 'SAVE_CHANGES'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Generic text field ────────────────────────────────────
// Compact field for users tab
function InlineField({ label, value, onChange, mono, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; mono?: boolean; type?: string
}) {
  return (
    <div>
      <label className="block text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: 'rgba(122,139,158,1)' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className={`w-full bg-transparent border px-2 py-1.5 text-xs text-white outline-none ${mono ? 'font-mono' : ''}`}
        style={{ borderColor: 'rgba(0,243,255,0.2)' }} />
    </div>
  )
}

function Field({
  label, value, onChange, required, mono, hint,
}: {
  label: string; value: string; onChange: (v: string) => void
  required?: boolean; mono?: boolean; hint?: string
}) {
  return (
    <div>
      <label className="block text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: 'rgba(122,139,158,1)' }}>
        {label}{required && <span style={{ color: '#ff3366' }}> *</span>}
      </label>
      <input value={value} onChange={e => onChange(e.target.value)}
        className={`w-full bg-transparent border px-2 py-1.5 text-xs text-white outline-none ${mono ? 'font-mono' : ''}`}
        style={{ borderColor: 'rgba(0,243,255,0.2)' }} />
      {hint && <div className="text-[8px] font-mono mt-0.5" style={{ color: 'rgba(122,139,158,0.7)' }}>{hint}</div>}
    </div>
  )
}
