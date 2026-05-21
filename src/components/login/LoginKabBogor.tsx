'use client'
// src/components/login/LoginKabBogor.tsx
// Kab. Bogor Enterprise Login — "Tactical Command Entry"
// Aesthetic: Dark Military-Organic — deep forest ops center
// Peta Leaflet interaktif kiri + glass morphism form kanan

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, ChevronRight, Activity } from 'lucide-react'
import type { Map as LeafletMap } from 'leaflet'

// ── Venue data Kab. Bogor untuk peta login ──────────────
const LOGIN_VENUES = [
  { nama:'Stadion Pakansari',        lat:-6.4862, lng:106.8538, cabor:'Atletik',      status:'aktif'   },
  { nama:'GOR Laga Tangkas',         lat:-6.4790, lng:106.8580, cabor:'Bulu Tangkis', status:'aktif'   },
  { nama:'Kolam Renang Pakansari',   lat:-6.4895, lng:106.8510, cabor:'Akuatik',      status:'aktif'   },
  { nama:'Hall Silat Sentul',        lat:-6.5612, lng:106.8934, cabor:'Pencak Silat', status:'siap'    },
  { nama:'Dojo Karate Bogor',        lat:-6.5734, lng:106.7893, cabor:'Karate',       status:'siap'    },
  { nama:'Hall Taekwondo Cibinong',  lat:-6.4756, lng:106.8623, cabor:'Taekwondo',    status:'aktif'   },
  { nama:'GOR Volly Cibinong',       lat:-6.4823, lng:106.8501, cabor:'Voli',         status:'siap'    },
  { nama:'Lapangan Panahan Sentul',  lat:-6.5534, lng:106.8867, cabor:'Panahan',      status:'standby' },
  { nama:'Hall Basket Cibinong',     lat:-6.4912, lng:106.8645, cabor:'Basket',       status:'standby' },
  { nama:'Stadion Sepak Bola PKS',   lat:-6.4834, lng:106.8492, cabor:'Sepak Bola',   status:'aktif'   },
]

const STATUS_COLOR: Record<string,string> = {
  aktif:'#059669', siap:'#2563eb', standby:'#d97706', masalah:'#dc2626'
}

const STATS = [
  { label:'Total Atlet',     value:'1.097', color:'#34d399' },
  { label:'Cabang Olahraga', value:'54',    color:'#d97706' },
  { label:'Total Venue',     value:'10',    color:'#60a5fa' },
  { label:'Status',          value:'AKTIF', color:'#34d399' },
]

// Nama atlet untuk ticker
const ATLET_NAMES = [
  'Deni Firmansyah','Putri Ayu','Hendra Kurnia','Reza Maulana','Sri Wahyuni',
  'Andi Saputra','Bayu Nugraha','Siti Rahayu','Ahmad Fauzi','Dewi Lestari',
  'Muhammad Rizal','Anisa Putri','Budi Santoso','Rina Wati','Fajar Nugroho',
  'Sari Indah','Kevin Pratama','Maya Sari','Doni Kusuma','Fitria Handayani',
]

