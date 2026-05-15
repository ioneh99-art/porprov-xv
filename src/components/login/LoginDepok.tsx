'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, Cpu, ChevronRight } from 'lucide-react'
import { setTenantPersist } from '@/hooks/useTenant'

// DEPOK — Minimal Tech / Smart City Style
// Layout: top-aligned, bukan split tapi stack vertikal di tengah
// Karakter: ungu, minimalis, tech/UI vibes, typografi besar

export default function LoginDepok() {
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
      if (!res.ok) { setError(data.error || 'Login gagal'); setLoading(false); return }
      // Set tenant persist SEBELUM redirect
      setTenantPersist('depok')
      router.push(data.redirect)
    } catch { setError('Tidak dapat terhubung ke server'); setLoading(false) }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#07050f' }}>

      {/* ── KIRI: Tech Grid Panel ───────────────────────────────── */}
      <div className="hidden lg:flex w-[48%] flex-col justify-between px-12 py-12 relative overflow-hidden"
        style={{ background: '#080610' }}>

        {/* Grid pattern tech */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(124,58,237,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.06) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }} />

        {/* Corner accent dots */}
        {[[0,0],[0,1],[1,0],[1,1]].map(([r,c], i) => (
          <div key={i} className="absolute w-1 h-1 rounded-full"
            style={{
              background: 'rgba(124,58,237,0.4)',
              top: r === 0 ? 24 : 'auto', bottom: r === 1 ? 24 : 'auto',
              left: c === 0 ? 24 : 'auto', right: c === 1 ? 24 : 'auto',
            }} />
        ))}

        {/* Diagonal accent line */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.05 }}>
          <line x1="0" y1="100%" x2="100%" y2="0" stroke="#7c3aed" strokeWidth="1" />
        </svg>

        {/* Top */}
        <div className="relative">
          {/* Logo minimal */}
          <div className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)' }}>
              <Cpu size={16} style={{ color: '#7c3aed' }} />
            </div>
            <span style={{ color: '#7c3aed', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform:'uppercase' }}>
              Depok · Klaster III
            </span>
          </div>

          {/* Big typography — Depok style */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ color: 'rgba(124,58,237,0.4)', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform:'uppercase', marginBottom: 8 }}>
              PORPROV XV · 2026
            </div>
            <h1 style={{ color: 'white', fontSize: 36, fontWeight: 800, lineHeight: 1.1, marginBottom: 0 }}>
              Smart<br />
              <span style={{ color: '#7c3aed' }}>Portal</span>
            </h1>
            <div style={{ color: '#4b5563', fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>
              Sistem manajemen kontingen<br />& penyelenggara Klaster III
            </div>
          </div>

          {/* Stats minimal — horisontal */}
          <div className="space-y-2">
            {[
              { n: '07', label: 'Venue Klaster III' },
              { n: '14', label: 'Cabang Olahraga' },
              { n: '60+', label: 'Nomor Pertandingan' },
            ].map(({ n, label }) => (
              <div key={label} className="flex items-center gap-4 py-2.5 px-4 rounded-xl"
                style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.1)' }}>
                <span style={{ color: '#7c3aed', fontSize: 20, fontWeight: 800, minWidth: 40, fontVariantNumeric:'tabular-nums' }}>{n}</span>
                <span style={{ color: '#4b5563', fontSize: 12 }}>{label}</span>
                <ChevronRight size={12} style={{ color: 'rgba(124,58,237,0.3)', marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: versi minimal */}
        <div className="relative flex items-center gap-3">
          <div className="w-5 h-px" style={{ background: 'rgba(124,58,237,0.3)' }} />
          <span style={{ color: '#374151', fontSize: 10 }}>PORPROV XV Platform</span>
        </div>
      </div>

      {/* ── KANAN: Form Login — minimal tech ──────────────────── */}
      <div className="flex-1 flex items-center justify-center px-10">
        <div className="w-full max-w-[280px]">

          {/* Top: kecil aja */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-1">
              <Cpu size={13} style={{ color: '#7c3aed' }} />
              <span style={{ color: '#7c3aed', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform:'uppercase' }}>
                Kota Depok
              </span>
            </div>
            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
              Sign In
            </h2>
            <p style={{ color: '#374151', fontSize: 12 }}>
              Tuan Rumah Klaster III · PORPROV XV
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 mb-5"
              style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
              <AlertCircle size={12} style={{ color: '#ef4444', flexShrink: 0 }} />
              <span style={{ color: '#fca5a5', fontSize: 11 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label style={{ color: '#374151', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform:'uppercase', display:'block', marginBottom: 6 }}>
                Username
              </label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="username" autoComplete="username" required
                style={{
                  width: '100%', background: 'transparent',
                  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                  borderBottom: '1px solid #1f1f2e',
                  padding: '8px 0', fontSize: 14, color: 'white',
                  outline: 'none', boxSizing: 'border-box', borderRadius: 0,
                }}
                onFocus={e => (e.target.style.borderBottomColor = '#7c3aed')}
                onBlur={e => (e.target.style.borderBottomColor = '#1f1f2e')}
              />
            </div>

            <div style={{ paddingTop: 4 }}>
              <label style={{ color: '#374151', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform:'uppercase', display:'block', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position:'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="password" autoComplete="current-password" required
                  style={{
                    width: '100%', background: 'transparent',
                    borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                    borderBottom: '1px solid #1f1f2e',
                    padding: '8px 32px 8px 0', fontSize: 14, color: 'white',
                    outline: 'none', boxSizing: 'border-box', borderRadius: 0,
                  }}
                  onFocus={e => (e.target.style.borderBottomColor = '#7c3aed')}
                  onBlur={e => (e.target.style.borderBottomColor = '#1f1f2e')}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  style={{ position:'absolute', right:0, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#374151' }}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div style={{ paddingTop: 16 }}>
              <button type="submit" disabled={loading || !username || !password}
                style={{
                  width: '100%', padding: '11px 16px', borderRadius: 8, fontSize: 12,
                  fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: loading || !username || !password ? '#374151' : 'white',
                  border: `1px solid ${loading || !username || !password ? '#1f1f2e' : 'rgba(124,58,237,0.6)'}`,
                  background: loading || !username || !password ? 'transparent' : 'rgba(124,58,237,0.2)',
                  cursor: loading || !username || !password ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}>
                {loading
                  ? <div style={{ width:14, height:14, border:'2px solid rgba(124,58,237,0.3)', borderTopColor:'#7c3aed', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                  : <Cpu size={13} />}
                {loading ? 'Authenticating...' : 'Access Portal'}
              </button>
            </div>
          </form>

          <div style={{ marginTop: 32, color:'#1f1f2e', fontSize: 10, textAlign:'center' }}>
            v1.0 · © 2026 Kota Depok
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}