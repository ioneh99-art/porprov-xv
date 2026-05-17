'use client'

// Superadmin — Manajemen User
// Real Supabase · src/app/superadmin/users/page.tsx

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, ArrowLeft, CheckCircle, ChevronRight,
  Clock, Edit3, Loader2, Plus, RefreshCw,
  Search, Shield, Trash2, User, UserCheck,
  UserMinus, UserPlus, Users, X, Eye, EyeOff,
  Lock, Key, Layers,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { LEVEL_META, type UserLevel, resolveLevel } from '@/lib/levels'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Warna ────────────────────────────────────────────────
const C = {
  primary: '#ef4444', secondary: '#f97316', accent: '#fbbf24',
  green: '#10b981', cyan: '#06b6d4', blue: '#3b82f6', muted: '#64748b',
  bg: '#0b0e14', bgCard: '#111827', border: 'rgba(255,255,255,0.07)', text: '#f1f5f9',
}

// ─── Types ────────────────────────────────────────────────
type UserRole = 'superadmin' | 'konida' | 'penyelenggara' | 'operator_cabor' | 'atlet'

interface AppUser {
  id: string
  username: string
  nama: string
  email?: string
  role: UserRole
  level: UserLevel
  kontingen_id?: number
  kontingen_nama?: string
  cabor_id?: number
  cabor_nama?: string
  is_active: boolean
  last_sign_in_at?: string
  created_at: string
}

interface Kontingen { id: number; nama: string; level?: string }
interface Cabor { id: number; nama: string }

// ─── Config ───────────────────────────────────────────────
const ROLE_CONF: Record<UserRole, { label: string; color: string; bg: string }> = {
  superadmin:    { label:'Super Admin',  color:'text-red-400',    bg:'bg-red-900/20'    },
  konida:        { label:'KONIDA',       color:'text-blue-400',   bg:'bg-blue-900/20'   },
  penyelenggara: { label:'Penyelenggara',color:'text-orange-400', bg:'bg-orange-900/20' },
  operator_cabor:{ label:'Operator',     color:'text-cyan-400',   bg:'bg-cyan-900/20'   },
  atlet:         { label:'Atlet',        color:'text-green-400',  bg:'bg-green-900/20'  },
}

