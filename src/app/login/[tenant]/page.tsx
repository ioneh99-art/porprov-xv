'use client'
// src/app/login/[tenant]/page.tsx — JARVIS THEME
// Dynamic login: /login/superadmin, /login/bekasi, /login/bandung, dll
// Loads tenant config from /api/tenant?slug=... then renders branded JARVIS page

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, Loader2, LogIn, Terminal } from 'lucide-react'
import type { TenantConfig } from '../../../lib/tenants'
import { tc } from '../../../lib/tenants'

export default function DynamicLoginPage() {
  const params = useParams()
  const router = useRouter()
  const slug   = params?.tenant as string

  const [tenant,     setTenant]     = useState<TenantConfig | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [username,   setUsername]   = useState('')
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [error,      setError]      = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [imgErr,     setImgErr]     = useState(false)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/tenant?slug=${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data?.id) setTenant(data)
        else router.replace('/login')
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false))
  }, [slug, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSubmitting(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login gagal'); return }
      document.cookie = `login_origin=${slug}; path=/; max-age=${60*60*24*30}; samesite=lax`
      if (tenant?.id && tenant.id !== 'jabar') {
        localStorage.setItem('tenant_id', tenant.id)
        document.cookie = `tenant_id=${tenant.id}; path=/; max-age=${60*60*8}; samesite=lax`
      }
      router.push(data.redirect)
    } catch { setError('Tidak dapat terhubung ke server') }
    finally { setSubmitting(false) }
  }

  // ── Loading ──────────────────────────────────────────────
  if (loading) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />
      <div className="min-h-screen flex items-center justify-center font-sci"
        style={{ background:'#030712' }}>
        <div className="text-center">
          <div className="w-10 h-10 border border-cyan-500/40 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Terminal size={18} style={{ color:'#00f3ff' }}/>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color:'#334155' }}>
            LOADING TENANT CONFIG...
          </p>
        </div>
      </div>
    </>
  )

  if (!tenant) return null

  const primary   = tc(tenant.color_primary)
  const secondary = tc(tenant.color_secondary)
  const accent    = tc(tenant.color_accent)
  const isSA      = slug === 'superadmin'

  // For superadmin: override to JARVIS cyan/green
  const P  = isSA ? '#00f3ff' : primary
  const P2 = isSA ? '#00ff66' : secondary

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT + GLOBAL_CSS }} />

      <div className="min-h-screen flex font-sci relative login-grid scanline-fx"
        style={{ background:'#030712', color:'#f1f5f9' }}>

        {/* ══ PANEL KIRI ══════════════════════════════════════ */}
        {tenant.login_layout !== 'centered' && (
          <div className="hidden lg:flex w-[52%] border-r flex-col relative overflow-hidden"
            style={{ borderColor:`${P}20`, background:'rgba(0,0,0,0.35)' }}>

            {/* Top accent bar */}
            <div style={{ height:2, background:`linear-gradient(90deg, ${P}, ${P2}, transparent)`, flexShrink:0 }}/>

            {/* Glow orbs */}
            <div className="absolute pointer-events-none"
              style={{ top:-60, left:-60, width:260, height:260, background:`radial-gradient(circle, ${P}12, transparent 70%)` }}/>
            <div className="absolute pointer-events-none"
              style={{ bottom:-40, right:-40, width:180, height:180, background:`radial-gradient(circle, ${P2}0a, transparent 70%)` }}/>

            {/* Corner brackets */}
            <Corner pos="top-6 left-6"   sides="t-2 l-2" color={P} />
            <Corner pos="top-6 right-6"  sides="t-2 r-2" color={`${P}40`} />
            <Corner pos="bottom-6 left-6"  sides="b-2 l-2" color={`${P}40`} />
            <Corner pos="bottom-6 right-6" sides="b-2 r-2" color={P} />

            <div className="relative flex flex-col flex-1 px-10 pt-10">

              {/* Logo + nama */}
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 border flex items-center justify-center flex-shrink-0 overflow-hidden relative"
                  style={{ borderColor:`${P}40`, background:`${P}08` }}>
                  <div className="absolute inset-0 animate-pulse" style={{ background:`${P}05` }}/>
                  {tenant.logo_url && !imgErr ? (
                    <img src={tenant.logo_url} alt={tenant.nama}
                      className="w-12 h-12 object-contain relative z-10"
                      onError={()=>setImgErr(true)}/>
                  ) : (
                    <span className="font-lcd font-black text-lg relative z-10"
                      style={{ color:P }}>
                      {tenant.nama_pendek?.slice(0,3).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-widest mb-1"
                    style={{ color:`${P}80` }}>
                    PORPROV XV · 2026
                  </div>
                  <div className="font-lcd font-bold text-lg tracking-wide" style={{ color:P, textShadow:`0 0 12px ${P}` }}>
                    {isSA ? 'ROOT_ACCESS' : tenant.nama.toUpperCase()}
                  </div>
                  {tenant.tagline && (
                    <div className="text-xs mt-0.5" style={{ color:'#475569' }}>{tenant.tagline}</div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 mb-8 px-4 py-2.5 border"
                style={{ borderColor:`${P}25`, background:`${P}08` }}>
                <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background:P }}/>
                <span className="text-[10px] font-mono uppercase tracking-widest flex-1" style={{ color:P }}>
                  {isSA ? 'SUPERADMIN_CONSOLE · SECURE' : 'PORPROV XV · SISTEM AKTIF'}
                </span>
              </div>

              {/* Stats grid */}
              {tenant.login_stats.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {tenant.login_stats.map(stat => (
                    <div key={stat.label} className="p-4 border"
                      style={{ borderColor:`${stat.color}30`, background:`${stat.color}08` }}>
                      <div className="text-[9px] font-mono uppercase tracking-widest mb-2"
                        style={{ color:'#475569' }}>{stat.label}</div>
                      <div className="font-lcd font-bold text-2xl" style={{ color:stat.color }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Venues */}
              {tenant.login_venues.length > 0 && (
                <>
                  <div className="h-px mb-5" style={{ background:`linear-gradient(90deg, ${P}40, transparent)` }}/>
                  <div className="text-[9px] font-mono uppercase tracking-widest mb-3" style={{ color:'#334155' }}>
                    VENUE UNGGULAN
                  </div>
                  <div className="space-y-1.5">
                    {tenant.login_venues.map((v, i) => (
                      <div key={v.nama} className="flex items-center gap-3 py-2 px-3 border-l-2"
                        style={{ borderColor:i<2?v.color:'#1e293b', background:i<2?`${v.color}08`:'transparent' }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:v.color }}/>
                        <span className="flex-1 text-xs" style={{ color:i<2?'#e2e8f0':'#475569' }}>{v.nama}</span>
                        <span className="text-[9px] font-mono font-bold" style={{ color:v.color }}>{v.status}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Superadmin extra info */}
              {isSA && (
                <div className="mt-auto mb-4 space-y-2">
                  <div className="h-px" style={{ background:`${P}20` }}/>
                  {['RBAC Authentication','End-to-end Encrypted','Audit Log Active'].map(txt => (
                    <div key={txt} className="flex items-center gap-2 text-[10px] font-mono" style={{ color:'#334155' }}>
                      <span style={{ color:`${P}50` }}>▸</span> {txt}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative px-10 py-5">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1" style={{ background:`${P}15` }}/>
                <span className="text-[9px] font-mono" style={{ color:'#1e293b' }}>PORPROV XV Platform · KONI Jawa Barat 2026</span>
                <div className="h-px flex-1" style={{ background:`${P2}15` }}/>
              </div>
            </div>
          </div>
        )}

        {/* ══ PANEL KANAN — Form ══════════════════════════════ */}
        <div className={`flex-1 flex items-center justify-center px-8 py-12 ${tenant.login_layout === 'centered' ? 'w-full' : ''}`}>
          <div className="w-full max-w-sm">

            {/* Mobile logo */}
            <div className="lg:hidden flex flex-col items-center mb-8">
              {tenant.logo_url && !imgErr ? (
                <img src={tenant.logo_url} alt={tenant.nama} className="w-14 h-14 object-contain"
                  onError={()=>setImgErr(true)}/>
              ) : (
                <div className="w-14 h-14 border flex items-center justify-center font-lcd font-black text-xl"
                  style={{ borderColor:`${P}40`, color:P }}>
                  {tenant.nama_pendek?.slice(0,2).toUpperCase()}
                </div>
              )}
              <span className="font-lcd text-xs tracking-widest mt-2" style={{ color:P }}>
                {isSA ? 'ROOT_ACCESS' : tenant.nama.toUpperCase()}
              </span>
            </div>

            {/* Badge */}
            <div className="flex items-center gap-2 border px-3 py-1.5 mb-8 w-fit text-[10px] font-mono uppercase tracking-widest"
              style={{ borderColor:`${P}30`, background:`${P}06` }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:P }}/>
              <span style={{ color:P }}>
                {isSA ? 'SUPERADMIN · RESTRICTED' : `${tenant.nama_pendek?.toUpperCase()} · PORPROV XV`}
              </span>
            </div>

            <h1 className="font-lcd font-bold text-2xl tracking-wide mb-1">
              {tenant.login_title || 'ACCESS_PORTAL'}
            </h1>
            <p className="text-sm mb-8" style={{ color:'#475569' }}>
              {tenant.login_subtitle || 'Masuk ke sistem PORPROV XV'}
            </p>

            {/* Form card */}
            <div className="border p-7 relative"
              style={{ borderColor:`${P}25`, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(12px)' }}>

              <Corner pos="-top-px -left-px"   sides="t-2 l-2" color={P}/>
              <Corner pos="-top-px -right-px"  sides="t-2 r-2" color={P}/>
              <Corner pos="-bottom-px -left-px"  sides="b-2 l-2" color={P}/>
              <Corner pos="-bottom-px -right-px" sides="b-2 r-2" color={P}/>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 border px-3 py-2.5 mb-5 text-xs font-mono"
                  style={{ borderColor:'rgba(255,51,102,0.4)', background:'rgba(255,51,102,0.08)', color:'#ff3366' }}>
                  <AlertCircle size={13} className="flex-shrink-0"/>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username */}
                <div>
                  <label className="block text-[9px] font-mono uppercase tracking-widest mb-1.5"
                    style={{ color:'#475569' }}>USERNAME</label>
                  <input type="text" value={username}
                    onChange={e=>setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    autoComplete="username" required disabled={submitting}
                    className="w-full px-4 py-2.5 text-sm outline-none transition-all"
                    style={{ background:`${P}05`, border:`1px solid ${P}20`, color:'#f1f5f9', borderRadius:0, fontFamily:'Rajdhani,sans-serif' }}
                    onFocus={e=>e.currentTarget.style.borderColor=`${P}60`}
                    onBlur={e=>e.currentTarget.style.borderColor=`${P}20`}/>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[9px] font-mono uppercase tracking-widest mb-1.5"
                    style={{ color:'#475569' }}>PASSWORD</label>
                  <div className="relative">
                    <input type={showPass?'text':'password'} value={password}
                      onChange={e=>setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password" required disabled={submitting}
                      className="w-full px-4 py-2.5 pr-11 text-sm outline-none transition-all"
                      style={{ background:`${P}05`, border:`1px solid ${P}20`, color:'#f1f5f9', borderRadius:0, fontFamily:'Rajdhani,sans-serif' }}
                      onFocus={e=>e.currentTarget.style.borderColor=`${P}60`}
                      onBlur={e=>e.currentTarget.style.borderColor=`${P}20`}/>
                    <button type="button" onClick={()=>setShowPass(p=>!p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color:'#475569' }}
                      onMouseEnter={e=>e.currentTarget.style.color=P}
                      onMouseLeave={e=>e.currentTarget.style.color='#475569'}>
                      {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button type="submit"
                  disabled={submitting || !username || !password}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-2 text-sm font-mono uppercase tracking-widest border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    borderColor: `${P}60`,
                    color: submitting||!username||!password ? '#475569' : P,
                    background: submitting||!username||!password ? 'transparent' : `${P}10`,
                    textShadow: submitting||!username||!password ? 'none' : `0 0 8px ${P}`,
                  }}>
                  {submitting
                    ? <><div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"/> AUTHENTICATING...</>
                    : <><LogIn size={14}/> AUTHENTICATE</>}
                </button>
              </form>
            </div>

            <p className="text-center text-[10px] font-mono uppercase tracking-widest mt-5"
              style={{ color:'#1e293b' }}>
              © 2026 {tenant.nama} · PORPROV XV Platform
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Shared corner bracket ─────────────────────────────────
function Corner({ pos, sides, color }: { pos:string; sides:string; color:string }) {
  const cls = sides.split(' ').map(s => `border-${s}`).join(' ')
  return (
    <div className={`absolute ${pos} w-4 h-4 pointer-events-none ${cls}`}
      style={{ borderColor: color }}/>
  )
}

// ── Font import ───────────────────────────────────────────
const FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');
  .font-lcd { font-family: 'Orbitron', sans-serif; }
  .font-sci { font-family: 'Rajdhani', sans-serif; }
`

const GLOBAL_CSS = `
  .login-grid {
    background-image:
      radial-gradient(circle at 30% 50%, rgba(0,243,255,0.035) 0%, transparent 60%),
      linear-gradient(rgba(0,243,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,243,255,0.02) 1px, transparent 1px);
    background-size: 100% 100%, 40px 40px, 40px 40px;
  }
  .scanline-fx::after {
    content: '';
    position: absolute; inset: 0; pointer-events: none; z-index: 1;
    background: linear-gradient(to bottom, transparent 50%, rgba(0,243,255,0.025) 50%);
    background-size: 100% 4px;
    animation: scanMove 10s linear infinite;
  }
  @keyframes scanMove { 0% { background-position: 0 0; } 100% { background-position: 0 100%; } }
`
