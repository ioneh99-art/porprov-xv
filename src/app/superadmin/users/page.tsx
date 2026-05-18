'use client'
// src/app/superadmin/users/page.tsx
// CRUD users — superadmin only

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle, Edit3, Loader2,
  Plus, RefreshCw, Search, Shield,
  Trash2, User, UserCheck, UserX, X,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const C = {
  primary:'#ef4444', secondary:'#f97316',
  bg:'#0b0e14', bgCard:'#111827', border:'rgba(255,255,255,0.07)',
  text:'#f1f5f9', muted:'#64748b', green:'#10b981',
}

const ROLES = ['konida','koni_jabar','penyelenggara','operator_cabor','atlet','superadmin']
const LEVELS = ['level1','level2','level3','koni_jabar','superadmin']

interface UserRow {
  id:           string
  username:     string
  nama:         string
  email:        string | null
  role:         string
  level:        string | null
  kontingen_id: number | null
  kontingen_nama?: string
  cabor_id:     number | null
  is_active:    boolean
  created_at:   string
}

interface UserForm {
  username:     string
  password:     string
  nama:         string
  email:        string
  role:         string
  level:        string
  kontingen_id: string
  cabor_id:     string
  is_active:    boolean
}

const EMPTY_FORM: UserForm = {
  username:'', password:'', nama:'', email:'',
  role:'konida', level:'level3',
  kontingen_id:'', cabor_id:'', is_active:true,
}