function timeAgo(d?: string) {
  if (!d) return '—'
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'Baru saja'
  if (m < 60) return `${m} mnt lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  return `${Math.floor(h/24)} hari lalu`
}

// ─── Modal Form ───────────────────────────────────────────
function UserModal({ user, kontingens, cabors, onClose, onSave }: {
  user: AppUser | null   // null = tambah baru
  kontingens: Kontingen[]
  cabors: Cabor[]
  onClose: () => void
  onSave: (data: Partial<AppUser> & { password?: string }) => Promise<void>
}) {
  const [form, setForm] = useState({
    username:     user?.username ?? '',
    nama:         user?.nama ?? '',
    email:        user?.email ?? '',
    role:         user?.role ?? 'konida' as UserRole,
    level:        user?.level ?? 'level3' as UserLevel,
    kontingen_id: user?.kontingen_id ?? '',
    cabor_id:     user?.cabor_id ?? '',
    is_active:    user?.is_active ?? true,
    password:     '',
  })
  const [saving, setSaving] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [err, setErr] = useState('')

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.username || !form.nama) { setErr('Username dan nama wajib diisi'); return }
    if (!user && !form.password) { setErr('Password wajib untuk user baru'); return }
    setSaving(true); setErr('')
    try {
      await onSave({
        ...form,
        kontingen_id: form.kontingen_id ? Number(form.kontingen_id) : undefined,
        cabor_id: form.cabor_id ? Number(form.cabor_id) : undefined,
        password: form.password || undefined,
      })
      onClose()
    } catch (e: any) {
      setErr(e.message ?? 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all"
  const inputStyle = { background:'rgba(255,255,255,0.05)', borderColor: C.border, color: C.text }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4"
      style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden border shadow-2xl"
        style={{ background: C.bgCard, borderColor: C.border }}>

        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: C.border, background:`linear-gradient(135deg,${C.primary}15,${C.secondary}08)` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
              {user ? <Edit3 size={16} className="text-white"/> : <UserPlus size={16} className="text-white"/>}
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">{user ? 'Edit User' : 'Tambah User Baru'}</h3>
              <p className="text-[10px]" style={{ color: C.muted }}>{user ? user.username : 'Isi data lengkap'}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: C.muted }}><X size={16}/></button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {err && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium"
              style={{ background:`${C.primary}15`, border:`1px solid ${C.primary}30`, color: C.primary }}>
              <AlertTriangle size={13}/> {err}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>
                Username *
              </label>
              <input value={form.username} onChange={e => set('username', e.target.value)}
                placeholder="username" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>
                Nama Lengkap *
              </label>
              <input value={form.nama} onChange={e => set('nama', e.target.value)}
                placeholder="Nama lengkap" className={inputCls} style={inputStyle} />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>
                Email
              </label>
              <input value={form.email} onChange={e => set('email', e.target.value)}
                type="email" placeholder="email@example.com" className={inputCls} style={inputStyle} />
            </div>

            {/* Password */}
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>
                {user ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'}
              </label>
              <div className="relative">
                <input value={form.password} onChange={e => set('password', e.target.value)}
                  type={showPass ? 'text' : 'password'}
                  placeholder={user ? '••••••••' : 'Min. 8 karakter'}
                  className={`${inputCls} pr-10`} style={inputStyle} />
                <button type="button" onClick={() => setShowPass(p=>!p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }}>
                  {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>
                Role
              </label>
              <select value={form.role} onChange={e => set('role', e.target.value)}
                className={inputCls} style={inputStyle}>
                {Object.entries(ROLE_CONF).map(([k,v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>
                Level Akses
              </label>
              <select value={form.level} onChange={e => set('level', e.target.value)}
                className={inputCls} style={inputStyle}>
                {(['superadmin','level1','level2','level3'] as const).map(l => (
                  <option key={l} value={l}>
                    {l === 'superadmin' ? '⚡ Super Admin' : `${LEVEL_META[l].icon} ${LEVEL_META[l].label}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>
                Kontingen
              </label>
              <select value={form.kontingen_id} onChange={e => set('kontingen_id', e.target.value)}
                className={inputCls} style={inputStyle}>
                <option value="">— Tidak ada —</option>
                {kontingens.map(k => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>
                Cabang Olahraga
              </label>
              <select value={form.cabor_id} onChange={e => set('cabor_id', e.target.value)}
                className={inputCls} style={inputStyle}>
                <option value="">— Tidak ada —</option>
                {cabors.map(c => (
                  <option key={c.id} value={c.id}>{c.nama}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-10 h-5 rounded-full transition-all relative ${form.is_active ? 'bg-green-500' : 'bg-gray-700'}`}
                  onClick={() => set('is_active', !form.is_active)}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_active ? 'left-5' : 'left-0.5'}`} />
                </div>
                <span className="text-sm" style={{ color: C.text }}>
                  Akun <span className={form.is_active ? 'text-green-400' : 'text-red-400'}>{form.is_active ? 'Aktif' : 'Dinonaktifkan'}</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: C.border }}>
          <button onClick={onClose} className="px-5 py-2.5 text-sm rounded-xl border transition-colors"
            style={{ borderColor: C.border, color: C.muted }}>
            Batal
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm text-white font-bold rounded-xl transition-all disabled:opacity-50"
            style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
            {saving ? <><Loader2 size={14} className="animate-spin"/> Menyimpan...</> : <><CheckCircle size={14}/> Simpan</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────
export default function ManajemenUser() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [kontingens, setKontingens] = useState<Kontingen[]>([])
  const [cabors, setCabors] = useState<Cabor[]>([])
  const [loading, setLoading] = useState(true)
  const [animIn, setAnimIn] = useState(false)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<UserRole|'semua'>('semua')
  const [filterLevel, setFilterLevel] = useState<UserLevel|'semua'>('semua')
  const [modalUser, setModalUser] = useState<AppUser|null|undefined>(undefined) // undefined=hidden
  const [confirmDelete, setConfirmDelete] = useState<AppUser|null>(null)
  const reqRef = { current: 0 }

  // ─── Fetch ─────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    const id = ++reqRef.current
    setLoading(true)
    try {
      const [{ data: usersData }, { data: kData }, { data: cData }] = await Promise.all([
        sb.from('users')
          .select('id,username,nama,email,role,level,kontingen_id,cabor_id,is_active,last_sign_in_at,created_at,kontingen(nama),cabang_olahraga(nama)')
          .order('created_at', { ascending: false }),
        sb.from('kontingen').select('id,nama,level').order('nama'),
        sb.from('cabang_olahraga').select('id,nama').order('nama'),
      ])
      if (id !== reqRef.current) return

      const mapped: AppUser[] = (usersData ?? []).map((u: any) => ({
        id:             u.id,
        username:       u.username,
        nama:           u.nama,
        email:          u.email,
        role:           u.role as UserRole,
        level:          (u.level ?? resolveLevel(u.role, u.kontingen_id)) as UserLevel,
        kontingen_id:   u.kontingen_id,
        kontingen_nama: u.kontingen?.nama,
        cabor_id:       u.cabor_id,
        cabor_nama:     u.cabang_olahraga?.nama,
        is_active:      u.is_active ?? true,
        last_sign_in_at:u.last_sign_in_at,
        created_at:     u.created_at,
      }))

      setUsers(mapped)
      setKontingens(kData ?? [])
      setCabors(cData ?? [])
    } finally {
      if (id === reqRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAll()
    const t = setTimeout(() => setAnimIn(true), 80)
    return () => clearTimeout(t)
  }, [fetchAll])

  // ─── Save user (insert/update) ──────────────────────────
  async function handleSave(data: Partial<AppUser> & { password?: string }) {
    const { password, ...userData } = data

    if (modalUser) {
      // Update
      const { error } = await sb.from('users').update({
        username: userData.username,
        nama: userData.nama,
        email: userData.email,
        role: userData.role,
        level: userData.level,
        kontingen_id: userData.kontingen_id ?? null,
        cabor_id: userData.cabor_id ?? null,
        is_active: userData.is_active,
      }).eq('id', modalUser.id)
      if (error) throw error

      // Update password jika diisi
      if (password) {
        const { error: pwErr } = await sb.rpc('update_user_password', {
          user_id: modalUser.id, new_password: password
        })
        if (pwErr) throw pwErr
      }
    } else {
      // Insert baru
      const { error } = await sb.from('users').insert({
        username: userData.username,
        nama: userData.nama,
        email: userData.email,
        role: userData.role,
        level: userData.level,
        kontingen_id: userData.kontingen_id ?? null,
        cabor_id: userData.cabor_id ?? null,
        is_active: userData.is_active ?? true,
        password_hash: password, // auth.js akan hash
      })
      if (error) throw error
    }
    await fetchAll()
  }

  // ─── Toggle active ──────────────────────────────────────
  async function toggleActive(user: AppUser) {
    await sb.from('users').update({ is_active: !user.is_active }).eq('id', user.id)
    setUsers(prev => prev.map(u => u.id===user.id ? {...u, is_active:!u.is_active} : u))
  }

  // ─── Delete ─────────────────────────────────────────────
  async function handleDelete(user: AppUser) {
    await sb.from('users').delete().eq('id', user.id)
    setUsers(prev => prev.filter(u => u.id !== user.id))
    setConfirmDelete(null)
  }

  // ─── Filter ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = users
    if (search) r = r.filter(u =>
      u.nama.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.kontingen_nama ?? '').toLowerCase().includes(search.toLowerCase())
    )
    if (filterRole  !== 'semua') r = r.filter(u => u.role === filterRole)
    if (filterLevel !== 'semua') r = r.filter(u => u.level === filterLevel)
    return r
  }, [users, search, filterRole, filterLevel])

  const summary = useMemo(() => ({
    total:   users.length,
    aktif:   users.filter(u => u.is_active).length,
    nonaktif:users.filter(u => !u.is_active).length,
    baru:    users.filter(u => {
      const d = new Date(u.created_at)
      return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000
    }).length,
  }), [users])

  const ani = (d=0) => ({
    style: { transitionDelay:`${d}ms`, transition:'all 0.6s cubic-bezier(0.16,1,0.3,1)' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  return (
    <div className="min-h-screen p-8 font-sans space-y-6" style={{ background: C.bg }}>

      {/* Header */}
      <div {...ani(0)} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/superadmin"
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors hover:text-white"
            style={{ borderColor: C.border, color: C.muted }}>
            <ArrowLeft size={16}/>
          </Link>
          <div>
            <h1 className="text-xl font-black text-white">Manajemen User</h1>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>
              {users.length} user terdaftar · data real-time dari Supabase
            </p>
          </div>
        </div>
        <button onClick={() => setModalUser(null)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-white font-bold rounded-xl transition-all hover:opacity-90"
          style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
          <UserPlus size={15}/> Tambah User
        </button>
      </div>

      {/* KPI */}
      <div {...ani(40)} className="grid grid-cols-4 gap-4">
        {[
          { label:'Total User',  value:summary.total,    color:C.secondary, icon:Users   },
          { label:'Aktif',       value:summary.aktif,    color:C.green,     icon:UserCheck },
          { label:'Nonaktif',    value:summary.nonaktif, color:C.primary,   icon:UserMinus },
          { label:'Baru (7 hr)', value:summary.baru,     color:C.cyan,      icon:UserPlus  },
        ].map(c => (
          <div key={c.label} className="rounded-2xl p-5 border flex items-center gap-4"
            style={{ background: C.bgCard, borderColor: C.border }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:`${c.color}20` }}>
              <c.icon size={20} style={{ color: c.color }}/>
            </div>
            <div>
              <div className="text-2xl font-black text-white">{c.value}</div>
              <div className="text-xs" style={{ color: C.muted }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div {...ani(60)} className="rounded-2xl p-4 border flex flex-wrap gap-3 items-center"
        style={{ background: C.bgCard, borderColor: C.border }}>
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama / username / kontingen..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border outline-none"
            style={{ background:'rgba(255,255,255,0.04)', borderColor: C.border, color: C.text }}/>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['semua', ...Object.keys(ROLE_CONF)] as const).map(r => (
            <button key={r} onClick={() => setFilterRole(r as any)}
              className="text-xs px-3 py-1.5 rounded-lg border transition-all font-medium"
              style={{
                background: filterRole===r ? `${C.secondary}25` : 'rgba(255,255,255,0.04)',
                borderColor: filterRole===r ? `${C.secondary}50` : C.border,
                color: filterRole===r ? C.secondary : C.muted,
              }}>
              {r==='semua' ? 'Semua Role' : ROLE_CONF[r as UserRole].label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 ml-auto">
          {(['semua','level1','level2','level3'] as const).map(l => (
            <button key={l} onClick={() => setFilterLevel(l)}
              className="text-xs px-3 py-1.5 rounded-lg border transition-all font-medium"
              style={{
                background: filterLevel===l ? `${C.primary}25` : 'rgba(255,255,255,0.04)',
                borderColor: filterLevel===l ? `${C.primary}50` : C.border,
                color: filterLevel===l ? C.primary : C.muted,
              }}>
              {l==='semua' ? 'Semua Level' : `${LEVEL_META[l].icon} ${LEVEL_META[l].label.split('·')[0].trim()}`}
            </button>
          ))}
        </div>
        <button onClick={() => void fetchAll()}
          className="w-9 h-9 rounded-xl border flex items-center justify-center transition-colors"
          style={{ borderColor: C.border, color: C.muted }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>
        </button>
      </div>

      <p className="text-xs px-1" style={{ color: C.muted }}>{filtered.length} user ditemukan</p>

      {/* User Table */}
      <div {...ani(80)} className="rounded-2xl border overflow-hidden"
        style={{ background: C.bgCard, borderColor: C.border }}>

        {/* Table head */}
        <div className="grid px-6 py-3 text-[9px] font-black uppercase tracking-wider"
          style={{ gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr auto', background:'rgba(255,255,255,0.02)', color: C.muted }}>
          <div>User</div><div>Role</div><div>Level</div>
          <div>Kontingen / Cabor</div><div>Login Terakhir</div><div>Status</div><div>Aksi</div>
        </div>

        <div className="divide-y" style={{ borderColor: C.border }}>
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 size={24} className="animate-spin mx-auto mb-2" style={{ color: C.secondary }}/>
              <p className="text-sm" style={{ color: C.muted }}>Memuat data user...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={32} className="mx-auto mb-2 opacity-30" style={{ color: C.muted }}/>
              <p className="text-sm" style={{ color: C.muted }}>Tidak ada user ditemukan</p>
            </div>
          ) : filtered.map(u => {
            const rc = ROLE_CONF[u.role] ?? ROLE_CONF.konida
            const lm = u.level !== 'superadmin' ? LEVEL_META[u.level as UserLevel] : null
            return (
              <div key={u.id}
                className="grid px-6 py-4 items-center transition-colors"
                style={{ gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr auto' }}
                onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background='transparent')}>

                {/* User info */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{ background:`linear-gradient(135deg,${C.primary}80,${C.secondary}80)` }}>
                    {u.nama.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{u.nama}</div>
                    <div className="text-[10px] font-mono truncate" style={{ color: C.muted }}>@{u.username}</div>
                    {u.email && <div className="text-[9px] truncate" style={{ color:`${C.muted}80` }}>{u.email}</div>}
                  </div>
                </div>

                <div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${rc.bg} ${rc.color}`}>
                    {rc.label}
                  </span>
                </div>

                <div>
                  {u.level === 'superadmin' ? (
                    <span className="text-[10px] font-bold text-red-400">⚡ SA</span>
                  ) : lm ? (
                    <span className="text-[10px] font-bold" style={{ color: u.level==='level1'?C.accent:u.level==='level2'?C.muted:C.blue }}>
                      {lm.icon} {lm.label.split('·')[0].trim()}
                    </span>
                  ) : null}
                </div>

                <div className="min-w-0">
                  {u.kontingen_nama && (
                    <div className="text-xs text-white truncate">{u.kontingen_nama}</div>
                  )}
                  {u.cabor_nama && (
                    <div className="text-[10px] truncate" style={{ color: C.muted }}>{u.cabor_nama}</div>
                  )}
                  {!u.kontingen_nama && !u.cabor_nama && (
                    <span style={{ color:`${C.muted}50` }}>—</span>
                  )}
                </div>

                <div className="text-xs" style={{ color: C.muted }}>
                  {timeAgo(u.last_sign_in_at)}
                </div>

                <div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    u.is_active
                      ? 'bg-emerald-900/30 text-emerald-400'
                      : 'bg-red-900/20 text-red-400'
                  }`}>
                    {u.is_active ? '● Aktif' : '○ Nonaktif'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button onClick={() => setModalUser(u)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:text-white"
                    style={{ borderColor: C.border, color: C.muted }}
                    title="Edit">
                    <Edit3 size={12}/>
                  </button>
                  <button onClick={() => toggleActive(u)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors"
                    style={{ borderColor: C.border, color: u.is_active ? C.green : C.muted }}
                    title={u.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                    {u.is_active ? <UserCheck size={12}/> : <UserMinus size={12}/>}
                  </button>
                  {u.role !== 'superadmin' && (
                    <button onClick={() => setConfirmDelete(u)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:text-red-400 hover:border-red-800"
                      style={{ borderColor: C.border, color: C.muted }}
                      title="Hapus">
                      <Trash2 size={12}/>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal */}
      {modalUser !== undefined && (
        <UserModal
          user={modalUser}
          kontingens={kontingens}
          cabors={cabors}
          onClose={() => setModalUser(undefined)}
          onSave={handleSave}
        />
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4"
          style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden border shadow-2xl"
            style={{ background: C.bgCard, borderColor: C.border }}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background:`${C.primary}20` }}>
                <Trash2 size={24} style={{ color: C.primary }}/>
              </div>
              <h3 className="text-white font-bold mb-2">Hapus User?</h3>
              <p className="text-sm mb-6" style={{ color: C.muted }}>
                User <b className="text-white">{confirmDelete.nama}</b> (@{confirmDelete.username}) akan dihapus permanen.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 text-sm rounded-xl border"
                  style={{ borderColor: C.border, color: C.muted }}>
                  Batal
                </button>
                <button onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 py-2.5 text-sm text-white font-bold rounded-xl"
                  style={{ background:`linear-gradient(135deg,${C.primary},#dc2626)` }}>
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}