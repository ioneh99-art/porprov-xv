'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, Monitor } from 'lucide-react'
import { setTenantPersist } from '@/hooks/useTenant'

// Warna dari logo Kota Bekasi:
// #E84E0F — Oranye api (pita utama) → primary
// #1B6EC2 — Biru kuat (pita biru) → secondary
// #3AAA35 — Hijau gedung → accent/success
// #F5C518 — Kuning emas (pita kuning) → highlight

export default function LoginBekasi() {
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
      setTenantPersist('bekasi')
      // set login_origin agar logout redirect kembali ke halaman ini
      document.cookie = `login_origin=bekasi; path=/; max-age=${60*60*24*30}; samesite=lax`
      router.push(data.redirect)
    } catch { setError('Tidak dapat terhubung ke server'); setLoading(false) }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#080806', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── KIRI: Panel Bekasi ──────────────────────────────────── */}
      <div className="hidden lg:flex w-[52%] flex-col relative overflow-hidden"
        style={{ background: '#0c0b08', borderRight: '1px solid #1a1a14' }}>

        {/* Gradient bar — semua warna logo */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #E84E0F, #F5C518, #3AAA35, #1B6EC2)', flexShrink: 0 }} />

        {/* Background grid warm */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(232,78,15,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(232,78,15,0.04) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }} />
        {/* Warm glow kanan bawah */}
        <div className="absolute pointer-events-none" style={{
          bottom: -60, right: -60, width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(232,78,15,0.06) 0%, transparent 70%)',
        }} />

        <div className="relative flex flex-col flex-1 px-10 pt-10">
          {/* Logo + nama */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {/* Logo Bekasi */}
              <img
                src="/logos/bekasi.png"
                alt="Logo Kota Bekasi"
                className="w-14 h-14 object-contain"
                onError={e => {
                  // Fallback kalau logo belum ada
                  const el = e.target as HTMLImageElement
                  el.style.display = 'none'
                  el.parentElement!.innerHTML = '<span style="font-size:22px;font-weight:900;color:#E84E0F;">BKS</span>'
                }}
              />
            </div>
            <div>
              <div style={{ color: '#E84E0F', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>
                Tuan Rumah Klaster I
              </div>
              <div style={{ color: 'white', fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>Kota Bekasi</div>
              <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>Inovatif · Kreatif · Terdepan</div>
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-3 mb-8 px-4 py-2.5 rounded-xl"
            style={{ background: 'rgba(232,78,15,0.08)', border: '1px solid rgba(232,78,15,0.2)' }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#E84E0F', flexShrink: 0 }} />
            <span style={{ color: '#E84E0F', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em' }}>PORPROV XV · SISTEM AKTIF</span>
            <Monitor size={13} style={{ color: 'rgba(232,78,15,0.5)', marginLeft: 'auto' }} />
          </div>

          {/* Stats grid — 4 warna logo */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { label: 'Total Venue', value: '25', color: '#E84E0F', bg: 'rgba(232,78,15,0.08)', border: 'rgba(232,78,15,0.2)' },
              { label: 'Cabang Olahraga', value: '49', color: '#1B6EC2', bg: 'rgba(27,110,194,0.08)', border: 'rgba(27,110,194,0.2)' },
              { label: 'Nomor Pertandingan', value: '200+', color: '#F5C518', bg: 'rgba(245,197,24,0.08)', border: 'rgba(245,197,24,0.2)' },
              { label: 'Status Klaster', value: 'AKTIF', color: '#3AAA35', bg: 'rgba(58,170,53,0.08)', border: 'rgba(58,170,53,0.2)' },
            ].map(({ label, value, color, bg, border }) => (
              <div key={label} className="p-4 rounded-xl" style={{ background: bg, border: `1px solid ${border}` }}>
                <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                <div style={{ color, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Divider — gradient logo */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, #E84E0F40, #F5C51840, transparent)', marginBottom: 20 }} />

          {/* Venue list */}
          <div style={{ color: '#4b5563', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            Venue Unggulan
          </div>
          <div className="space-y-2">
            {[
              { nama: 'Stadion Patriot Candrabhaga', status: 'AKTIF', color: '#E84E0F' },
              { nama: 'GOR Bekasi Cyber Park', status: 'AKTIF', color: '#1B6EC2' },
              { nama: 'Kolam Renang Harapan Indah', status: 'SIAP', color: '#3AAA35' },
              { nama: 'Lapangan Tenis Bekasi Barat', status: 'SIAP', color: '#F5C518' },
            ].map(({ nama, status, color }, i) => (
              <div key={nama} className="flex items-center gap-3 py-2 px-3 rounded-lg"
                style={{ background: i < 2 ? `${color}10` : 'transparent', borderLeft: `2px solid ${i < 2 ? color : '#1a1a14'}` }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <span style={{ color: i < 2 ? '#e5e7eb' : '#6b7280', fontSize: 11, flex: 1 }}>{nama}</span>
                <span style={{ color, fontSize: 9, fontWeight: 700 }}>{status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative px-10 py-6">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1" style={{ background: 'rgba(232,78,15,0.15)' }} />
            <span style={{ color: '#374151', fontSize: 10 }}>PORPROV XV Platform · KONI Jawa Barat 2026</span>
            <div className="h-px flex-1" style={{ background: 'rgba(27,110,194,0.15)' }} />
          </div>
        </div>
      </div>

      {/* ── KANAN: Form Login ───────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-10">
        <div className="w-full max-w-xs">

          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src="/logos/bekasi.png" alt="Kota Bekasi" className="w-16 h-16 object-contain"
              onError={e => { (e.target as HTMLElement).style.display = 'none' }} />
            <div style={{ color: 'white', fontSize: 16, fontWeight: 800, marginTop: 8 }}>Kota Bekasi</div>
          </div>

          {/* Header form */}
          <div className="mb-8">
            <div style={{ color: '#E84E0F', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>
              Command Center · Klaster I
            </div>
            <h1 style={{ color: 'white', fontSize: 24, fontWeight: 800, lineHeight: 1.2, marginBottom: 6 }}>
              Masuk ke Portal<br />
              <span style={{ color: '#E84E0F' }}>Kota Bekasi</span>
            </h1>
            <p style={{ color: '#4b5563', fontSize: 13 }}>Sistem manajemen kontingen & penyelenggara</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4"
              style={{ background: 'rgba(232,78,15,0.08)', border: '1px solid rgba(232,78,15,0.25)' }}>
              <AlertCircle size={13} style={{ color: '#E84E0F', flexShrink: 0 }} />
              <span style={{ color: '#fca5a5', fontSize: 12 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Masukkan username" autoComplete="username" required
                style={{ width: '100%', background: '#141210', border: '1px solid #242018', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#E84E0F'}
                onBlur={e => e.target.style.borderColor = '#242018'} />
            </div>
            <div>
              <label style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan password" autoComplete="current-password" required
                  style={{ width: '100%', background: '#141210', border: '1px solid #242018', borderRadius: 10, padding: '10px 40px 10px 14px', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#E84E0F'}
                  onBlur={e => e.target.style.borderColor = '#242018'} />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || !username || !password}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                color: 'white', border: 'none', cursor: loading || !username || !password ? 'not-allowed' : 'pointer',
                background: loading || !username || !password
                  ? '#1a1a14'
                  : 'linear-gradient(135deg, #E84E0F, #c43d0a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 8,
                boxShadow: loading || !username || !password ? 'none' : '0 0 20px rgba(232,78,15,0.25)',
              }}>
              {loading
                ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                : <Monitor size={14} />}
              {loading ? 'Memverifikasi...' : 'Masuk ke Command Center'}
            </button>
          </form>

          <div style={{ marginTop: 28, textAlign: 'center', color: '#374151', fontSize: 11 }}>
            © 2026 Kota Bekasi · PORPROV XV Jawa Barat
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}