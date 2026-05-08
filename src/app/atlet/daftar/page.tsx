//

'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function AtletDaftarPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    no_ktp: '',
    email: '',
    password: '',
    konfirmasi: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.konfirmasi) {
      setError('Password dan konfirmasi tidak cocok')
      return
    }
    if (form.password.length < 8) {
      setError('Password minimal 8 karakter')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/atlet/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          no_ktp: form.no_ktp,
          email: form.email,
          password: form.password,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Terjadi kesalahan')
        setLoading(false)
        return
      }
      setSuccess(`Akun berhasil dibuat untuk ${data.nama}! Silakan login.`)
      setTimeout(() => router.push('/atlet/login'), 2500)
    } catch {
      setError('Tidak dapat terhubung ke server')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Kiri */}
      <div className="hidden lg:flex w-[55%] bg-slate-900 border-r border-slate-800 flex-col items-center justify-center px-16 relative overflow-hidden">
        <div className="absolute top-[-100px] left-[-100px] w-80 h-80 rounded-full bg-emerald-600/5" />
        <div className="relative z-10 mb-8">
          <img src="/logo-porprov.png" alt="PORPROV XV" className="w-56 h-56 object-contain" />
        </div>
        <div className="relative z-10 text-center mb-6">
          <div className="text-white text-lg font-semibold mb-2">Buat Akun Atlet</div>
          <div className="text-slate-500 text-sm leading-relaxed">
            Daftarkan dirimu dan mulai<br />bangun profil prestasi resmi
          </div>
        </div>
        <div className="relative z-10 flex flex-col gap-3 w-full max-w-xs">
          {[
            'Profil prestasi digital resmi',
            'Track record kejuaraan verified',
            'Pantau perkembangan performamu',
            'Diakui oleh KONI Jawa Barat',
          ].map(item => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
              <span className="text-slate-400 text-sm">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Kanan */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-emerald-400 text-[10px] font-semibold tracking-wider">
              DAFTAR ATLET · PORPROV XV
            </span>
          </div>

          <h1 className="text-white text-2xl font-semibold mb-1">Buat akun atlet</h1>
          <p className="text-slate-500 text-sm mb-8">Gunakan NIK yang sudah terdaftar di sistem</p>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7">
            {success ? (
              <div className="text-center py-4">
                <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
                <div className="text-emerald-400 text-sm font-medium">{success}</div>
                <div className="text-slate-500 text-xs mt-2">Mengalihkan ke halaman login...</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                    <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
                    <span className="text-red-400 text-xs">{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-slate-500 text-[10px] font-medium mb-1.5 uppercase tracking-wider">
                    NIK / No. KTP <span className="text-red-400">*</span>
                  </label>
                  <input name="no_ktp" value={form.no_ktp} onChange={handleChange}
                    placeholder="16 digit NIK" required maxLength={16}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono" />
                  <p className="text-slate-600 text-[10px] mt-1">NIK harus sudah terdaftar di sistem PORPROV XV</p>
                </div>

                <div>
                  <label className="block text-slate-500 text-[10px] font-medium mb-1.5 uppercase tracking-wider">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input name="email" type="email" value={form.email} onChange={handleChange}
                    placeholder="email@example.com" required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" />
                </div>

                <div>
                  <label className="block text-slate-500 text-[10px] font-medium mb-1.5 uppercase tracking-wider">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input name="password" type={showPass ? 'text' : 'password'}
                      value={form.password} onChange={handleChange}
                      placeholder="Minimal 8 karakter" required minLength={8}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 text-[10px] font-medium mb-1.5 uppercase tracking-wider">
                    Konfirmasi Password <span className="text-red-400">*</span>
                  </label>
                  <input name="konfirmasi" type="password" value={form.konfirmasi}
                    onChange={handleChange} placeholder="Ulangi password" required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed">
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <UserPlus size={14} />}
                  {loading ? 'Mendaftarkan...' : 'Buat Akun'}
                </button>
              </form>
            )}
          </div>

          <div className="mt-5 text-center">
            <span className="text-slate-500 text-xs">Sudah punya akun? </span>
            <Link href="/atlet/login" className="text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors">
              Login di sini
            </Link>
          </div>

          <p className="text-center text-slate-700 text-[10px] mt-4">
            © 2026 KONI Jawa Barat · PORPROV XV
          </p>
        </div>
      </div>
    </div>
  )
}