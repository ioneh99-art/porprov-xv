'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Terjadi kesalahan')
        setLoading(false)
        return
      }
      router.push(data.redirect)
    } catch {
      setError('Tidak dapat terhubung ke server')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">

      {/* KIRI — Panel Logo */}
      <div className="hidden lg:flex w-[55%] bg-slate-900 border-r border-slate-800 flex-col items-center justify-center px-16 relative overflow-hidden">

        {/* Dekorasi background */}
        <div className="absolute top-[-100px] left-[-100px] w-80 h-80 rounded-full bg-blue-600/5" />
        <div className="absolute bottom-[-80px] right-[-80px] w-64 h-64 rounded-full bg-blue-600/5" />

        {/* Logo pakai img biasa — paling reliable */}
        <div className="relative z-10 mb-8">
          <img
            src="/logo-porprov.png"
            alt="Logo PORPROV XV Jawa Barat 2026"
            className="w-64 h-64 object-contain"
          />
        </div>

        {/* Teks */}
        <div className="relative z-10 text-center mb-8">
          <div className="text-white text-lg font-semibold mb-2">
            Sistem Informasi Atlet
          </div>
          <div className="text-slate-500 text-sm leading-relaxed">
            Platform resmi pendaftaran dan manajemen<br />
            atlet PORPROV XV Jawa Barat 2026
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 flex gap-10">
          {[
            { label: 'Kontingen', value: '27' },
            { label: 'Cabang Olahraga', value: '65+' },
            { label: 'Atlet', value: '24K+' },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-white text-2xl font-bold">{value}</div>
              <div className="text-slate-600 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Live klasemen link */}
        <a href="/publik/klasemen"
          className="relative z-10 mt-10 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 text-xs px-4 py-2.5 rounded-full transition-all">
          <span>🏆</span>
          <span>Lihat Klasemen Medali Live</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </a>
      </div>

      {/* KANAN — Form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-3 py-1.5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-blue-400 text-[10px] font-semibold tracking-wider">
              PORPROV XV · 2026
            </span>
          </div>

          <h1 className="text-white text-2xl font-semibold mb-1">Selamat datang</h1>
          <p className="text-slate-500 text-sm mb-8">Masuk ke sistem manajemen atlet</p>

          {/* Form Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7">
            <form onSubmit={handleSubmit} className="space-y-4">

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                  <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
                  <span className="text-red-400 text-xs">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-500 text-[10px] font-medium mb-1.5 uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  autoComplete="username"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-medium mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button type="button" className="text-blue-500 hover:text-blue-400 text-xs transition-colors">
                  Lupa password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed">
                {loading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <LogIn size={14} />}
                {loading ? 'Memeriksa...' : 'Masuk'}
              </button>

            </form>
          </div>

          {/* Demo accounts */}
          <div className="mt-5 bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-600 text-[10px] font-medium mb-2">
              Akun demo — klik untuk autofill:
            </p>
            <div className="space-y-1">
              {[
                { role: 'Admin', user: 'admin', pass: 'admin123' },
                { role: 'KONIDA Bogor', user: 'bogor', pass: 'bogor123' },
                { role: 'KONIDA Bandung', user: 'bandung', pass: 'bandung123' },
                { role: 'Operator Atletik', user: 'atletik', pass: 'atletik123' },
                { role: 'Operator Renang', user: 'renang', pass: 'renang123' },
              ].map(a => (
                <button key={a.role} type="button"
                  onClick={() => { setUsername(a.user); setPassword(a.pass) }}
                  className="w-full flex justify-between items-center px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-xs">
                  <span className="text-slate-500">{a.role}</span>
                  <span className="text-slate-400 font-mono">{a.user} / {a.pass}</span>
                </button>
              ))}
            </div>
            <p className="text-slate-700 text-[10px] mt-1.5">* Klik untuk autofill</p>
          </div>

          {/* Link klasemen — mobile (panel kiri tidak keliatan) */}
          <a href="/publik/klasemen"
            className="lg:hidden mt-4 flex items-center justify-center gap-2 text-amber-400 hover:text-amber-300 text-xs transition-colors">
            <span>🏆</span>
            <span>Lihat Klasemen Medali Live</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </a>

          <p className="text-center text-slate-700 text-[10px] mt-4">
            © 2026 KONI Jawa Barat · v1.0.0
          </p>
        </div>
      </div>

    </div>
  )
}