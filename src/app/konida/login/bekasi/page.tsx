'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { useTenant, clearTenant } from '@/hooks/useTenant'

export default function LoginPage() {
  const router = useRouter()
  const tenant = useTenant()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [imgError, setImgError] = useState(false)

  const isJabar = tenant.id === 'jabar'

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
      clearTenant()
      const _origin = tenant.id === 'jabar' ? 'jabar' : tenant.id
      document.cookie = `login_origin=${_origin}; path=/; max-age=${60*60*24*30}; samesite=lax`
      router.push(data.redirect)
    } catch {
      setError('Tidak dapat terhubung ke server')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">

      {/* ══ PANEL KIRI ══════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex w-[55%] border-r border-slate-800 flex-col items-center justify-center px-16 relative overflow-hidden"
        style={{ background: isJabar ? '#020915' : tenant.gradient }}>

        {/* Decorative glow */}
        <div className="absolute top-[-100px] left-[-100px] w-80 h-80 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${isJabar ? '#1d4ed8' : tenant.primary}, transparent)` }} />
        <div className="absolute bottom-[-80px] right-[-80px] w-64 h-64 rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${isJabar ? '#1d4ed8' : tenant.primary}, transparent)` }} />

        {/* ── JABAR: tampilan original ─────────────────────────────────── */}
        {isJabar ? (
          <>
            <div className="relative z-10 mb-8">
              <img src="/logo-porprov.png" alt="Logo PORPROV XV"
                className="w-64 h-64 object-contain mix-blend-lighten" />
            </div>
            <div className="relative z-10 text-center mb-8">
              <div className="text-white text-lg font-semibold mb-2">Sistem Informasi Atlet</div>
              <div className="text-slate-500 text-sm leading-relaxed">
                Platform resmi pendaftaran dan manajemen<br />
                atlet PORPROV XV Jawa Barat 2026
              </div>
            </div>
            <div className="relative z-10 flex gap-10 mb-10">
              {[
                { label:'Kontingen', value:'27' },
                { label:'Cabang Olahraga', value:'92' },
                { label:'Atlet', value:'24K+' },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="text-white text-2xl font-bold">{value}</div>
                  <div className="text-slate-600 text-xs mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <div className="relative z-10 flex flex-col items-center gap-3 w-full max-w-xs">
              <a href="/publik/klasemen"
                className="w-full flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 text-xs px-4 py-2.5 rounded-full transition-all">
                <span>🏆</span><span>Lihat Klasemen Medali Live</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </a>
              <div className="flex items-center gap-4">
                {[['📅 Jadwal','/publik/jadwal'],['🏅 Hasil','/publik/hasil'],['🔍 Cari Atlet','/publik/atlet']].map(([label, href]) => (
                  <a key={href} href={href} className="text-slate-500 hover:text-slate-300 text-xs transition-colors">{label}</a>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* ── TENANT KOTA: tampilan branding kota ──────────────────────── */
          <>
            {/* Logo kota */}
            <div className="relative z-10 mb-6">
              {!imgError ? (
                <img src={tenant.logo} alt={tenant.nama}
                  className="w-28 h-28 object-contain rounded-2xl p-3"
                  style={{ background: tenant.logoBg, border: `2px solid ${tenant.primary}40` }}
                  onError={() => setImgError(true)} />
              ) : (
                <div className="w-28 h-28 rounded-2xl flex items-center justify-center text-4xl font-bold text-white"
                  style={{ background: tenant.logoBg, border: `2px solid ${tenant.primary}40` }}>
                  {tenant.nama.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Nama kota */}
            <div className="relative z-10 text-center mb-6">
              <div className="text-white text-2xl font-bold mb-1">{tenant.nama}</div>
              <div className="text-slate-400 text-sm">{tenant.namaLengkap}</div>
              {tenant.badge && (
                <span className="inline-flex items-center gap-1.5 mt-3 text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{ background:`${tenant.primary}20`, color:tenant.primary, border:`1px solid ${tenant.primary}40` }}>
                  🏟️ {tenant.badge}
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="relative z-10 w-full max-w-xs h-px my-2 opacity-20"
              style={{ background: tenant.primary }} />

            {/* Event info */}
            <div className="relative z-10 text-center mt-4">
              <div className="text-white font-bold text-xl mb-1">PORPROV XV</div>
              <div className="text-slate-400 text-sm">Jawa Barat 2026</div>
              <div className="text-slate-500 text-xs mt-3 leading-relaxed max-w-xs">
                Portal resmi manajemen kontingen<br />
                dan penyelenggaraan event
              </div>
            </div>

            {/* Powered by */}
            <div className="relative z-10 absolute bottom-8 text-center">
              <p className="text-slate-700 text-[11px]">
                Powered by PORPROV XV Platform
              </p>
              <p className="text-slate-800 text-[10px] mt-0.5">© KONI Jawa Barat 2026</p>
            </div>
          </>
        )}
      </div>

      {/* ══ PANEL KANAN — Form Login ═════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            {isJabar ? (
              <img src="/logo-porprov.png" alt="PORPROV XV" className="w-20 h-20 object-contain" />
            ) : !imgError ? (
              <img src={tenant.logo} alt={tenant.nama}
                className="w-16 h-16 rounded-xl object-contain p-2"
                style={{ background: tenant.logoBg }}
                onError={() => setImgError(true)} />
            ) : (
              <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white"
                style={{ background: tenant.logoBg }}>
                {tenant.nama.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
              </div>
            )}
            <p className="text-white text-sm font-semibold mt-3">{tenant.nama}</p>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-3 py-1.5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: isJabar ? '#3b82f6' : tenant.primary }} />
            <span className="text-[10px] font-semibold tracking-wider"
              style={{ color: isJabar ? '#60a5fa' : tenant.primary }}>
              {isJabar ? 'PORPROV XV · 2026' : `${tenant.nama.toUpperCase()} · PORPROV XV`}
            </span>
          </div>

          <h1 className="text-white text-2xl font-semibold mb-1">Selamat datang</h1>
          <p className="text-slate-500 text-sm mb-8">
            {isJabar
              ? 'Masuk ke sistem manajemen atlet'
              : tenant.subtitle}
          </p>

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
                <input type="text" value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Masukkan username" autoComplete="username" required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
                  onFocus={e => e.target.style.borderColor = isJabar ? '#3b82f6' : tenant.primary}
                  onBlur={e => e.target.style.borderColor = '#334155'}
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-medium mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan password" autoComplete="current-password" required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
                    onFocus={e => e.target.style.borderColor = isJabar ? '#3b82f6' : tenant.primary}
                    onBlur={e => e.target.style.borderColor = '#334155'}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button type="button" className="text-xs transition-colors"
                  style={{ color: isJabar ? '#3b82f6' : tenant.primary }}>
                  Lupa password?
                </button>
              </div>

              {/* Submit button — warna per tenant */}
              <button type="submit"
                disabled={loading || !username || !password}
                className="w-full flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed"
                style={{
                  background: loading || !username || !password
                    ? undefined
                    : `linear-gradient(135deg, ${isJabar ? '#2563eb' : tenant.primary}, ${isJabar ? '#1d4ed8' : tenant.primaryDark})`,
                }}>
                {loading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <LogIn size={14} />}
                {loading ? 'Memeriksa...' : 'Masuk'}
              </button>

            </form>
          </div>

          {/* Demo accounts — HANYA tampil di KONI Jabar */}
          {isJabar && (
            <div className="mt-5 bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-600 text-[10px] font-medium mb-2">
                Akun demo — klik untuk autofill:
              </p>
              <div className="space-y-1">
                {[
                  { role:'Admin', user:'admin', pass:'admin123' },
                  { role:'KONIDA Kab. Bogor', user:'kab.bogor', pass:'admin123' },
                  { role:'KONIDA Kota Bandung', user:'kota.bandung', pass:'admin123' },
                  { role:'Operator Atletik', user:'op.atletik', pass:'admin123' },
                  { role:'Operator Renang', user:'op.akuatikrn', pass:'admin123' },
                ].map(a => (
                  <button key={a.role} type="button"
                    onClick={() => { setUsername(a.user); setPassword(a.pass) }}
                    className="w-full flex justify-between items-center px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-xs">
                    <span className="text-slate-500">{a.role}</span>
                    <span className="text-slate-400 font-mono text-[10px]">{a.user}</span>
                  </button>
                ))}
              </div>
              <p className="text-slate-700 text-[10px] mt-1.5">* Klik untuk autofill · password: admin123</p>
            </div>
          )}

          {/* Link atlet — HANYA di Jabar */}
          {isJabar && (
            <div className="mt-3 text-center">
              <span className="text-slate-600 text-xs">Kamu atlet? </span>
              <a href="/atlet/login" className="text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors">
                Masuk ke Portal Atlet →
              </a>
            </div>
          )}

          {/* Link publik — mobile, HANYA Jabar */}
          {isJabar && (
            <div className="lg:hidden mt-4 flex flex-col items-center gap-2">
              <a href="/publik/klasemen"
                className="flex items-center justify-center gap-2 text-amber-400 text-xs">
                🏆 Lihat Klasemen Medali Live
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </a>
              <div className="flex items-center gap-4">
                {[['📅 Jadwal','/publik/jadwal'],['🏅 Hasil','/publik/hasil'],['🔍 Cari Atlet','/publik/atlet']].map(([label, href]) => (
                  <a key={href} href={href} className="text-slate-500 hover:text-slate-300 text-xs transition-colors">{label}</a>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-slate-700 text-[10px] mt-5">
            {isJabar
              ? '© 2026 KONI Jawa Barat · v1.0.0'
              : `© 2026 ${tenant.nama} · Powered by PORPROV XV Platform`}
          </p>

        </div>
      </div>
    </div>
  )
}