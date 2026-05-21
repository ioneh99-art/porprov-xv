'use client'
// src/app/login/[tenant]/page.tsx
// Dynamic login page — satu file untuk SEMUA 28 tenant
// URL: /login/bekasi, /login/kabbogor, /login/bandung, dll

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, Monitor, Loader2 } from 'lucide-react'
import type { TenantConfig } from '../../../lib/tenants'

export default function DynamicLoginPage() {
  const params   = useParams()
  const router   = useRouter()
  const slug     = params?.tenant as string

  const [tenant, setTenant]     = useState<TenantConfig | null>(null)
  const [loading, setLoading]   = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load tenant config dari API
  useEffect(() => {
    if (!slug) return
    fetch(`/api/tenant?slug=${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data?.id) setTenant(data)
        else router.replace('/login') // fallback ke login jabar
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false))
  }, [slug, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSubmitting(true)
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login gagal'); return }

      // Set cookie client-side
      document.cookie = `login_origin=${slug}; path=/; max-age=${60*60*24*30}; samesite=lax`
      if (tenant?.id && tenant.id !== 'jabar') {
        localStorage.setItem('tenant_id', tenant.id)
        document.cookie = `tenant_id=${tenant.id}; path=/; max-age=${60*60*8}; samesite=lax`
      }
      router.push(data.redirect)
    } catch { setError('Tidak dapat terhubung ke server') }
    finally { setSubmitting(false) }
  }

  // Loading state
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
      <div className="text-center">
        <Loader2 size={32} className="animate-spin mx-auto mb-3 text-blue-500"/>
        <p className="text-slate-400 text-sm">Memuat halaman login...</p>
      </div>
    </div>
  )

  if (!tenant) return null

  const primary   = `#${tenant.color_primary}`
  const secondary = `#${tenant.color_secondary}`
  const accent    = `#${tenant.color_accent}`

  // ── Layout: SPLIT (panel kiri + form kanan) ─────────────
  if (tenant.login_layout === 'split') {
    return (
      <div className="min-h-screen flex" style={{ background: '#080806', fontFamily:'system-ui,sans-serif' }}>

        {/* Panel Kiri */}
        <div className="hidden lg:flex w-[52%] flex-col relative overflow-hidden"
          style={{ background: '#0c0b08', borderRight: '1px solid #1a1a14' }}>

          {/* Gradient bar warna tenant */}
          <div style={{ height: 4, background: `linear-gradient(90deg, ${primary}, ${accent}, ${secondary})`, flexShrink: 0 }}/>

          {/* Background grid */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `linear-gradient(${primary}08 1px, transparent 1px), linear-gradient(90deg, ${primary}08 1px, transparent 1px)`,
            backgroundSize: '36px 36px',
          }}/>

          {/* Glow */}
          <div className="absolute pointer-events-none" style={{
            bottom: -60, right: -60, width: 300, height: 300,
            background: `radial-gradient(circle, ${primary}10 0%, transparent 70%)`,
          }}/>

          <div className="relative flex flex-col flex-1 px-10 pt-10">
            {/* Logo + nama */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {tenant.logo_url ? (
                  <img src={tenant.logo_url} alt={tenant.nama} className="w-14 h-14 object-contain"
                    onError={e => {
                      const el = e.target as HTMLImageElement
                      el.style.display = 'none'
                      el.parentElement!.innerHTML = `<span style="font-size:16px;font-weight:900;color:${primary}">${tenant.nama_pendek?.slice(0,3).toUpperCase()}</span>`
                    }}/>
                ) : (
                  <span style={{ fontSize:16, fontWeight:900, color:primary }}>
                    {tenant.nama_pendek?.slice(0,3).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <div style={{ color: primary, fontSize:10, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:2 }}>
                  PORPROV XV · 2026
                </div>
                <div style={{ color:'white', fontSize:18, fontWeight:800, lineHeight:1.1 }}>{tenant.nama}</div>
                {tenant.tagline && (
                  <div style={{ color:'#6b7280', fontSize:11, marginTop:2 }}>{tenant.tagline}</div>
                )}
              </div>
            </div>

            {/* Status bar */}
            <div className="flex items-center gap-3 mb-8 px-4 py-2.5 rounded-xl"
              style={{ background: `${primary}12`, border: `1px solid ${primary}30` }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: primary, flexShrink:0 }}/>
              <span style={{ color: primary, fontSize:11, fontWeight:600, letterSpacing:'0.1em' }}>
                PORPROV XV · SISTEM AKTIF
              </span>
              <Monitor size={13} style={{ color:`${primary}60`, marginLeft:'auto' }}/>
            </div>

            {/* Stats grid */}
            {tenant.login_stats.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-8">
                {tenant.login_stats.map(stat => (
                  <div key={stat.label} className="p-4 rounded-xl"
                    style={{ background:`${stat.color}12`, border:`1px solid ${stat.color}30` }}>
                    <div style={{ color:'#6b7280', fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>
                      {stat.label}
                    </div>
                    <div style={{ color:stat.color, fontSize:22, fontWeight:800, lineHeight:1 }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Venues list */}
            {tenant.login_venues.length > 0 && (
              <>
                <div style={{ height:1, background:`linear-gradient(90deg, ${primary}40, ${accent}30, transparent)`, marginBottom:20 }}/>
                <div style={{ color:'#4b5563', fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:10 }}>
                  Venue Unggulan
                </div>
                <div className="space-y-2">
                  {tenant.login_venues.map((venue, i) => (
                    <div key={venue.nama} className="flex items-center gap-3 py-2 px-3 rounded-lg"
                      style={{ background: i<2?`${venue.color}10`:'transparent', borderLeft:`2px solid ${i<2?venue.color:'#1a1a14'}` }}>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:venue.color }}/>
                      <span style={{ color:i<2?'#e5e7eb':'#6b7280', fontSize:11, flex:1 }}>{venue.nama}</span>
                      <span style={{ color:venue.color, fontSize:9, fontWeight:700 }}>{venue.status}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Bottom */}
          <div className="relative px-10 py-6">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1" style={{ background:`${primary}20` }}/>
              <span style={{ color:'#374151', fontSize:10 }}>PORPROV XV Platform · KONI Jawa Barat 2026</span>
              <div className="h-px flex-1" style={{ background:`${secondary}20` }}/>
            </div>
          </div>
        </div>

        {/* Form Login */}
        <LoginForm
          tenant={tenant} primary={primary} secondary={secondary}
          username={username} setUsername={setUsername}
          password={password} setPassword={setPassword}
          showPass={showPass} setShowPass={setShowPass}
          error={error} submitting={submitting}
          onSubmit={handleSubmit}/>
      </div>
    )
  }

  // ── Layout: CENTERED ─────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#080806', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ height:4, background:`linear-gradient(90deg, ${primary}, ${accent}, ${secondary})`, position:'fixed', top:0, left:0, right:0 }}/>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 overflow-hidden"
            style={{ background:`${primary}15`, border:`2px solid ${primary}30` }}>
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.nama} className="w-16 h-16 object-contain"
                onError={e => {
                  const el = e.target as HTMLImageElement
                  el.style.display = 'none'
                  el.parentElement!.innerHTML = `<span style="font-size:20px;font-weight:900;color:${primary}">${tenant.nama_pendek?.slice(0,3).toUpperCase()}</span>`
                }}/>
            ) : (
              <span style={{ fontSize:20, fontWeight:900, color:primary }}>{tenant.nama_pendek?.slice(0,3).toUpperCase()}</span>
            )}
          </div>
          <div style={{ color: primary, fontSize:10, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:4 }}>
            PORPROV XV · 2026
          </div>
          <div style={{ color:'white', fontSize:20, fontWeight:800, textAlign:'center' }}>{tenant.nama}</div>
          {tenant.tagline && <div style={{ color:'#6b7280', fontSize:12, marginTop:4, textAlign:'center' }}>{tenant.tagline}</div>}
        </div>

        <LoginForm
          tenant={tenant} primary={primary} secondary={secondary}
          username={username} setUsername={setUsername}
          password={password} setPassword={setPassword}
          showPass={showPass} setShowPass={setShowPass}
          error={error} submitting={submitting}
          onSubmit={handleSubmit}
          embedded/>
      </div>
    </div>
  )
}

// ── Sub-komponen: Form Login ──────────────────────────────
function LoginForm({ tenant, primary, secondary, username, setUsername, password, setPassword,
  showPass, setShowPass, error, submitting, onSubmit, embedded = false }: any) {
  return (
    <div className={embedded ? 'w-full' : 'flex-1 flex items-center justify-center px-10'}>
      <div className={embedded ? 'w-full' : 'w-full max-w-xs'}>

        {/* Mobile logo (only for split) */}
        {!embedded && (
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src={tenant.logo_url} alt={tenant.nama} className="w-16 h-16 object-contain"
              onError={e => { (e.target as HTMLElement).style.display = 'none' }}/>
            <div style={{ color:'white', fontSize:16, fontWeight:800, marginTop:8 }}>{tenant.nama}</div>
          </div>
        )}

        <div className={embedded ? '' : 'mb-8'}>
          <div style={{ color: primary, fontSize:9, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:6 }}>
            {tenant.login_hero_text || 'Portal PORPROV XV'}
          </div>
          <h1 style={{ color:'white', fontSize:24, fontWeight:800, lineHeight:1.2, marginBottom:6 }}>
            {tenant.login_title}
          </h1>
          <p style={{ color:'#4b5563', fontSize:13 }}>{tenant.login_subtitle}</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4"
            style={{ background:`${primary}10`, border:`1px solid ${primary}30` }}>
            <AlertCircle size={13} style={{ color: primary, flexShrink:0 }}/>
            <span style={{ color:'#fca5a5', fontSize:12 }}>{error}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4" style={{ marginTop: embedded ? 0 : 0 }}>
          <div>
            <label style={{ color:'#6b7280', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', display:'block', marginBottom:6 }}>
              Username
            </label>
            <input type="text" value={username} onChange={e=>setUsername(e.target.value)}
              placeholder="Masukkan username" autoComplete="username" required
              style={{ width:'100%', background:'#141210', border:'1px solid #242018', borderRadius:10, padding:'10px 14px', fontSize:13, color:'white', outline:'none', boxSizing:'border-box' }}
              onFocus={e=>e.target.style.borderColor=primary}
              onBlur={e=>e.target.style.borderColor='#242018'}/>
          </div>
          <div>
            <label style={{ color:'#6b7280', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', display:'block', marginBottom:6 }}>
              Password
            </label>
            <div style={{ position:'relative' }}>
              <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="Masukkan password" autoComplete="current-password" required
                style={{ width:'100%', background:'#141210', border:'1px solid #242018', borderRadius:10, padding:'10px 40px 10px 14px', fontSize:13, color:'white', outline:'none', boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor=primary}
                onBlur={e=>e.target.style.borderColor='#242018'}/>
              <button type="button" onClick={()=>setShowPass((s: boolean)=>!s)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#4b5563' }}>
                {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>
          <button type="submit" disabled={submitting || !username || !password}
            style={{
              width:'100%', padding:'12px', borderRadius:10, fontSize:13, fontWeight:700,
              color:'white', border:'none', cursor: submitting||!username||!password ? 'not-allowed' : 'pointer',
              background: submitting||!username||!password ? '#1a1a14' : `linear-gradient(135deg, ${primary}, ${secondary})`,
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              letterSpacing:'0.05em', textTransform:'uppercase', marginTop:8,
              boxShadow: submitting||!username||!password ? 'none' : `0 0 20px ${primary}40`,
            }}>
            {submitting
              ? <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Memverifikasi...</>
              : <><Monitor size={14}/> Masuk</>
            }
          </button>
        </form>

        <div style={{ marginTop:24, textAlign:'center', color:'#374151', fontSize:11 }}>
          © 2026 {tenant.nama} · PORPROV XV Jawa Barat
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}