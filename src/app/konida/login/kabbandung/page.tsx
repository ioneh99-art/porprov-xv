'use client'
// src/app/login/kabbandung/page.tsx
// Kab. Bandung Enterprise Login
// Background: peta wilayah Kab. Bandung + Sapphire/Midnight Blue Theme

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, ChevronRight, Activity, MapPin, Shield, Loader2 } from 'lucide-react'

const STATS = [
  { label: 'Total Atlet',     value: '1.205', color: 'text-blue-400',   icon: '🏃' },
  { label: 'Cabang Olahraga', value: '56',    color: 'text-amber-400',  icon: '🏅' },
  { label: 'Total Venue',     value: '12',    color: 'text-cyan-400',   icon: '🏟️' },
  { label: 'Kecamatan',       value: '31',    color: 'text-indigo-400', icon: '📍' },
]

const VENUES = [
  { nama: 'Stadion Si Jalak Harupat', cabor: 'Sepak Bola',  status: 'AKTIF'  },
  { nama: 'Danau Situ Cileunca',      cabor: 'Dayung',      status: 'AKTIF'  },
  { nama: 'GOR Sabilulungan',         cabor: 'Indoor',      status: 'AKTIF'  },
  { nama: 'SOR Ciateul',              cabor: 'Bela Diri',   status: 'SIAP'   },
]

const ATLET_NAMES = [
  'Asep Sunandar · Angkat Besi','Neng Yeni · Akuatik','Jajang Mulyana · Voli',
  'Eulis Kartika · Pencak Silat','Dadang Subur · Catur','Risa Amelia · Panahan',
  'Galih Purnama · Sepak Bola','Siti Maemunah · Dayung','Hendra Setia · Karate',
]