export default function SuperadminUsersPage() {
  const [users, setUsers]         = useState<UserRow[]>([])
  const [kontingens, setKontingens] = useState<any[]>([])
  const [cabors, setCabors]       = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterRole, setFilterRole] = useState('semua')
  const [modal, setModal]         = useState<UserRow | 'new' | null>(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [form, setForm]           = useState<UserForm>(EMPTY_FORM)
  const [animIn, setAnimIn]       = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: uData }, { data: kData }, { data: cData }] = await Promise.all([
        sb.from('users').select('*, kontingen(nama)').order('created_at', { ascending:false }),
        sb.from('kontingen').select('id, nama').order('nama'),
        sb.from('cabang_olahraga').select('id, nama').order('nama'),
      ])
      setUsers((uData ?? []).map((u: any) => ({
        ...u, kontingen_nama: u.kontingen?.nama ?? null,
      })))
      setKontingens(kData ?? [])
      setCabors(cData ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void fetchAll(); setTimeout(()=>setAnimIn(true),80) }, [fetchAll])

  const filtered = useMemo(() => {
    let r = users
    if (search) r = r.filter(u =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.nama.toLowerCase().includes(search.toLowerCase())
    )
    if (filterRole !== 'semua') r = r.filter(u => u.role === filterRole)
    return r
  }, [users, search, filterRole])

  const summary = useMemo(() => ({
    total:  users.length,
    aktif:  users.filter(u => u.is_active).length,
    nonaktif: users.filter(u => !u.is_active).length,
    superadmin: users.filter(u => u.role === 'superadmin').length,
  }), [users])

  function openNew() {
    setForm(EMPTY_FORM); setError(''); setModal('new')
  }
  function openEdit(u: UserRow) {
    setForm({
      username: u.username, password: '',
      nama: u.nama, email: u.email ?? '',
      role: u.role, level: u.level ?? 'level3',
      kontingen_id: u.kontingen_id?.toString() ?? '',
      cabor_id: u.cabor_id?.toString() ?? '',
      is_active: u.is_active,
    })
    setError(''); setModal(u)
  }

  async function handleSave() {
    if (!form.username || !form.nama || !form.role) {
      setError('Username, nama, dan role wajib diisi'); return
    }
    if (modal === 'new' && !form.password) {
      setError('Password wajib diisi untuk user baru'); return
    }
    setSaving(true); setError('')
    try {
      const method = modal === 'new' ? 'POST' : 'PUT'
      const body: any = {
        username:     form.username,
        nama:         form.nama,
        email:        form.email || null,
        role:         form.role,
        level:        form.level || null,
        kontingen_id: form.kontingen_id ? Number(form.kontingen_id) : null,
        cabor_id:     form.cabor_id ? Number(form.cabor_id) : null,
        is_active:    form.is_active,
      }
      if (form.password) body.password = form.password
      if (modal !== 'new') body.id = (modal as UserRow).id

      const res  = await fetch('/api/superadmin/users', {
        method,
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal menyimpan'); return }
      setModal(null); await fetchAll()
    } finally { setSaving(false) }
  }

  async function toggleActive(u: UserRow) {
    await fetch('/api/superadmin/users', {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ id: u.id, is_active: !u.is_active }),
    })
    setUsers(prev => prev.map(x => x.id===u.id ? {...x, is_active:!u.is_active} : x))
  }

  const ROLE_COLORS: Record<string,string> = {
    superadmin:'#ef4444', koni_jabar:'#10b981', konida:'#3b82f6',
    penyelenggara:'#f59e0b', operator_cabor:'#8b5cf6', atlet:'#06b6d4',
  }

  const ani = (d=0) => ({
    style:{ transitionDelay:`${d}ms`, transition:'all 0.5s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })
  const inputCls = "w-full px-4 py-2.5 text-sm rounded-xl border outline-none"
  const inputStyle = { background:'rgba(255,255,255,0.05)', borderColor:C.border, color:C.text }

  return (
    <div className="min-h-screen p-8 space-y-6" style={{ background:C.bg }}>

      {/* Header */}
      <div {...ani(0)} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/superadmin"
            className="w-9 h-9 rounded-xl flex items-center justify-center border"
            style={{ borderColor:C.border, color:C.muted }}>
            <ArrowLeft size={16}/>
          </Link>
          <div>
            <h1 className="text-xl font-black text-white">Manajemen User</h1>
            <p className="text-xs mt-0.5" style={{ color:C.muted }}>
              CRUD user · {summary.total} total · {summary.aktif} aktif
            </p>
          </div>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-white font-bold rounded-xl"
          style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
          <Plus size={14}/> Tambah User
        </button>
      </div>

      {/* KPI */}
      <div {...ani(40)} className="grid grid-cols-4 gap-4">
        {[
          { label:'Total User',  value:summary.total,      color:'#f97316', icon:User      },
          { label:'Aktif',       value:summary.aktif,      color:'#10b981', icon:UserCheck },
          { label:'Nonaktif',    value:summary.nonaktif,   color:'#ef4444', icon:UserX     },
          { label:'Superadmin',  value:summary.superadmin, color:'#8b5cf6', icon:Shield    },
        ].map(c => (
          <div key={c.label} className="rounded-2xl p-4 border flex items-center gap-3"
            style={{ background:C.bgCard, borderColor:C.border }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
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
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:C.muted }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Cari username atau nama..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border outline-none"
            style={{ background:'rgba(255,255,255,0.04)', borderColor:C.border, color:C.text }}/>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['semua',...ROLES].map(r => (
            <button key={r} onClick={()=>setFilterRole(r)}
              className="text-[10px] px-3 py-1.5 rounded-lg border font-bold transition-all"
              style={{
                background: filterRole===r ? `${ROLE_COLORS[r]??'#64748b'}25` : 'rgba(255,255,255,0.04)',
                borderColor: filterRole===r ? `${ROLE_COLORS[r]??'#64748b'}50` : C.border,
                color: filterRole===r ? (ROLE_COLORS[r]??'#94a3b8') : C.muted,
              }}>
              {r}
            </button>
          ))}
        </div>
        <button onClick={()=>void fetchAll()}
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
          <div>User</div><div>Role</div><div>Level</div>
          <div>Kontingen</div><div>Status</div><div>Aksi</div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <Loader2 size={24} className="animate-spin mx-auto" style={{ color:C.secondary }}/>
          </div>
        ) : filtered.length===0 ? (
          <div className="py-16 text-center text-sm" style={{ color:C.muted }}>Tidak ada data</div>
        ) : filtered.map(u => (
          <div key={u.id}
            className="grid px-5 py-3.5 border-b items-center transition-colors"
            style={{ gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto', borderColor:C.border }}
            onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.02)')}
            onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>

            <div>
              <div className="text-sm font-semibold text-white">{u.nama}</div>
              <div className="text-[10px] mt-0.5" style={{ color:C.muted }}>
                @{u.username} {u.email && `· ${u.email}`}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background:`${ROLE_COLORS[u.role]??'#64748b'}20`, color:ROLE_COLORS[u.role]??'#94a3b8' }}>
                {u.role}
              </span>
            </div>

            <div className="text-xs" style={{ color:C.muted }}>{u.level ?? '—'}</div>

            <div className="text-xs" style={{ color:C.muted }}>
              {u.kontingen_nama ?? '—'}
            </div>

            <div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                u.is_active ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
              }`}>
                {u.is_active ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button onClick={()=>openEdit(u)}
                className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:text-white"
                style={{ borderColor:C.border, color:C.muted }}>
                <Edit3 size={12}/>
              </button>
              <button onClick={()=>toggleActive(u)}
                className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors"
                style={{ borderColor:C.border, color:u.is_active?'#10b981':C.muted }}
                title={u.is_active?'Nonaktifkan':'Aktifkan'}>
                {u.is_active ? <UserCheck size={12}/> : <UserX size={12}/>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4"
          style={{ background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)' }}>
          <div className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
            style={{ background:C.bgCard, borderColor:C.border }}>

            <div className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor:C.border, background:`linear-gradient(135deg,${C.primary}15,${C.secondary}08)` }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
                  <User size={16} className="text-white"/>
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">
                    {modal==='new' ? 'Tambah User Baru' : `Edit: ${(modal as UserRow).username}`}
                  </h3>
                  <p className="text-[10px]" style={{ color:C.muted }}>
                    {modal==='new' ? 'Isi semua field yang diperlukan' : 'Kosongkan password jika tidak ingin mengubah'}
                  </p>
                </div>
              </div>
              <button onClick={()=>setModal(null)} style={{ color:C.muted }}><X size={16}/></button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="px-4 py-3 rounded-xl text-sm text-red-400"
                  style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Username *</label>
                  <input value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))}
                    placeholder="username" disabled={modal!=='new'}
                    className={inputCls} style={{...inputStyle, opacity:modal!=='new'?0.5:1}}/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>
                    Password {modal!=='new'?'(kosong = tidak berubah)':'*'}
                  </label>
                  <input type="password" value={form.password}
                    onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                    placeholder="••••••••" className={inputCls} style={inputStyle}/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Nama Lengkap *</label>
                  <input value={form.nama} onChange={e=>setForm(f=>({...f,nama:e.target.value}))}
                    placeholder="Nama lengkap" className={inputCls} style={inputStyle}/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Email</label>
                  <input type="email" value={form.email}
                    onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                    placeholder="email@domain.com" className={inputCls} style={inputStyle}/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Role *</label>
                  <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}
                    className={inputCls} style={inputStyle}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Level</label>
                  <select value={form.level} onChange={e=>setForm(f=>({...f,level:e.target.value}))}
                    className={inputCls} style={inputStyle}>
                    <option value="">— Pilih Level —</option>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Kontingen</label>
                  <select value={form.kontingen_id} onChange={e=>setForm(f=>({...f,kontingen_id:e.target.value}))}
                    className={inputCls} style={inputStyle}>
                    <option value="">— Tidak Ada —</option>
                    {kontingens.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Cabang Olahraga</label>
                  <select value={form.cabor_id} onChange={e=>setForm(f=>({...f,cabor_id:e.target.value}))}
                    className={inputCls} style={inputStyle}>
                    <option value="">— Tidak Ada —</option>
                    {cabors.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={form.is_active}
                  onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))}
                  className="w-4 h-4 rounded"/>
                <label htmlFor="is_active" className="text-sm" style={{ color:C.text }}>
                  User aktif (bisa login)
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor:C.border }}>
              <button onClick={()=>setModal(null)}
                className="px-5 py-2.5 text-sm rounded-xl border" style={{ borderColor:C.border, color:C.muted }}>
                Batal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 text-sm text-white font-bold rounded-xl disabled:opacity-50"
                style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
                {saving ? <><Loader2 size={14} className="animate-spin"/>Menyimpan...</> : <><CheckCircle size={14}/>Simpan</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}