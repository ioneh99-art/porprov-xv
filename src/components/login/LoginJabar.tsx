'use client'
// components/login/LoginJabar.tsx — JARVIS THEME
// Multi-tenant login: isJabar → full cyan/green JARVIS, else → tenant colors on dark bg

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn, AlertCircle, Terminal, Shield } from 'lucide-react'
import { useTenant, clearTenant, setTenantPersist } from '@/hooks/useTenant'

export default function LoginPage() {
  const router   = useRouter()
  const tenant   = useTenant()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [imgError, setImgError] = useState(false)
  const [scanLine, setScanLine] = useState(0)

  const isJabar = tenant.id === 'jabar'

  // Warna accent berdasarkan tenant
  const accent  = isJabar ? '#00f3ff' : (tenant.primary ?? '#00f3ff')
  const accent2 = isJabar ? '#00ff66' : (tenant.primaryDark ?? accent)

  // Scan line animation effect
  useEffect(() => {
    const t = setInterval(() => setScanLine(p => (p + 1) % 100), 50)
    return () => clearInterval(t)
  }, [])

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
        setError(data.error || 'Autentikasi gagal')
        setLoading(false)
        return
      }
      clearTenant()
      const _origin = data.login_origin ?? 'jabar'
      document.cookie = `login_origin=${_origin}; path=/; max-age=${60*60*24*30}; samesite=lax`
      if (data.login_origin && data.login_origin !== 'jabar') setTenantPersist(data.login_origin)
      router.push(data.redirect)
    } catch {
      setError('Tidak dapat terhubung ke server')
      setLoading(false)
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LOGIN_CSS }} />

      <div className="min-h-screen flex font-sci scanline-effect relative login-grid"
        style={{ background: '#030712', color: '#f1f5f9' }}>

        {/* ══ PANEL KIRI ══════════════════════════════════════════════════ */}
        <div className="hidden lg:flex w-[55%] border-r flex-col items-center justify-center px-16 relative overflow-hidden"
          style={{ borderColor: `${accent}20`, background: 'rgba(0,0,0,0.3)' }}>

          {/* Glow orbs */}
          <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${accent}12, transparent 70%)` }} />
          <div className="absolute bottom-[-60px] right-[-60px] w-56 h-56 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${accent2}0a, transparent 70%)` }} />

          {/* Corner decoration */}
          <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 pointer-events-none" style={{ borderColor: accent }} />
          <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 pointer-events-none" style={{ borderColor: `${accent}40` }} />
          <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 pointer-events-none" style={{ borderColor: `${accent}40` }} />
          <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 pointer-events-none" style={{ borderColor: accent }} />

          {isJabar ? (
            /* ── KONI JABAR: full JARVIS ── */
            <>
              {/* Logo */}
              <div className="relative z-10 mb-8">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <div className="absolute inset-0 animate-pulse" style={{ background:`radial-gradient(circle, ${accent}15, transparent 70%)` }} />
                  <div className="absolute inset-2 border" style={{ borderColor:`${accent}20` }} />
                  <img src="/logo-porprov.png" alt="PORPROV XV"
                    className="relative z-10 w-32 h-32 object-contain mix-blend-lighten" />
                </div>
              </div>

              {/* Title */}
              <div className="relative z-10 text-center mb-8">
                <div className="font-lcd font-black text-2xl tracking-widest mb-2"
                  style={{ color: accent, textShadow: `0 0 20px ${accent}` }}>
                  PORPROV XV
                </div>
                <div className="text-sm font-semibold tracking-widest" style={{ color: `${accent}80` }}>
                  JAWA BARAT 2026
                </div>
                <div className="text-xs mt-3 leading-relaxed" style={{ color: '#475569' }}>
                  Platform resmi pendaftaran dan manajemen<br />
                  atlet PORPROV XV Jawa Barat 2026
                </div>
              </div>

              {/* Stats */}
              <div className="relative z-10 flex gap-10 mb-10">
                {[
                  { label:'Kontingen', value:'27' },
                  { label:'Cabor', value:'92' },
                  { label:'Atlet', value:'24K+' },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <div className="font-lcd font-bold text-2xl" style={{ color: accent }}>{value}</div>
                    <div className="text-xs mt-0.5 font-mono uppercase tracking-widest" style={{ color: '#475569' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Quick links */}
              <div className="relative z-10 flex flex-col items-center gap-3 w-full max-w-xs">
                <a href="/publik/klasemen"
                  className="w-full flex items-center justify-center gap-2 border px-4 py-2.5 text-xs font-mono uppercase tracking-wider transition-all hover:bg-amber-400/5"
                  style={{ borderColor: 'rgba(255,176,0,0.3)', color: '#ffb000' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  KLASEMEN MEDALI LIVE
                </a>
                <div className="flex items-center gap-4">
                  {[['JADWAL','/publik/jadwal'],['HASIL','/publik/hasil'],['ATLET','/publik/atlet']].map(([label, href]) => (
                    <a key={href} href={href}
                      className="text-[10px] font-mono uppercase tracking-wider transition-colors"
                      style={{ color: '#334155' }}
                      onMouseEnter={e=>(e.currentTarget.style.color=accent)}
                      onMouseLeave={e=>(e.currentTarget.style.color='#334155')}>
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* ── TENANT KOTA: branding kota di atas dark JARVIS bg ── */
            <>
              {/* Logo kota */}
              <div className="relative z-10 mb-6">
                <div className="w-28 h-28 flex items-center justify-center border relative overflow-hidden"
                  style={{ borderColor: `${accent}40`, background: `${accent}0a` }}>
                  <div className="absolute inset-0 animate-pulse" style={{ background: `${accent}05` }} />
                  {!imgError ? (
                    <img src={tenant.logo} alt={tenant.nama}
                      className="w-20 h-20 object-contain relative z-10"
                      onError={() => setImgError(true)} />
                  ) : (
                    <span className="font-lcd font-black text-2xl relative z-10" style={{ color: accent }}>
                      {tenant.nama.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <div className="relative z-10 text-center mb-6">
                <div className="font-lcd font-bold text-xl tracking-widest mb-1" style={{ color: accent, textShadow:`0 0 15px ${accent}` }}>
                  {tenant.nama.toUpperCase()}
                </div>
                <div className="text-sm" style={{ color: '#64748b' }}>{tenant.namaLengkap}</div>
                {tenant.badge && (
                  <span className="inline-flex items-center gap-1.5 mt-3 text-[10px] px-3 py-1 font-mono border"
                    style={{ background:`${accent}10`, color:accent, borderColor:`${accent}30` }}>
                    🏟️ {tenant.badge}
                  </span>
                )}
              </div>

              <div className="relative z-10 w-24 h-px" style={{ background:`linear-gradient(to right, transparent, ${accent}60, transparent)` }} />

              <div className="relative z-10 text-center mt-6">
                <div className="font-lcd font-black text-xl tracking-widest mb-1" style={{ color: '#f1f5f9' }}>PORPROV XV</div>
                <div className="text-sm" style={{ color: '#64748b' }}>Jawa Barat 2026</div>
                <div className="text-xs mt-3 leading-relaxed" style={{ color: '#334155' }}>
                  Portal resmi manajemen kontingen<br />dan penyelenggaraan event
                </div>
              </div>

              <div className="absolute bottom-8 z-10 text-center">
                <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#1e293b' }}>
                  Powered by PORPROV XV Platform
                </p>
              </div>
            </>
          )}
        </div>

        {/* ══ PANEL KANAN — Form Login ════════════════════════════════════ */}
        <div className="flex-1 flex items-center justify-center px-8 py-12 relative">
          <div className="w-full max-w-sm">

            {/* Mobile logo */}
            <div className="lg:hidden flex flex-col items-center mb-8">
              {isJabar ? (
                <img src="/logo-porprov.png" alt="PORPROV XV"
                  className="w-20 h-20 object-contain mix-blend-lighten" />
              ) : !imgError ? (
                <img src={tenant.logo} alt={tenant.nama}
                  className="w-16 h-16 object-contain"
                  onError={() => setImgError(true)} />
              ) : (
                <div className="w-16 h-16 border flex items-center justify-center font-lcd font-bold text-xl"
                  style={{ borderColor:`${accent}40`, color:accent }}>
                  {tenant.nama.split(' ').map((w:string)=>w[0]).join('').slice(0,2)}
                </div>
              )}
              <p className="font-lcd text-xs tracking-widest mt-3" style={{ color: accent }}>{tenant.nama.toUpperCase()}</p>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2 mb-8">
              <div className="flex items-center gap-2 border px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest"
                style={{ borderColor:`${accent}30`, background:`${accent}06` }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
                <span style={{ color: accent }}>
                  {isJabar ? 'PORPROV XV · 2026' : `${tenant.nama.toUpperCase()} · PORPROV XV`}
                </span>
              </div>
            </div>

            <h1 className="font-lcd font-bold text-2xl tracking-wide mb-1" style={{ color: '#f1f5f9' }}>
              ACCESS_PORTAL
            </h1>
            <p className="text-sm mb-8" style={{ color: '#475569' }}>
              {isJabar
                ? 'Masuk ke sistem manajemen atlet PORPROV XV'
                : tenant.subtitle}
            </p>

            {/* Form card */}
            <div className="border p-7 relative"
              style={{ borderColor: `${accent}25`, background: 'rgba(0,0,0,0.4)', backdropFilter:'blur(12px)' }}>

              {/* Corner brackets */}
              <div className="absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2" style={{ borderColor: accent }} />
              <div className="absolute -top-px -right-px w-4 h-4 border-t-2 border-r-2" style={{ borderColor: accent }} />
              <div className="absolute -bottom-px -left-px w-4 h-4 border-b-2 border-l-2" style={{ borderColor: accent }} />
              <div className="absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2" style={{ borderColor: accent }} />

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 border px-3 py-2.5 mb-5 text-xs font-mono"
                  style={{ borderColor:'rgba(255,51,102,0.4)', background:'rgba(255,51,102,0.08)', color:'#ff3366' }}>
                  <AlertCircle size={13} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-mono uppercase tracking-widest mb-1.5" style={{ color: '#475569' }}>
                    USERNAME
                  </label>
                  <input
                    type="text" value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    autoComplete="username" required disabled={loading}
                    className={`w-full px-4 py-2.5 text-sm outline-none ${isJabar ? 'input-jarvis' : 'input-tenant'}`}
                    onFocus={e => { if (!isJabar) e.target.style.borderColor = `${accent}60` }}
                    onBlur={e => { if (!isJabar) e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-mono uppercase tracking-widest mb-1.5" style={{ color: '#475569' }}>
                    PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password" required disabled={loading}
                      className={`w-full px-4 py-2.5 pr-11 text-sm outline-none ${isJabar ? 'input-jarvis' : 'input-tenant'}`}
                      onFocus={e => { if (!isJabar) e.target.style.borderColor = `${accent}60` }}
                      onBlur={e => { if (!isJabar) e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: '#475569' }}
                      onMouseEnter={e=>(e.currentTarget.style.color=accent)}
                      onMouseLeave={e=>(e.currentTarget.style.color='#475569')}>
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="button" className="text-[10px] font-mono uppercase tracking-widest transition-colors"
                    style={{ color: '#334155' }}
                    onMouseEnter={e=>(e.currentTarget.style.color=accent)}
                    onMouseLeave={e=>(e.currentTarget.style.color='#334155')}>
                    Lupa password?
                  </button>
                </div>

                {/* Submit */}
                <button type="submit"
                  disabled={loading || !username || !password}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-mono uppercase tracking-widest border transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                  style={{
                    borderColor: `${accent}60`,
                    color: loading || !username || !password ? '#475569' : accent,
                    background: loading || !username || !password ? 'transparent' : `${accent}10`,
                    textShadow: loading || !username || !password ? 'none' : `0 0 8px ${accent}`,
                  }}>
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> AUTHENTICATING...</>
                    : <><LogIn size={14} /> AUTHENTICATE</>}
                </button>
              </form>
            </div>

            {/* Demo accounts — hanya Jabar */}
            {isJabar && (
              <div className="mt-4 border p-4" style={{ borderColor:'rgba(0,243,255,0.08)', background:'rgba(0,0,0,0.3)' }}>
                <p className="text-[9px] font-mono uppercase tracking-widest mb-2.5" style={{ color: '#334155' }}>
                  AKUN DEMO — KLIK AUTOFILL
                </p>
                <div className="space-y-1">
                  {[
                    { role:'Admin',           user:'admin',       pass:'admin123' },
                    { role:'KONIDA Kab. Bogor',user:'kab.bogor',  pass:'admin123' },
                    { role:'KONIDA Bandung',   user:'kota.bandung',pass:'admin123' },
                    { role:'Op. Atletik',      user:'op.atletik',  pass:'admin123' },
                    { role:'Op. Renang',       user:'op.akuatikrn',pass:'admin123' },
                  ].map(a => (
                    <button key={a.role} type="button"
                      onClick={() => { setUsername(a.user); setPassword(a.pass) }}
                      className="w-full flex justify-between items-center px-2 py-1.5 text-xs transition-colors group"
                      style={{ background:'transparent' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(0,243,255,0.04)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <span style={{ color: '#475569' }}>{a.role}</span>
                      <span className="font-mono text-[10px] group-hover:text-white transition-colors" style={{ color: '#334155' }}>{a.user}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Link atlet */}
            {isJabar && (
              <div className="mt-3 text-center">
                <span className="text-xs" style={{ color: '#334155' }}>Atlet? </span>
                <a href="/atlet/login"
                  className="text-xs font-mono uppercase tracking-wider transition-colors"
                  style={{ color: '#00ff66' }}
                  onMouseEnter={e=>(e.currentTarget.style.opacity='0.7')}
                  onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
                  Portal Atlet →
                </a>
              </div>
            )}

            {/* Link publik mobile */}
            {isJabar && (
              <div className="lg:hidden mt-4 flex flex-col items-center gap-2">
                <a href="/publik/klasemen"
                  className="flex items-center gap-2 text-xs font-mono"
                  style={{ color: '#ffb000' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  KLASEMEN LIVE
                </a>
                <div className="flex items-center gap-4">
                  {[['JADWAL','/publik/jadwal'],['HASIL','/publik/hasil'],['ATLET','/publik/atlet']].map(([l,h])=>(
                    <a key={h} href={h} className="text-[10px] font-mono uppercase" style={{ color:'#334155' }}>{l}</a>
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-[10px] font-mono uppercase tracking-widest mt-6" style={{ color: '#1e293b' }}>
              {isJabar
                ? '© 2026 KONI Jawa Barat · v1.0.0'
                : `© 2026 ${tenant.nama} · PORPROV XV Platform`}
            </p>

          </div>
        </div>
      </div>
    </>
  )
}

const LOGIN_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');
  .font-lcd { font-family: 'Orbitron', sans-serif; }
  .font-sci { font-family: 'Rajdhani', sans-serif; }
  .login-grid {
    background-image:
      radial-gradient(circle at 30% 50%, rgba(0,243,255,0.04) 0%, transparent 60%),
      linear-gradient(rgba(0,243,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,243,255,0.025) 1px, transparent 1px);
    background-size: 100% 100%, 40px 40px, 40px 40px;
  }
  .scanline-effect::after {
    content: '';
    position: absolute; inset: 0; pointer-events: none; z-index: 1;
    background: linear-gradient(to bottom, transparent 50%, rgba(0,243,255,0.03) 50%);
    background-size: 100% 4px;
    animation: scanMove 8s linear infinite;
  }
  @keyframes scanMove { 0% { background-position: 0 0; } 100% { background-position: 0 100%; } }
  .input-jarvis {
    background: rgba(0,243,255,0.04) !important;
    border: 1px solid rgba(0,243,255,0.15) !important;
    color: #f1f5f9 !important;
    border-radius: 0 !important;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.02em;
    transition: border-color 0.2s;
  }
  .input-jarvis:focus { border-color: rgba(0,243,255,0.6) !important; outline: none; }
  .input-jarvis::placeholder { color: rgba(255,255,255,0.2); }
  .input-tenant {
    background: rgba(255,255,255,0.04) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    color: #f1f5f9 !important;
    border-radius: 0 !important;
    font-family: 'Rajdhani', sans-serif;
    transition: border-color 0.2s;
  }
  .input-tenant:focus { outline: none; }
  .input-tenant::placeholder { color: rgba(255,255,255,0.2); }
`
