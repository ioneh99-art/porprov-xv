'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, Leaf } from 'lucide-react'
import { setTenantPersist } from '@/hooks/useTenant'

// BOGOR — Nature/Organic Style
// Layout: centered card besar, panel kiri alam/natural
// Karakter: hijau organik, ornamen daun, nuansa Kota Hujan

export default function LoginBogor() {
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
      setTenantPersist('bogor')
      router.push(data.redirect)
    } catch { setError('Tidak dapat terhubung ke server'); setLoading(false) }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#050e08' }}>

      {/* ── KIRI: Nature Panel ───────────────────────────────── */}
      <div className="hidden lg:flex w-[50%] flex-col justify-between px-12 py-12 relative overflow-hidden"
        style={{ background: '#060f09' }}>

        {/* Organic blob decorations */}
        <div className="absolute" style={{
          top: '-60px', left: '-60px', width: 280, height: 280,
          borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%',
          background: 'rgba(22,163,74,0.07)',
        }} />
        <div className="absolute" style={{
          bottom: '60px', right: '-40px', width: 200, height: 200,
          borderRadius: '40% 60% 30% 70% / 60% 40% 60% 40%',
          background: 'rgba(22,163,74,0.05)',
        }} />
        <div className="absolute" style={{
          top: '40%', left: '20%', width: 120, height: 120,
          borderRadius: '50% 50% 70% 30% / 40% 60% 40% 60%',
          background: 'rgba(22,163,74,0.04)',
        }} />

        {/* SVG ornamen daun */}
        <svg className="absolute" style={{ top: 40, right: 40, opacity: 0.12 }}
          width="120" height="120" viewBox="0 0 120 120">
          <path d="M60 10 C60 10, 100 30, 100 70 C100 90, 80 110, 60 110 C60 110, 60 60, 20 40 C20 40, 40 10, 60 10Z"
            fill="#16a34a" />
          <line x1="60" y1="10" x2="60" y2="110" stroke="#16a34a" strokeWidth="1.5" opacity="0.5" />
          <line x1="60" y1="40" x2="90" y2="55" stroke="#16a34a" strokeWidth="1" opacity="0.4" />
          <line x1="60" y1="60" x2="85" y2="72" stroke="#16a34a" strokeWidth="1" opacity="0.4" />
          <line x1="60" y1="45" x2="35" y2="55" stroke="#16a34a" strokeWidth="1" opacity="0.3" />
        </svg>

        <svg className="absolute" style={{ bottom: 80, left: 30, opacity: 0.08, transform: 'rotate(-30deg)' }}
          width="80" height="80" viewBox="0 0 120 120">
          <path d="M60 10 C60 10, 100 30, 100 70 C100 90, 80 110, 60 110 C60 110, 60 60, 20 40 C20 40, 40 10, 60 10Z"
            fill="#16a34a" />
        </svg>

        {/* Top content */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(22,163,74,0.2)', border: '1.5px solid rgba(22,163,74,0.4)' }}>
              <Leaf size={18} style={{ color: '#16a34a' }} />
            </div>
            <div>
              <div style={{ color: '#16a34a', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform:'uppercase' }}>
                Tuan Rumah Klaster II
              </div>
              <div style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>Kota Bogor</div>
            </div>
          </div>

          {/* Quote khas Bogor */}
          <div className="mb-8 pl-4" style={{ borderLeft: '3px solid rgba(22,163,74,0.5)' }}>
            <div style={{ color: '#86efac', fontSize: 20, fontWeight: 700, lineHeight: 1.3, marginBottom: 6 }}>
              Kota Hujan yang<br />Melahirkan Juara
            </div>
            <div style={{ color: '#4b5563', fontSize: 12, lineHeight: 1.6 }}>
              Dari bumi Bogor yang subur,<br />
              atlet-atlet terbaik Jawa Barat berjaya.
            </div>
          </div>

          {/* Stats organik */}
          <div className="space-y-3">
            {[
              { label: 'Venue Dikelola', value: '14', desc: 'Tersebar di Kota Bogor' },
              { label: 'Cabang Olahraga', value: '31', desc: 'Termasuk outdoor & alam' },
              { label: 'Nomor Pertandingan', value: '120+', desc: 'Klaster II' },
            ].map(({ label, value, desc }) => (
              <div key={label} className="flex items-center gap-4 py-3 px-4 rounded-2xl"
                style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.1)' }}>
                <div style={{ color: '#16a34a', fontSize: 26, fontWeight: 800, minWidth: 52, lineHeight: 1 }}>{value}</div>
                <div>
                  <div style={{ color: '#d1fae5', fontSize: 12, fontWeight: 600 }}>{label}</div>
                  <div style={{ color: '#374151', fontSize: 10 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1" style={{ background: 'rgba(22,163,74,0.15)' }} />
            <Leaf size={12} style={{ color: 'rgba(22,163,74,0.3)' }} />
            <span style={{ color: '#374151', fontSize: 10 }}>PORPROV XV Platform · KONI Jabar 2026</span>
            <Leaf size={12} style={{ color: 'rgba(22,163,74,0.3)' }} />
            <div className="h-px flex-1" style={{ background: 'rgba(22,163,74,0.15)' }} />
          </div>
        </div>
      </div>

      {/* ── KANAN: Form Login ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-10">
        <div className="w-full max-w-xs">

          {/* Badge organik */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8"
            style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)' }}>
            <Leaf size={11} style={{ color: '#16a34a' }} />
            <span style={{ color: '#16a34a', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em' }}>
              KOTA BOGOR · PORPROV XV 2026
            </span>
          </div>

          <h1 style={{ color: 'white', fontSize: 26, fontWeight: 700, marginBottom: 4, lineHeight: 1.2 }}>
            Selamat Datang
          </h1>
          <p style={{ color: '#4b5563', fontSize: 13, marginBottom: 28, lineHeight: 1.5 }}>
            Portal manajemen kontingen<br />& penyelenggaraan Klaster II
          </p>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3 mb-4"
              style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
              <AlertCircle size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
              <span style={{ color: '#fca5a5', fontSize: 12 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ color: '#4b5563', fontSize: 11, fontWeight: 500, display:'block', marginBottom: 8 }}>
                Username
              </label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Masukkan username" autoComplete="username" required
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14, padding: '11px 16px', fontSize: 13, color: 'white',
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(22,163,74,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            <div>
              <label style={{ color: '#4b5563', fontSize: 11, fontWeight: 500, display:'block', marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan password" autoComplete="current-password" required
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14, padding: '11px 44px 11px 16px', fontSize: 13, color: 'white',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(22,163,74,0.6)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#4b5563' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || !username || !password}
              style={{
                width: '100%', padding: '12px', borderRadius: 14, fontSize: 13, fontWeight: 600,
                color: 'white', border: 'none', cursor: loading || !username || !password ? 'not-allowed' : 'pointer',
                background: loading || !username || !password
                  ? 'rgba(255,255,255,0.05)'
                  : 'linear-gradient(135deg, #16a34a, #15803d)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 8,
              }}>
              {loading
                ? <div style={{ width:15, height:15, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                : <Leaf size={14} />}
              {loading ? 'Memverifikasi...' : 'Masuk ke Portal Bogor'}
            </button>
          </form>

          <div style={{ marginTop: 28, textAlign:'center', color:'#374151', fontSize: 11 }}>
            © 2026 Kota Bogor · PORPROV XV Jawa Barat
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}