'use client'
import { useEffect, useState } from 'react'
import { Eye, EyeOff, Save, User, Shield, Key, CheckCircle } from 'lucide-react'

export default function ProfilPage({ accentColor = 'blue' }: { accentColor?: string }) {
  const [me, setMe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [showLama, setShowLama] = useState(false)
  const [showBaru, setShowBaru] = useState(false)
  const [showKonfirmasi, setShowKonfirmasi] = useState(false)
  const [form, setForm] = useState({
    password_lama: '',
    password_baru: '',
    konfirmasi: '',
  })

  const accent = {
    blue: { btn: 'bg-blue-600 hover:bg-blue-500', badge: 'bg-blue-600', ring: 'focus:border-blue-500' },
    amber: { btn: 'bg-amber-600 hover:bg-amber-500', badge: 'bg-amber-500/20 text-amber-400', ring: 'focus:border-amber-500' },
    emerald: { btn: 'bg-emerald-600 hover:bg-emerald-500', badge: 'bg-emerald-500/20 text-emerald-400', ring: 'focus:border-emerald-500' },
  }[accentColor] ?? { btn: 'bg-blue-600 hover:bg-blue-500', badge: 'bg-blue-600', ring: 'focus:border-blue-500' }

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      setMe(data)
      setLoading(false)
    })
  }, [])

  const handleGantiPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (form.password_baru !== form.konfirmasi) {
      setError('Password baru dan konfirmasi tidak cocok')
      return
    }
    if (form.password_baru.length < 8) {
      setError('Password baru minimal 8 karakter')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password_lama: form.password_lama,
          password_baru: form.password_baru,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess('Password berhasil diubah!')
      setForm({ password_lama: '', password_baru: '', konfirmasi: '' })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const roleLabel = (role: string) => {
    if (role === 'admin') return 'Administrator PORPROV XV'
    if (role === 'konida') return 'KONIDA'
    if (role === 'operator_cabor') return 'Operator Cabor'
    return role
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-slate-500/30 border-t-slate-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl">
      <div className="mb-7">
        <h1 className="text-lg font-semibold text-white">Profil Akun</h1>
        <p className="text-slate-500 text-xs mt-0.5">Informasi akun dan keamanan</p>
      </div>

      {/* Info Profil */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center">
            <User size={24} className="text-slate-400" />
          </div>
          <div>
            <div className="text-white text-base font-semibold">{me?.nama}</div>
            <div className="text-slate-500 text-xs mt-0.5">{roleLabel(me?.role)}</div>
            {me?.kontingen_nama && (
              <div className="text-slate-500 text-xs">{me.kontingen_nama}</div>
            )}
            {me?.cabor_nama && (
              <div className="text-slate-500 text-xs">{me.cabor_nama}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Username', value: me?.username, icon: User },
            { label: 'Role', value: roleLabel(me?.role), icon: Shield },
            me?.kontingen_nama && { label: 'Kontingen', value: me.kontingen_nama, icon: Shield },
            me?.cabor_nama && { label: 'Cabang Olahraga', value: me.cabor_nama, icon: Shield },
          ].filter(Boolean).map((item: any) => (
            <div key={item.label} className="bg-slate-800/50 rounded-xl px-4 py-3">
              <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">
                {item.label}
              </div>
              <div className="text-slate-200 text-sm font-medium">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ganti Password */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Key size={15} className="text-slate-400" />
          <div className="text-white text-sm font-medium">Ganti Password</div>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-4">
            <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
            <span className="text-emerald-400 text-xs">{success}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleGantiPassword} className="space-y-4">
          {[
            { label: 'Password Lama', key: 'password_lama', show: showLama, toggle: () => setShowLama(!showLama) },
            { label: 'Password Baru', key: 'password_baru', show: showBaru, toggle: () => setShowBaru(!showBaru) },
            { label: 'Konfirmasi Password Baru', key: 'konfirmasi', show: showKonfirmasi, toggle: () => setShowKonfirmasi(!showKonfirmasi) },
          ].map(({ label, key, show, toggle }) => (
            <div key={key}>
              <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                {label} <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={`Masukkan ${label.toLowerCase()}`}
                  required
                  className={`w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-200 placeholder-slate-600 focus:outline-none ${accent.ring} transition-all`}
                />
                <button type="button" onClick={toggle}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          ))}

          <div className="bg-slate-800/50 rounded-xl px-4 py-3 text-slate-500 text-xs">
            💡 Password minimal 8 karakter. Gunakan kombinasi huruf, angka, dan simbol untuk keamanan lebih baik.
          </div>

          <button type="submit" disabled={saving}
            className={`flex items-center gap-2 ${accent.btn} disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all`}>
            {saving
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save size={13} />}
            {saving ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </form>
      </div>
    </div>
  )
}