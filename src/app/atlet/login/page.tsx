'use client'
// src/app/atlet/login/page.tsx — v2 Universal
// Style: slate-950 theme (sama kayak KONI Jabar login)
// Konten: portal atlet NIK-based, universal semua kontingen

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, Trophy } from 'lucide-react'

const PUBLIK_LINKS = [
  { label:'📅 Jadwal', href:'/publik/jadwal' },
  { label:'🏅 Hasil',  href:'/publik/hasil'  },
  { label:'🔍 Atlet',  href:'/publik/atlet'  },
]

const STATS = [
  { value:'1.097', label:'Atlet Kab. Bogor' },
  { value:'61',    label:'Cabang Olahraga'  },
  { value:'27',    label:'Kontingen'        },
]

export default function LoginAtlet() {
  const router = useRouter()
  const [nik,      setNik]      = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nik.length !== 16) { setError('NIK harus 16 digit'); return }
    setError(''); setLoading(true)
    try {
      const res  = await fetch('/api/atlet/auth/login', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ nik, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error||'Login gagal'); setLoading(false); return }
      document.cookie = `atlet_token=${data.token}; path=/; max-age=${60*60*8}; samesite=lax`
      localStorage.setItem('atlet_nik', nik)
      router.push('/atlet/dashboard')
    } catch {
      setError('Tidak dapat terhubung ke server')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">

      {/* ══ PANEL KIRI ══════════════════════════════════════════════════ */}
      <div className="hidden lg:flex w-[55%] border-r border-slate-800 flex-col items-center justify-center px-16 relative overflow-hidden"
        style={{ background:'#020915' }}>

        {/* Decorative glow */}
        <div className="absolute top-[-100px] left-[-100px] w-80 h-80 rounded-full opacity-20"
          style={{ background:'radial-gradient(circle,#10b981,transparent)' }}/>
        <div className="absolute bottom-[-80px] right-[-80px] w-64 h-64 rounded-full opacity-10"
          style={{ background:'radial-gradient(circle,#10b981,transparent)' }}/>

        {/* Logo */}
        <div className="relative z-10 mb-6">
          <div className="w-28 h-28 rounded-3xl flex items-center justify-center"
            style={{ background:'rgba(16,185,129,0.1)', border:'2px solid rgba(16,185,129,0.25)' }}>
            <Trophy size={52} style={{ color:'#10b981' }}/>
          </div>
        </div>

        {/* Text */}
        <div className="relative z-10 text-center mb-6">
          <div className="text-white text-2xl font-bold mb-1">Portal Atlet Resmi</div>
          <div className="text-slate-400 text-sm">PORPROV XV Jawa Barat 2026</div>
          <span className="inline-flex items-center gap-1.5 mt-3 text-xs px-3 py-1.5 rounded-full font-medium"
            style={{ background:'rgba(16,185,129,0.15)', color:'#10b981', border:'1px solid rgba(16,185,129,0.3)' }}>
            🏟️ 7–20 November 2026 · Jawa Barat
          </span>
        </div>

        {/* Divider */}
        <div className="relative z-10 w-full max-w-xs h-px my-2 opacity-20"
          style={{ background:'#10b981' }}/>

        {/* Stats */}
        <div className="relative z-10 flex gap-10 my-6">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <div className="text-white text-2xl font-bold">{s.value}</div>
              <div className="text-slate-600 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="relative z-10 flex flex-col items-center gap-3 w-full max-w-xs">
          <a href="/publik/klasemen"
            className="w-full flex items-center justify-center gap-2 text-amber-400 text-xs px-4 py-2.5 rounded-full transition-all"
            style={{ background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.2)' }}>
            <span>🏆</span>
            <span>Lihat Klasemen Medali Live</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
          </a>
          <div className="flex items-center gap-4">
            {PUBLIK_LINKS.map(l => (
              <a key={l.href} href={l.href}
                className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
                {l.label}
              </a>
            ))}
          </div>
        </div>

        {/* Powered by */}
        <div className="relative z-10 absolute bottom-8 text-center">
          <p className="text-slate-700 text-[11px]">Powered by PORPROV XV Platform</p>
          <p className="text-slate-800 text-[10px] mt-0.5">© KONI Jawa Barat 2026</p>
        </div>
      </div>

      {/* ══ PANEL KANAN — Form ══════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
              style={{ background:'rgba(16,185,129,0.1)', border:'2px solid rgba(16,185,129,0.25)' }}>
              <Trophy size={28} style={{ color:'#10b981' }}/>
            </div>
            <p className="text-white text-sm font-semibold">Portal Atlet PORPROV XV</p>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-3 py-1.5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-emerald-400"/>
            <span className="text-[10px] font-semibold tracking-wider text-emerald-400">
              PORTAL ATLET · PORPROV XV 2026
            </span>
          </div>

          <h1 className="text-white text-2xl font-semibold mb-1">Selamat datang</h1>
          <p className="text-slate-500 text-sm mb-8">Masuk ke portal atlet resmi PORPROV XV</p>

          {/* Form card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7">

            {/* Info credential */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl mb-5"
              style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)' }}>
              <ShieldCheck size={14} className="text-emerald-400 flex-shrink-0 mt-0.5"/>
              <div className="text-xs text-slate-400 leading-relaxed">
                <span className="text-emerald-400 font-semibold">Username:</span> NIK/KTP (16 digit)
                <br/>
                <span className="text-emerald-400 font-semibold">Password:</span> 4 digit terakhir NIK
                <span className="text-slate-600"> · dapat diganti setelah login</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                  <AlertCircle size={13} className="text-red-400 flex-shrink-0"/>
                  <span className="text-red-400 text-xs">{error}</span>
                </div>
              )}

              {/* NIK */}
              <div>
                <label className="block text-slate-500 text-[10px] font-medium mb-1.5 uppercase tracking-wider">
                  Nomor NIK / KTP
                </label>
                <input type="tel" inputMode="numeric" maxLength={16}
                  value={nik} onChange={e => setNik(e.target.value.replace(/\D/g,''))}
                  placeholder="16 digit NIK" required autoComplete="username"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-all font-mono tracking-widest"
                  onFocus={e => e.target.style.borderColor='#10b981'}
                  onBlur={e  => e.target.style.borderColor='#334155'}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-slate-600">Nomor pada e-KTP</span>
                  <span className={`text-[10px] font-mono ${nik.length===16?'text-emerald-400':'text-slate-600'}`}>
                    {nik.length}/16
                  </span>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-slate-500 text-[10px] font-medium mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input type={showPass?'text':'password'} maxLength={20}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Password" required autoComplete="current-password"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
                    onFocus={e => e.target.style.borderColor='#10b981'}
                    onBlur={e  => e.target.style.borderColor='#334155'}
                  />
                  <button type="button" onClick={() => setShowPass(s=>!s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button type="submit"
                disabled={loading || nik.length!==16 || !password}
                className="w-full flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed"
                style={{
                  background: (loading||nik.length!==16||!password)
                    ? undefined
                    : 'linear-gradient(135deg,#10b981,#059669)',
                }}>
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Memverifikasi...</>
                  : <><Trophy size={14}/> Masuk ke Portal Atlet</>
                }
              </button>
            </form>
          </div>

          {/* Link koordinator */}
          <div className="mt-4 text-center space-y-2">
            <div>
              <span className="text-slate-600 text-xs">Kamu koordinator kontingen? </span>
              <a href="/login" className="text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors">
                Login admin →
              </a>
            </div>
            <div>
              <span className="text-slate-600 text-xs">Belum punya akun? </span>
              <a href="/atlet/daftar" className="text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors">
                Daftar di sini →
              </a>
            </div>
          </div>

          {/* Mobile publik links */}
          <div className="lg:hidden mt-5 flex flex-col items-center gap-2">
            <a href="/publik/klasemen" className="flex items-center gap-2 text-amber-400 text-xs">
              🏆 Lihat Klasemen Medali Live
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
            </a>
            <div className="flex items-center gap-4">
              {PUBLIK_LINKS.map(l => (
                <a key={l.href} href={l.href} className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          <p className="text-center text-slate-700 text-[10px] mt-5">
            © 2026 KONI Jawa Barat · PORPROV XV Platform
          </p>
        </div>
      </div>
    </div>
  )
}