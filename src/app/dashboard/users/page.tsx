'use client'
import { useEffect, useState } from 'react'
import {
  Plus, Search, Edit2, Trash2, Eye, EyeOff,
  CheckCircle, XCircle, Shield, Users, ChevronDown
} from 'lucide-react'

const ROLES = [
  { value: 'admin', label: 'Admin', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'konida', label: 'KONIDA', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'operator_cabor', label: 'Operator Cabor', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
]

export default function ManajemenUserPage() {
  const [users, setUsers] = useState<any[]>([])
  const [kontingens, setKontingens] = useState<any[]>([])
  const [cabors, setCabors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('semua')
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    username: '', nama: '', password: '',
    role: 'konida', kontingen_id: '', cabor_id: '', is_active: true,
  })

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [usersRes, kontRes, caborRes] = await Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/master/kontingens').then(r => r.json()).catch(() => []),
      fetch('/api/master/cabors').then(r => r.json()).catch(() => []),
    ])
    setUsers(Array.isArray(usersRes) ? usersRes : [])
    setKontingens(Array.isArray(kontRes) ? kontRes : [])
    setCabors(Array.isArray(caborRes) ? caborRes : [])
    setLoading(false)
  }

  const openAdd = () => {
    setEditUser(null)
    setForm({ username: '', nama: '', password: '', role: 'konida', kontingen_id: '', cabor_id: '', is_active: true })
    setError('')
    setShowModal(true)
  }

  const openEdit = (user: any) => {
    setEditUser(user)
    setForm({
      username: user.username,
      nama: user.nama,
      password: '',
      role: user.role,
      kontingen_id: user.kontingen_id ?? '',
      cabor_id: user.cabor_id ?? '',
      is_active: user.is_active,
    })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      if (editUser) {
        // Update
        const res = await fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editUser.id,
            nama: form.nama,
            password: form.password || undefined,
            is_active: form.is_active,
            kontingen_id: form.kontingen_id || null,
            cabor_id: form.cabor_id || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
      } else {
        // Tambah baru
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: form.username,
            nama: form.nama,
            password: form.password,
            role: form.role,
            kontingen_id: form.kontingen_id || null,
            cabor_id: form.cabor_id || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
      }
      setShowModal(false)
      loadAll()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (user: any) => {
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, is_active: !user.is_active }),
    })
    loadAll()
  }

  const handleDelete = async (user: any) => {
    if (!confirm(`Hapus akun ${user.username}? Tindakan ini tidak bisa dibatalkan!`)) return
    await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id }),
    })
    loadAll()
  }

  const filtered = users.filter(u => {
    const matchSearch =
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.nama?.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'semua' || u.role === filterRole
    return matchSearch && matchRole
  })

  const roleInfo = (role: string) =>
    ROLES.find(r => r.value === role) ?? { label: role, color: 'bg-slate-700 text-slate-400 border-slate-700' }

  const stats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    konida: users.filter(u => u.role === 'konida').length,
    operator: users.filter(u => u.role === 'operator_cabor').length,
    aktif: users.filter(u => u.is_active).length,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-lg font-semibold text-white">Manajemen User</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Kelola akun KONIDA dan Operator Cabor
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2.5 rounded-xl transition-all font-semibold">
          <Plus size={13} /> Tambah User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total User', value: stats.total, icon: Users, color: 'text-white' },
          { label: 'Admin', value: stats.admin, icon: Shield, color: 'text-blue-400' },
          { label: 'KONIDA', value: stats.konida, icon: Users, color: 'text-amber-400' },
          { label: 'Operator', value: stats.operator, icon: Users, color: 'text-emerald-400' },
          { label: 'Aktif', value: stats.aktif, icon: CheckCircle, color: 'text-emerald-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 text-xs">{label}</span>
              <Icon size={14} className={color} />
            </div>
            <div className={`text-2xl font-semibold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Cari username atau nama..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" />
          </div>
          <div className="flex gap-1.5">
            {['semua', 'admin', 'konida', 'operator_cabor'].map(r => (
              <button key={r} onClick={() => setFilterRole(r)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all
                  ${filterRole === r
                    ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                {r === 'semua' ? 'Semua' : r === 'operator_cabor' ? 'Operator' : r === 'konida' ? 'KONIDA' : 'Admin'}
              </button>
            ))}
          </div>
          <div className="ml-auto text-slate-500 text-xs">{filtered.length} user</div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-600 text-sm">
            Tidak ada user ditemukan
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Username', 'Nama', 'Role', 'Kontingen / Cabor', 'Status', 'Aksi'].map(h => (
                    <th key={h} className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const ri = roleInfo(u.role)
                  return (
                    <tr key={u.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-3">
                        <span className="text-white text-xs font-mono font-medium">{u.username}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-200 text-xs">{u.nama}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium ${ri.color}`}>
                          {ri.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">
                        {u.kontingen?.nama ?? u.cabang_olahraga?.nama ?? '—'}
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => handleToggleActive(u)}
                          className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border font-medium transition-all
                            ${u.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'}`}>
                          {u.is_active
                            ? <><CheckCircle size={10} /> Aktif</>
                            : <><XCircle size={10} /> Nonaktif</>}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => openEdit(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                            <Edit2 size={13} />
                          </button>
                          {u.role !== 'admin' && (
                            <button onClick={() => handleDelete(u)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md"
            onClick={e => e.stopPropagation()}>

            <div className="px-6 py-5 border-b border-slate-800">
              <div className="text-white font-semibold text-sm">
                {editUser ? `Edit User — ${editUser.username}` : 'Tambah User Baru'}
              </div>
              <div className="text-slate-500 text-xs mt-0.5">
                {editUser ? 'Kosongkan password jika tidak ingin mengubah' : 'Buat akun KONIDA atau Operator baru'}
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 text-red-400 text-xs">
                  {error}
                </div>
              )}

              {!editUser && (
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                    Username <span className="text-red-400">*</span>
                  </label>
                  <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                    placeholder="contoh: bogor2, subang1"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono transition-all" />
                </div>
              )}

              <div>
                <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                  Nama Lengkap <span className="text-red-400">*</span>
                </label>
                <input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))}
                  placeholder="Nama operator atau KONIDA"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all" />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                  Password {!editUser && <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'}
                    value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder={editUser ? 'Kosongkan jika tidak diubah' : 'Min. 8 karakter'}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {!editUser && (
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                    Role <span className="text-red-400">*</span>
                  </label>
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value, kontingen_id: '', cabor_id: '' }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all">
                    <option value="konida">KONIDA</option>
                    <option value="operator_cabor">Operator Cabor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}

              {(form.role === 'konida' || editUser?.role === 'konida') && (
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                    Kontingen <span className="text-red-400">*</span>
                  </label>
                  <select value={form.kontingen_id}
                    onChange={e => setForm(p => ({ ...p, kontingen_id: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all">
                    <option value="">-- Pilih Kontingen --</option>
                    {kontingens.map((k: any) => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                </div>
              )}

              {(form.role === 'operator_cabor' || editUser?.role === 'operator_cabor') && (
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                    Cabang Olahraga <span className="text-red-400">*</span>
                  </label>
                  <select value={form.cabor_id}
                    onChange={e => setForm(p => ({ ...p, cabor_id: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all">
                    <option value="">-- Pilih Cabor --</option>
                    {cabors.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.nama}</option>
                    ))}
                  </select>
                </div>
              )}

              {editUser && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400 text-xs">Status Akun</span>
                  <button onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                    className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all font-medium
                      ${form.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {form.is_active ? <><CheckCircle size={12} /> Aktif</> : <><XCircle size={12} /> Nonaktif</>}
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex gap-3">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-all">
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : editUser ? 'Simpan Perubahan' : 'Buat Akun'}
              </button>
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm transition-all">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}