// ── Peta Leaflet untuk login ─────────────────────────────
function LoginMap() {
  const mapRef         = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletMap|null>(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      if (!mapRef.current) return
      const L = (await import('leaflet')).default
      // @ts-ignore
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !mapRef.current) return
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }
      const el = mapRef.current as HTMLDivElement & { _leaflet_id?: number }
      if (el._leaflet_id) el._leaflet_id = undefined

      const map = L.map(mapRef.current, {
        center: [-6.4862, 106.8538],
        zoom: 11,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
        doubleClickZoom: false,
        keyboard: false,
      })
      mapInstanceRef.current = map

      // Dark forest tile
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        opacity: 0.85,
      }).addTo(map)

      // Venue markers
      LOGIN_VENUES.forEach(v => {
        const color = STATUS_COLOR[v.status] || '#059669'
        const isAktif = v.status === 'aktif'

        // Outer pulse ring
        if (isAktif) {
          L.circleMarker([v.lat, v.lng], {
            radius: 18, fillColor: color, color: color,
            weight: 1, opacity: 0.2, fillOpacity: 0.1,
          }).addTo(map)
        }

        // Main dot
        L.circleMarker([v.lat, v.lng], {
          radius: isAktif ? 9 : 6,
          fillColor: color, color: '#ffffff',
          weight: 1.5, opacity: 1, fillOpacity: 0.9,
        }).addTo(map)
          .bindTooltip(`<b style="font-size:11px">${v.nama}</b><br><span style="font-size:9px;color:${color}">${v.cabor}</span>`, {
            permanent: false,
            className: 'login-map-tooltip',
          })
      })

      // Area boundary circle Cibinong
      L.circle([-6.4862, 106.8538], {
        radius: 15000,
        color: '#065f46',
        weight: 1,
        opacity: 0.3,
        fillColor: '#065f46',
        fillOpacity: 0.05,
        dashArray: '6,4',
      }).addTo(map)
    }
    void init()
    return () => {
      cancelled = true
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }
    }
  }, [])

  return (
    <div ref={mapRef} className="w-full h-full" />
  )
}

// ── Ticker animasi nama atlet ────────────────────────────
function AtletTicker() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % ATLET_NAMES.length), 2000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: '#34d399' }}/>
      <span key={idx} className="text-xs truncate" style={{
        color: '#6ee7b7',
        animation: 'fadeSlide 0.4s ease',
      }}>
        {ATLET_NAMES[idx]}
      </span>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────
