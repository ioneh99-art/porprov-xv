'use client'
// src/components/login/LoginKabBogor.tsx
// Login page Kab. Bogor — "Tegar Beriman"
// Luxury Dark Forest aesthetic — split layout

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn, AlertCircle, Monitor, Leaf } from 'lucide-react'

const PRIMARY   = '#065f46'
const SECONDARY = '#047857'
const ACCENT    = '#d97706'
const ACCENT_LT = '#fef3c7'

export default function LoginKabBogor() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

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
      localStorage.setItem('tenant_id', 'kabbogor')
      router.push(data.redirect)
    } catch { setError('Tidak dapat terhubung ke server'); setLoading(false) }
  }

  const STATS = [
    { label: 'Total Venue',       value: '10',   color: PRIMARY  },
    { label: 'Cabang Olahraga',   value: '10',   color: ACCENT   },
    { label: 'Target Medali Emas',value: '23',   color: PRIMARY  },
    { label: 'Status Kontingen',  value: 'AKTIF',color: '#059669'},
  ]

  const VENUES = [
    { nama: 'Stadion Pakansari Cibinong', status: 'AKTIF',   color: '#059669' },
    { nama: 'GOR Laga Tangkas Cibinong',  status: 'AKTIF',   color: '#059669' },
    { nama: 'Kolam Renang Pakansari',     status: 'AKTIF',   color: '#059669' },
    { nama: 'Hall Pencak Silat Sentul',   status: 'SIAP',    color: '#2563eb' },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: '#080e08', fontFamily:'system-ui,sans-serif' }}>

      {/* Gradient top bar */}
      <div style={{
        position:'fixed', top:0, left:0, right:0, height:3, zIndex:100,
        background:`linear-gradient(90deg, ${PRIMARY}, ${ACCENT}, ${SECONDARY})`,
      }}/>

      {/* ── PANEL KIRI ── */}
      <div className="hidden lg:flex w-[52%] flex-col relative overflow-hidden"
        style={{ background:'#050e08', borderRight:'1px solid #0d1f0d' }}>

        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `linear-gradient(${PRIMARY}08 1px, transparent 1px), linear-gradient(90deg, ${PRIMARY}08 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}/>

        {/* Radial glow */}
        <div className="absolute pointer-events-none" style={{
          top: -80, left: -80, width: 400, height: 400,
          background: `radial-gradient(circle, ${PRIMARY}15 0%, transparent 65%)`,
        }}/>
        <div className="absolute pointer-events-none" style={{
          bottom: -60, right: -60, width: 300, height: 300,
          background: `radial-gradient(circle, ${ACCENT}10 0%, transparent 65%)`,
        }}/>

        <div className="relative flex flex-col flex-1 px-10 pt-10">

          {/* Logo + nama */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-18 h-18 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ width:72, height:72, background:'rgba(255,255,255,0.06)', border:`2px solid ${PRIMARY}40` }}>
              <img src="/logos/kab-bogor.png" alt="Kab. Bogor"
                className="w-14 h-14 object-contain"
                onError={e => {
                  const el = e.target as HTMLImageElement
                  el.style.display = 'none'
                  if (el.parentElement) el.parentElement.innerHTML =
                    `<span style="color:${PRIMARY};font-size:18px;font-weight:900">KBR</span>`
                }}/>
            </div>
            <div>
              <div style={{ color:PRIMARY, fontSize:10, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:3 }}>
                PORPROV XV · JAWA BARAT 2026
              </div>
              <div style={{ color:'white', fontSize:20, fontWeight:800, lineHeight:1.1 }}>Kabupaten Bogor</div>
              <div style={{ color:'#4b7a55', fontSize:11, marginTop:2 }}>Tegar Beriman</div>
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-3 mb-8 px-4 py-2.5 rounded-xl"
            style={{ background:`${PRIMARY}12`, border:`1px solid ${PRIMARY}30` }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background:PRIMARY, flexShrink:0 }}/>
            <Leaf size={12} style={{ color:PRIMARY, flexShrink:0 }}/>
            <span style={{ color:PRIMARY, fontSize:11, fontWeight:700, letterSpacing:'0.1em' }}>
              KONTINGEN PREMIUM · SISTEM AKTIF
            </span>
            <Monitor size={12} style={{ color:`${PRIMARY}60`, marginLeft:'auto' }}/>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {STATS.map(stat => (
              <div key={stat.label} className="p-4 rounded-xl"
                style={{ background:`${stat.color}12`, border:`1px solid ${stat.color}25` }}>
                <div style={{ color:'#4b5563', fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>
                  {stat.label}
                </div>
                <div style={{ color:stat.color, fontSize:22, fontWeight:800, lineHeight:1 }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height:1, background:`linear-gradient(90deg, ${PRIMARY}40, ${ACCENT}25, transparent)`, marginBottom:20 }}/>

          {/* Venue list */}
          <div style={{ color:'#374151', fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:12 }}>
            Venue Unggulan
          </div>
          <div className="space-y-2">
            {VENUES.map((v, i) => (
              <div key={v.nama} className="flex items-center gap-3 py-2 px-3 rounded-lg"
                style={{ background:i<2?`${v.color}10`:'transparent', borderLeft:`2px solid ${i<2?v.color:'#0d1f0d'}` }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:v.color }}/>
                <span style={{ color:i<2?'#e5e7eb':'#4b5563', fontSize:11, flex:1 }}>{v.nama}</span>
                <span style={{ color:v.color, fontSize:9, fontWeight:700 }}>{v.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative px-10 py-6">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1" style={{ background:`${PRIMARY}20` }}/>
            <span style={{ color:'#1f2937', fontSize:10 }}>PORPROV XV Platform · KONI Jawa Barat 2026</span>
            <div className="h-px flex-1" style={{ background:`${SECONDARY}20` }}/>
          </div>
        </div>
      </div>

      {/* ── PANEL KANAN — Form ── */}
      <div className="flex-1 flex items-center justify-center px-10">
        <div className="w-full max-w-xs">

          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
              style={{ background:`${PRIMARY}15`, border:`2px solid ${PRIMARY}30` }}>
              <span style={{ color:PRIMARY, fontSize:18, fontWeight:900 }}>KBR</span>
            </div>
            <div style={{ color:'white', fontSize:16, fontWeight:800 }}>Kabupaten Bogor</div>
          </div>

          {/* Label */}
          <div style={{ color:PRIMARY, fontSize:9, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:8 }}>
            Portal Kontingen Premium
          </div>
          <h1 style={{ color:'white', fontSize:24, fontWeight:800, lineHeight:1.2, marginBottom:6 }}>
            Masuk ke War Room
          </h1>
          <p style={{ color:'#374151', fontSize:13, marginBottom:28 }}>
            Sistem Manajemen Kontingen Kab. Bogor
          </p>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-5"
              style={{ background:`${PRIMARY}10`, border:`1px solid ${PRIMARY}30` }}>
              <AlertCircle size={13} style={{ color:'#f87171', flexShrink:0 }}/>
              <span style={{ color:'#fca5a5', fontSize:12 }}>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ color:'#4b5563', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', display:'block', marginBottom:6 }}>
                Username
              </label>
              <input type="text" value={username} onChange={e=>setUsername(e.target.value)}
                placeholder="Masukkan username" required autoComplete="username"
                style={{ width:'100%', background:'#0a140a', border:`1px solid #1a2e1a`, borderRadius:10, padding:'10px 14px', fontSize:13, color:'white', outline:'none', boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor=PRIMARY}
                onBlur={e=>e.target.style.borderColor='#1a2e1a'}/>
            </div>
            <div>
              <label style={{ color:'#4b5563', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', display:'block', marginBottom:6 }}>
                Password
              </label>
              <div style={{ position:'relative' }}>
                <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder="Masukkan password" required autoComplete="current-password"
                  style={{ width:'100%', background:'#0a140a', border:`1px solid #1a2e1a`, borderRadius:10, padding:'10px 40px 10px 14px', fontSize:13, color:'white', outline:'none', boxSizing:'border-box' }}
                  onFocus={e=>e.target.style.borderColor=PRIMARY}
                  onBlur={e=>e.target.style.borderColor='#1a2e1a'}/>
                <button type="button" onClick={()=>setShowPass(s=>!s)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#374151' }}>
                  {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            {/* Demo autofill */}
            <div className="rounded-xl p-3" style={{ background:'#0a140a', border:`1px solid #1a2e1a` }}>
              <div style={{ color:'#374151', fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>
                Demo — klik autofill
              </div>
              {[
                { role:'Admin Kab. Bogor', user:'kab.bogor', pass:'admin123' },
              ].map(a => (
                <button key={a.role} type="button"
                  onClick={()=>{ setUsername(a.user); setPassword(a.pass) }}
                  className="w-full flex justify-between items-center px-2 py-1.5 rounded-lg transition-colors"
                  style={{ background:'transparent', border:'none', cursor:'pointer' }}
                  onMouseEnter={e=>(e.currentTarget.style.background=`${PRIMARY}15`)}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  <span style={{ color:'#4b5563', fontSize:11 }}>{a.role}</span>
                  <span style={{ color:`${PRIMARY}`, fontSize:10, fontFamily:'monospace' }}>{a.user}</span>
                </button>
              ))}
            </div>

            <button type="submit" disabled={loading||!username||!password}
              style={{
                width:'100%', padding:'12px', borderRadius:10, fontSize:13, fontWeight:700,
                color:'white', border:'none', cursor:loading||!username||!password?'not-allowed':'pointer',
                background: loading||!username||!password
                  ? '#1a2e1a'
                  : `linear-gradient(135deg, ${PRIMARY}, ${SECONDARY})`,
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                letterSpacing:'0.05em', textTransform:'uppercase', marginTop:8,
                boxShadow: loading||!username||!password ? 'none' : `0 0 24px ${PRIMARY}50`,
              }}>
              {loading
                ? <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Memverifikasi...</>
                : <><Monitor size={14}/> Masuk ke War Room</>
              }
            </button>
          </form>

          <div style={{ marginTop:24, textAlign:'center', color:'#1f2937', fontSize:11 }}>
            © 2026 Kabupaten Bogor · PORPROV XV Jawa Barat
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}