function AtletTicker() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  
  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i + 1) % ATLET_NAMES.length); setVisible(true) }, 300)
    }, 2500)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(96,165,250,0.8)]"/>
      <span className={`text-[11px] text-blue-200 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        {ATLET_NAMES[idx]}
      </span>
    </div>
  )
}

export default function LoginKabBandung() {
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login gagal'); setLoading(false); return }
      
      document.cookie = `login_origin=kabbandung; path=/; max-age=${60*60*24*30}; samesite=lax`
      document.cookie = `tenant_id=kabbandung; path=/; max-age=${60*60*8}; samesite=lax`
      localStorage.setItem('tenant_id', 'kabbandung')
      router.push(data.redirect)
    } catch { 
      setError('Tidak dapat terhubung ke server'); 
      setLoading(false) 
    }
  }

  const isFormValid = username.trim() !== '' && password.trim() !== ''

  return (
    // Background diubah menjadi Midnight Blue (#020617)
    <div className="min-h-screen flex overflow-hidden font-sans bg-[#020617]">
      
      {/* ── KIRI: Panel Informasi & Peta Background ── */}
      <div className="hidden lg:flex w-[58%] relative overflow-hidden flex-col p-10 justify-between">
        
        {/* === LAYER 0: PETA ILUSTRASI (Paling Belakang) === */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none saturate-50 bg-[url('/logos/peta_kabbandung.jpg')] bg-cover bg-center" />
        
        {/* === LAYER 1: TINT & OVERLAYS === */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-br from-[#020617]/85 via-[#0f172a]/70 to-[#020617]/90 pointer-events-none" />
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(96,165,250,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.06) 1px, transparent 1px)', backgroundSize: '40px 40px' }}/>
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(2,6,23,0.8)_100%)] pointer-events-none" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-transparent via-transparent to-[#020617]/95 pointer-events-none" />

        {/* === LAYER 10: KONTEN UTAMA (Header) === */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-900/35 border-2 border-blue-400/40 flex items-center justify-center overflow-hidden backdrop-blur-sm shadow-[0_0_15px_rgba(96,165,250,0.2)]">
              <img src="/logos/kab-bandung.png" alt="" className="w-8 h-8 object-contain"
                onError={e => {
                  const el = e.target as HTMLImageElement; el.style.display='none'
                  if(el.parentElement) el.parentElement.innerHTML='<span class="text-blue-400 font-black text-xs">KBD</span>'
                }}/>
            </div>
            <div>
              <div className="text-blue-400 text-[9px] font-bold tracking-[0.2em] uppercase">Kabupaten Bandung</div>
              <div className="text-white/40 text-[9px] mt-0.5 font-medium">PORPROV XV · JAWA BARAT 2026</div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/15 border border-blue-400/30 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]"/>
            <span className="text-blue-400 text-[9px] font-bold tracking-[0.15em]">SISTEM AKTIF</span>
          </div>
        </div>

        {/* === LAYER 10: KONTEN UTAMA (Teks Sabilulungan Bedas) === */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="text-amber-400 text-[10px] font-bold tracking-[0.25em] uppercase mb-4 flex items-center gap-2">
            <MapPin size={12} className="text-amber-400"/> PUSAT KOMANDO KONTINGEN
          </div>
          <h1 className="text-white text-5xl font-extrabold leading-[1.1] mb-4 tracking-tight drop-shadow-[0_0_40px_rgba(96,165,250,0.25)]">
            Sabilulungan<br/><span className="text-blue-400">Bedas</span>
          </h1>
          <p className="text-white/60 text-[13px] leading-relaxed max-w-[320px] font-medium">
            Sistem manajemen kontingen premium<br/>
            Kabupaten Bandung · PORPROV XV 2026
          </p>

          {/* Wilayah Info */}
          <div className="flex gap-4 mt-8 p-4 bg-[#0f172a]/60 rounded-xl border border-blue-400/10 backdrop-blur-md max-w-md">
            {[
              { v:'31', l:'Kecamatan' },
              { v:'10', l:'Kelurahan' },
              { v:'270', l:'Desa' },
              { v:'1.762', l:'km²' },
            ].map(s=>(
              <div key={s.l} className="text-center flex-1 border-r border-white/5 last:border-0">
                <div className="text-blue-400 text-base font-extrabold">{s.v}</div>
                <div className="text-white/40 text-[9px] mt-1 font-medium tracking-wide uppercase">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* === LAYER 10: KONTEN UTAMA (Bottom Stats & Ticker) === */}
        <div className="relative z-10 flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-3">
            {STATS.map(s => (
              <div key={s.label} className="p-3 rounded-xl bg-[#0f172a]/75 border border-blue-400/10 backdrop-blur-md hover:bg-[#0f172a]/90 transition-colors">
                <div className="text-[10px] mb-1">{s.icon}</div>
                <div className={`text-xl font-extrabold tabular-nums ${s.color}`}>{s.value}</div>
                <div className="text-white/40 text-[8px] uppercase tracking-[0.08em] mt-1 font-semibold">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="text-white/30 text-[9px] font-bold tracking-[0.15em] uppercase mb-1">
              Venue Unggulan
            </div>
            {VENUES.map((v, i) => (
              <div key={v.nama} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-l-2 transition-all ${
                i < 2 ? 'bg-blue-400/5 border-blue-400' : 'bg-transparent border-blue-400/10 hover:bg-white/5'
              }`}>
                <div className={`flex-1 text-[10px] font-medium ${i < 2 ? 'text-slate-200' : 'text-white/40'}`}>{v.nama}</div>
                <span className="text-blue-400 text-[8px] font-bold tracking-wider">{v.status}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#0f172a]/50 border border-blue-400/10 backdrop-blur-sm mt-2">
            <span className="text-white/40 text-[9px] font-bold tracking-wider">ATLET TERDAFTAR</span>
            <AtletTicker/>
          </div>
        </div>
      </div>

      {/* ── KANAN: Form Login ── */}
      <div className="flex-1 flex items-center justify-center relative p-8 bg-gradient-to-br from-[#020617] via-[#081326] to-[#020617]">
        
        {/* Grid Background */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(96,165,250,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.03) 1px, transparent 1px)', backgroundSize: '28px 28px' }}/>

        {/* Glassmorphism Card Wrapper */}
        <div className="relative z-10 w-full max-w-[380px] p-8 rounded-3xl bg-[#0b1324]/95 backdrop-blur-xl border border-blue-800/60 shadow-2xl shadow-black">
          
          {/* Corner Brackets */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-400/30 rounded-tl-3xl pointer-events-none"/>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-400/30 rounded-br-3xl pointer-events-none"/>

          {/* Mobile Header (Hidden on Desktop) */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="w-14 h-14 rounded-2xl mb-3 bg-blue-900/20 border-2 border-blue-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(96,165,250,0.15)]">
              <span className="text-blue-400 text-lg font-black">KBD</span>
            </div>
            <div className="text-white text-lg font-extrabold tracking-tight">Kabupaten Bandung</div>
            <div className="text-blue-400 text-[9px] tracking-[0.2em] mt-1 font-bold">SABILULUNGAN BEDAS</div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-blue-400/30"/>
            <div className="flex items-center gap-1.5 px-2">
              <Shield size={12} className="text-amber-400"/>
              <span className="text-blue-400 text-[10px] font-bold tracking-[0.2em] uppercase">Command Access</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-blue-400/30 to-transparent"/>
          </div>

          <h2 className="text-white text-3xl font-extrabold leading-tight mb-2 tracking-tight">
            Masuk ke<br/><span className="text-blue-400">War Room</span>
          </h2>
          <p className="text-white/70 text-xs mb-8 font-medium">
            Kab. Bandung · Premium Kontingen · 1.205 Atlet
          </p>

          {/* Error Message */}
          <div className={`flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 transition-all duration-300 overflow-hidden ${error ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 !py-0 !mb-0 border-transparent'}`}>
            <AlertCircle size={16} className="text-red-400 flex-shrink-0"/>
            <span className="text-red-300 text-xs font-medium">{error}</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Username */}
            <div>
              <label htmlFor="username" className="text-white/70 text-[10px] font-bold tracking-[0.15em] uppercase block mb-2">Username</label>
              <input 
                id="username"
                type="text" 
                value={username} 
                onChange={e=>setUsername(e.target.value)}
                placeholder="Masukkan username" 
                required 
                autoComplete="username"
                className="w-full bg-[#020617] border border-blue-400/40 rounded-xl px-4 py-3 text-[13px] text-white outline-none transition-all placeholder:text-white/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 shadow-inner"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="text-white/70 text-[10px] font-bold tracking-[0.15em] uppercase block mb-2">Password</label>
              <div className="relative">
                <input 
                  id="password"
                  type={showPass ? 'text' : 'password'} 
                  value={password} 
                  onChange={e=>setPassword(e.target.value)}
                  placeholder="Masukkan password" 
                  required 
                  autoComplete="current-password"
                  className="w-full bg-[#020617] border border-blue-400/40 rounded-xl pl-4 pr-11 py-3 text-[13px] text-white outline-none transition-all placeholder:text-white/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 shadow-inner"
                />
                <button 
                  type="button" 
                  aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
                  onClick={()=>setShowPass(s=>!s)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-blue-400 transition-colors p-1"
                >
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* Demo Autofill */}
            <div className="mt-2 rounded-xl p-3 bg-[#020617]/60 border border-blue-400/20 group hover:border-blue-400/40 transition-colors">
              <div className="text-white/60 text-[9px] font-bold tracking-[0.15em] uppercase mb-2 flex items-center gap-1.5">
                <div className="w-1 h-1 bg-amber-400 rounded-full"/> Demo Access
              </div>
              <button 
                type="button"
                onClick={()=>{setUsername('kab.bandung');setPassword('admin123')}}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-blue-400/10 transition-colors group-hover:bg-blue-400/5"
              >
                <span className="text-white/70 text-xs font-medium">Admin Kab. Bandung</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-blue-400 text-[11px] font-mono font-semibold">kab.bandung</span>
                  <ChevronRight size={12} className="text-blue-400"/>
                </div>
              </button>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading || !isFormValid}
              className={`w-full mt-4 py-3.5 rounded-xl text-[13px] font-bold uppercase tracking-[0.06em] flex items-center justify-center gap-2.5 transition-all duration-300 ${
                loading || !isFormValid 
                  ? 'bg-[#1e293b] text-white/50 border border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-700 to-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] hover:-translate-y-0.5 border border-blue-400/50'
              }`}
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin text-blue-400"/> Memverifikasi...</>
              ) : (
                <><Activity size={16} className={isFormValid ? "text-blue-100" : "text-white/50"}/> Masuk ke Command Center</>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-blue-400/20"/>
              <span className="text-white/30 text-[9px] font-bold tracking-widest">SECURED · PORPROV XV</span>
              <div className="flex-1 h-px bg-blue-400/20"/>
            </div>
            <p className="text-white/40 text-[10px] font-medium">
              © 2026 Kabupaten Bandung · KONI Jawa Barat
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}