export default function LoginKabBogor() {
  const router   = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login gagal'); setLoading(false); return }
      document.cookie = `login_origin=kabbogor; path=/; max-age=${60*60*24*30}; samesite=lax`
      document.cookie = `tenant_id=kabbogor; path=/; max-age=${60*60*8}; samesite=lax`
      if (typeof window !== 'undefined') localStorage.setItem('tenant_id', 'kabbogor')
      router.push(data.redirect)
    } catch {
      setError('Tidak dapat terhubung ke server')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{
      background: '#020d06',
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeSlide { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes scanline {
          0% { transform: translateY(-100%) }
          100% { transform: translateY(100vh) }
        }
        @keyframes pulse-ring {
          0% { transform:scale(1); opacity:0.6 }
          100% { transform:scale(2.5); opacity:0 }
        }
        @keyframes float {
          0%,100% { transform:translateY(0) }
          50% { transform:translateY(-8px) }
        }
        .login-map-tooltip {
          background: rgba(6,15,8,0.95) !important;
          border: 1px solid #065f46 !important;
          border-radius: 8px !important;
          color: white !important;
          padding: 6px 10px !important;
          font-family: 'DM Sans', sans-serif !important;
          box-shadow: 0 4px 20px rgba(5,150,105,0.3) !important;
        }
        .login-map-tooltip::before { display:none !important }
        .leaflet-container { background: #020d06 !important }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px #071a0c inset !important;
          -webkit-text-fill-color: #e2e8f0 !important;
        }
      `}</style>

      {/* ── KIRI: Peta + Overlay ── */}
      <div className="hidden lg:flex w-[58%] relative overflow-hidden flex-col">

        {/* Peta Leaflet full */}
        <div className="absolute inset-0">
          {mounted && <LoginMap/>}
        </div>

        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
          zIndex: 10,
        }}/>

        {/* Gradient overlays */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(to right, rgba(2,13,6,0.3) 0%, transparent 30%, transparent 70%, rgba(2,13,6,0.8) 100%)',
          zIndex: 11,
        }}/>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(to bottom, rgba(2,13,6,0.6) 0%, transparent 20%, transparent 75%, rgba(2,13,6,0.9) 100%)',
          zIndex: 11,
        }}/>

        {/* Top header bar */}
        <div className="relative z-20 flex items-center justify-between px-8 pt-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden border"
              style={{ background: 'rgba(6,95,70,0.3)', borderColor: 'rgba(52,211,153,0.3)' }}>
              <img src="/logos/kab-bogor.png" alt="Kab. Bogor"
                className="w-8 h-8 object-contain"
                onError={e => {
                  const el = e.target as HTMLImageElement
                  el.style.display = 'none'
                  if (el.parentElement) el.parentElement.innerHTML =
                    '<span style="color:#34d399;font-weight:900;font-size:11px">KBR</span>'
                }}/>
            </div>
            <div>
              <div style={{ color: '#34d399', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                KABUPATEN BOGOR
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>PORPROV XV · 2026</div>
            </div>
          </div>
          {/* Live indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(52,211,153,0.3)' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#34d399' }}/>
            <span style={{ color: '#34d399', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em' }}>
              SISTEM AKTIF
            </span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-20 flex-1 flex flex-col items-start justify-center px-10">
          <div style={{ color: '#34d399', fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 12 }}>
            ◆ TACTICAL COMMAND CENTER
          </div>
          <h1 style={{
            color: 'white', fontSize: 42, fontWeight: 800, lineHeight: 1.1,
            fontFamily: "'DM Sans', sans-serif", marginBottom: 12,
            textShadow: '0 0 40px rgba(52,211,153,0.3)',
          }}>
            Tegar<br/>
            <span style={{ color: '#34d399' }}>Beriman</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.6, maxWidth: 320 }}>
            Sistem manajemen kontingen premium<br/>PORPROV XV Jawa Barat 2026
          </p>
        </div>

        {/* Bottom stats + ticker */}
        <div className="relative z-20 px-8 pb-8 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {STATS.map(s => (
              <div key={s.label} className="rounded-xl p-3" style={{
                background: 'rgba(6,15,8,0.8)',
                border: '1px solid rgba(52,211,153,0.15)',
                backdropFilter: 'blur(8px)',
              }}>
                <div style={{ color: s.color, fontSize: 20, fontWeight: 800, lineHeight: 1, fontFamily: "'DM Mono', monospace" }}>
                  {s.value}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 3 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Venue status legend */}
          <div className="flex items-center gap-4 px-3 py-2 rounded-xl" style={{
            background: 'rgba(6,15,8,0.7)',
            border: '1px solid rgba(52,211,153,0.1)',
          }}>
            {Object.entries(STATUS_COLOR).map(([s, c]) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: c }}/>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, textTransform: 'capitalize' }}>{s}</span>
              </div>
            ))}
            <div className="flex-1"/>
            <AtletTicker/>
          </div>
        </div>
      </div>

      {/* ── KANAN: Form Login ── */}
      <div className="flex-1 flex items-center justify-center relative px-8 py-12"
        style={{ background: 'linear-gradient(135deg, #020d06 0%, #041209 50%, #020d06 100%)' }}>

        {/* Subtle grid background */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(52,211,153,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}/>

        {/* Corner decorations */}
        <div className="absolute top-8 left-8 w-8 h-8 pointer-events-none" style={{
          borderTop: '2px solid rgba(52,211,153,0.3)',
          borderLeft: '2px solid rgba(52,211,153,0.3)',
        }}/>
        <div className="absolute bottom-8 right-8 w-8 h-8 pointer-events-none" style={{
          borderBottom: '2px solid rgba(52,211,153,0.3)',
          borderRight: '2px solid rgba(52,211,153,0.3)',
        }}/>

        <div className="relative z-10 w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(6,95,70,0.2)', border: '2px solid rgba(52,211,153,0.3)' }}>
              <span style={{ color: '#34d399', fontSize: 18, fontWeight: 900 }}>KBR</span>
            </div>
            <div style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>Kabupaten Bogor</div>
            <div style={{ color: '#34d399', fontSize: 10, letterSpacing: '0.2em' }}>TEGAR BERIMAN</div>
          </div>

          {/* Label & title */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.4))' }}/>
              <span style={{ color: '#34d399', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                COMMAND ACCESS
              </span>
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(52,211,153,0.4), transparent)' }}/>
            </div>
            <h2 style={{ color: 'white', fontSize: 26, fontWeight: 800, lineHeight: 1.2, marginBottom: 6 }}>
              Masuk ke<br/>
              <span style={{ color: '#34d399' }}>War Room</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
              Kab. Bogor · Premium Kontingen · 1.097 Atlet
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5" style={{
              background: 'rgba(220,38,38,0.1)',
              border: '1px solid rgba(220,38,38,0.3)',
            }}>
              <AlertCircle size={14} style={{ color: '#f87171', flexShrink: 0 }}/>
              <span style={{ color: '#fca5a5', fontSize: 12 }}>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username */}
            <div>
              <label style={{
                color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 8,
              }}>
                Username
              </label>
              <div className="relative">
                <input
                  type="text" value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Masukkan username" required autoComplete="username"
                  style={{
                    width: '100%', background: 'rgba(6,15,8,0.8)',
                    border: '1px solid rgba(52,211,153,0.2)',
                    borderRadius: 12, padding: '12px 16px',
                    fontSize: 13, color: 'white', outline: 'none',
                    boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif",
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#34d399'
                    e.target.style.boxShadow = '0 0 0 3px rgba(52,211,153,0.1)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(52,211,153,0.2)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{
                color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 8,
              }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan password" required autoComplete="current-password"
                  style={{
                    width: '100%', background: 'rgba(6,15,8,0.8)',
                    border: '1px solid rgba(52,211,153,0.2)',
                    borderRadius: 12, padding: '12px 44px 12px 16px',
                    fontSize: 13, color: 'white', outline: 'none',
                    boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif",
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#34d399'
                    e.target.style.boxShadow = '0 0 0 3px rgba(52,211,153,0.1)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(52,211,153,0.2)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{
                  position: 'absolute', right: 14, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.3)',
                }}>
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* Demo autofill */}
            <div className="rounded-xl p-3" style={{
              background: 'rgba(6,15,8,0.6)',
              border: '1px solid rgba(52,211,153,0.1)',
            }}>
              <div style={{
                color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8,
              }}>
                ◆ Demo Access
              </div>
              <button type="button"
                onClick={() => { setUsername('kab.bogor'); setPassword('admin123') }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Admin Kab. Bogor</span>
                <div className="flex items-center gap-1.5">
                  <span style={{ color: '#34d399', fontSize: 10, fontFamily: "'DM Mono', monospace" }}>kab.bogor</span>
                  <ChevronRight size={10} style={{ color: '#34d399' }}/>
                </div>
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              style={{
                width: '100%', padding: '14px',
                borderRadius: 12, fontSize: 13, fontWeight: 700,
                color: loading || !username || !password ? 'rgba(255,255,255,0.3)' : 'white',
                border: 'none', cursor: loading || !username || !password ? 'not-allowed' : 'pointer',
                background: loading || !username || !password
                  ? 'rgba(6,15,8,0.6)'
                  : 'linear-gradient(135deg, #065f46 0%, #059669 50%, #047857 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                boxShadow: loading || !username || !password
                  ? 'none'
                  : '0 0 30px rgba(5,150,105,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                transition: 'all 0.2s',
                fontFamily: "'DM Sans', sans-serif",
                marginTop: 8,
              }}>
              {loading ? (
                <>
                  <div style={{
                    width: 16, height: 16,
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}/>
                  Memverifikasi...
                </>
              ) : (
                <>
                  <Activity size={15}/>
                  Masuk ke Command Center
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1" style={{ background: 'rgba(52,211,153,0.1)' }}/>
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9 }}>SECURED</span>
              <div className="h-px flex-1" style={{ background: 'rgba(52,211,153,0.1)' }}/>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10 }}>
              © 2026 Kabupaten Bogor · PORPROV XV Jawa Barat
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}