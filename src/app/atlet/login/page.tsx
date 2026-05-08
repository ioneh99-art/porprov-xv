'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn, AlertCircle, UserPlus } from 'lucide-react'
import Link from 'next/link'

export default function AtletLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/atlet/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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
      {/* Kiri — Panel */}
      <div className="hidden lg:flex w-[55%] bg-slate-900 border-r border-slate-800 flex-col items-center justify-center px-16 relative overflow-hidden">
        <div className="absolute top-[-100px] left-[-100px] w-80 h-80 rounded-full bg-emerald-600/5" />
        <div className="absolute bottom-[-80px] right-[-80px] w-64 h-64 rounded-full bg-emerald-600/5" />
        <div className="relative z-10 mb-8">
          <img src="/logo-porprov.png" alt="PORPROV XV" className="w-56 h-56 object-contain" />
        </div>
        <div className="relative z-10 text-center mb-8">
          <div className="text-white text-lg font-semibold mb-2">Portal Atlet</div>
          <div className="text-slate-500 text-sm leading-relaxed">
            Kelola profil dan rekam jejak<br />prestasi kamu di PORPROV XV
          </div>
        </div>
        <div className="relative z-10 flex gap-8">
          {[
            { label: 'Atlet Terdaftar', value: '24K+' },
            { label: 'Cabor', value: '65+' },
            { label: 'Kontingen', value: '27' },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-white text-2xl font-bold">{value}</div>
              <div className="text-slate-600 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Kanan — Form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-emerald-400 text-[10px] font-semibold tracking-wider">
              PORTAL ATLET · PORPROV XV
            </span>
          </div>

          <h1 className="text-white text-2xl font-semibold mb-1">Masuk ke akunmu</h1>
          <p className="text-slate-500 text-sm mb-8">Kelola profil dan prestasi kamu</p>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                  <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
                  <span className="text-red-400 text-xs">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-500 text-[10px] font-medium mb-1.5 uppercase tracking-wider">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com" required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" />
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-medium mb-1.5 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan password" required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading || !email || !password}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed">
                {loading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <LogIn size={14} />}
                {loading ? 'Memeriksa...' : 'Masuk'}
              </button>
            </form>
          </div>

          <div className="mt-5 text-center">
            <span className="text-slate-500 text-xs">Belum punya akun? </span>
            <Link href="/atlet/daftar" className="text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors">
              Daftar sekarang
            </Link>
          </div>

          <div className="mt-3 text-center">
            <Link href="/login" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
              ← Kembali ke login staff
            </Link>
          </div>

          <p className="text-center text-slate-700 text-[10px] mt-5">
            © 2026 KONI Jawa Barat · PORPROV XV
          </p>
        </div>
      </div>
    </div>
  )
}