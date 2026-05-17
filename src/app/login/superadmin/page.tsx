'use client'
// src/app/login/superadmin/page.tsx
// Login Super Admin — standalone, dark merah-oranye

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, Shield, Terminal } from 'lucide-react'

export default function LoginSuperAdmin() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error || 'Login gagal')
        setLoading(false)
        return
      }

      // Set login_origin agar logout kembali ke halaman ini
      document.cookie = `login_origin=superadmin; path=/; max-age=${60*60*24*30}; samesite=lax`

      // Superadmin selalu ke /superadmin
      router.push('/superadmin')
    } catch {
      setError('Tidak dapat terhubung ke server')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#07080f', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── KIRI: System Panel ─────────────────────────────────── */}
      <div className="hidden lg:flex w-[50%] flex-col justify-between px-12 py-12 relative overflow-hidden"
        style={{ background: '#09090e', borderRight: '1px solid rgba(239,68,68,0.1)' }}>

        {/* Grid texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `
            linear-gradient(rgba(239,68,68,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(239,68,68,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }} />

        {/* Glow */}
        <div className="absolute pointer-events-none" style={{
          top: -100, left: -100, width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 65%)',
        }} />
        <div className="absolute pointer-events-none" style={{
          bottom: -80, right: -80, width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 65%)',
        }} />

        {/* Top bar gradient */}
        <div className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, #ef4444, #f97316, transparent)' }} />

        {/* Content */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <Shield size={18} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <div style={{ color: '#ef4444', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Restricted Access
              </div>
              <div style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>PORPROV XV Control Center</div>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <div style={{ color: 'rgba(239,68,68,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              Super Admin
            </div>
            <h1 style={{ color: 'white', fontSize: 36, fontWeight: 800, lineHeight: 1.1, marginBottom: 12 }}>
              System<br />
              <span style={{ color: '#ef4444' }}>Control</span>
            </h1>
            <p style={{ color: '#374151', fontSize: 13, lineHeight: 1.7 }}>
              Akses penuh ke seluruh sistem,<br />
              semua tenant, dan semua data<br />
              PORPROV XV Jawa Barat 2026.
            </p>
          </div>

          {/* System status */}
          <div className="space-y-2.5">
            {[
              { label: 'Supabase Database', status: 'Connected', color: '#10b981' },
              { label: 'Vercel Edge',       status: 'Healthy',   color: '#10b981' },
              { label: 'Groq AI Keys',      status: '2/3 Active',color: '#f97316' },
              { label: 'Auth System',       status: 'Secured',   color: '#10b981' },
            ].map(({ label, status, color }) => (
              <div key={label}
                className="flex items-center justify-between py-2.5 px-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  <span style={{ color: '#4b5563', fontSize: 12 }}>{label}</span>
                </div>
                <span style={{ color, fontSize: 11, fontWeight: 700 }}>{status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative flex items-center gap-2">
          <Terminal size={11} style={{ color: 'rgba(239,68,68,0.3)' }} />
          <span style={{ color: '#1f2937', fontSize: 10, fontFamily: 'monospace' }}>
            PORPROV XV · v1.0 · {new Date().getFullYear()}
          </span>
        </div>
      </div>

      {/* ── KANAN: Form ──────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-10">
        <div className="w-full max-w-[300px]">

          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>
                <Shield size={18} className="text-white" />
              </div>
              <div>
                <div style={{ color: '#ef4444', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Super Admin</div>
                <div style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>PORPROV XV</div>
              </div>
            </div>
            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
              Admin Login
            </h2>
            <p style={{ color: '#374151', fontSize: 12 }}>Restricted · Authorized personnel only</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <AlertCircle size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
              <span style={{ color: '#fca5a5', fontSize: 12 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ color: '#374151', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Username
              </label>
              <input
                type="text" value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin" autoComplete="username" required
                disabled={loading}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, padding: '11px 16px', fontSize: 13,
                  color: 'white', outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(239,68,68,0.6)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>

            <div>
              <label style={{ color: '#374151', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password" required
                  disabled={loading}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12, padding: '11px 44px 11px 16px', fontSize: 13,
                    color: 'white', outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(239,68,68,0.6)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || !username || !password}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, fontSize: 13,
                fontWeight: 700, color: 'white', border: 'none',
                cursor: loading || !username || !password ? 'not-allowed' : 'pointer',
                background: loading || !username || !password
                  ? 'rgba(255,255,255,0.05)'
                  : 'linear-gradient(135deg, #ef4444, #f97316)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 8, letterSpacing: '0.05em',
                boxShadow: loading || !username || !password ? 'none' : '0 0 24px rgba(239,68,68,0.25)',
                transition: 'all 0.2s',
              }}>
              {loading ? (
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <Shield size={14} />
              )}
              {loading ? 'Authenticating...' : 'Access Control Center'}
            </button>
          </form>

          <div style={{ marginTop: 32, textAlign: 'center', color: '#1f2937', fontSize: 10, fontFamily: 'monospace' }}>
            PORPROV XV · SA Panel · {new Date().getFullYear()}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}