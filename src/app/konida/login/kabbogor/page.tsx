'use client'
// src/app/login/kabbogor/page.tsx — v3
// + Quick Access: Download Manual Book + Open Presentation

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, ChevronRight, Activity,
         MapPin, Shield, Loader2, BookOpen, Monitor, ExternalLink } from 'lucide-react'

const STATS = [
  { label:'Total Atlet',     value:'1.097', color:'text-emerald-400', icon:'🏃' },
  { label:'Cabang Olahraga', value:'61',    color:'text-amber-400',   icon:'🏅' },
  { label:'Total Venue',     value:'55',    color:'text-blue-400',    icon:'🏟️' },
  { label:'Kontingen',       value:'27',    color:'text-purple-400',  icon:'📍' },
]

const VENUES = [
  { nama:'Stadion Pakansari Cibinong', cabor:'Atletik',      status:'AKTIF' },
  { nama:'Kolam Renang Pakansari',     cabor:'Akuatik',      status:'AKTIF' },
  { nama:'GOR Laga Tangkas',           cabor:'Bulu Tangkis', status:'AKTIF' },
  { nama:'Hall Silat Sentul City',     cabor:'Pencak Silat', status:'SIAP'  },
]

const ATLET_NAMES = [
  'Deni Firmansyah · Hockey','Putri Ayu · Akuatik','Hendra Kurnia · Silat',
  'Reza Maulana · BT','Sri Wahyuni · Karate','Bayu Nugraha · Panahan',
  'Ahmad Fauzi · Menembak','Siti Rahayu · Dayung','Kevin Pratama · Taekwondo',
]

function AtletTicker() {
  const [idx,     setIdx]     = useState(0)
  const [visible, setVisible] = useState(true)
  useEffect(()=>{
    const t = setInterval(()=>{
      setVisible(false)
      setTimeout(()=>{ setIdx(i=>(i+1)%ATLET_NAMES.length); setVisible(true) }, 300)
    }, 2500)
    return ()=>clearInterval(t)
  },[])
  return (
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]"/>
      <span className={`text-[11px] text-emerald-200 transition-opacity duration-300 ${visible?'opacity-100':'opacity-0'}`}>
        {ATLET_NAMES[idx]}
      </span>
    </div>
  )
}

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
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error||'Login gagal'); setLoading(false); return }
      document.cookie = `login_origin=kabbogor; path=/; max-age=${60*60*24*30}; samesite=lax`
      document.cookie = `tenant_id=kabbogor; path=/; max-age=${60*60*8}; samesite=lax`
      localStorage.setItem('tenant_id', 'kabbogor')
      router.push(data.redirect)
    } catch {
      setError('Tidak dapat terhubung ke server')
      setLoading(false)
    }
  }

  const isFormValid = username.trim()!=='' && password.trim()!==''

  return (
    <div className="min-h-screen flex overflow-hidden font-sans bg-[#020d06]">

      {/* ── KIRI: Panel Info ── */}
      <div className="hidden lg:flex w-[58%] relative overflow-hidden flex-col p-10 justify-between">

        {/* Background peta */}
        <div className="absolute inset-0 z-0 opacity-50 pointer-events-none saturate-50 bg-[url('/logos/peta_kabbogor.jpg')] bg-cover bg-center"/>
        <div className="absolute inset-0 z-[1] bg-gradient-to-br from-[#020d06]/85 via-[#061408]/65 to-[#020d06]/90 pointer-events-none"/>
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{backgroundImage:'linear-gradient(rgba(52,211,153,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(52,211,153,0.06) 1px,transparent 1px)',backgroundSize:'40px 40px'}}/>
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(2,13,6,0.7)_100%)] pointer-events-none"/>
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-transparent via-transparent to-[#020d06]/95 pointer-events-none"/>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-900/35 border-2 border-emerald-400/40 flex items-center justify-center overflow-hidden backdrop-blur-sm shadow-[0_0_15px_rgba(52,211,153,0.2)]">
              <img src="/logos/kab-bogor.png" alt="" className="w-8 h-8 object-contain"
                onError={e=>{
                  const el=e.target as HTMLImageElement; el.style.display='none'
                  if(el.parentElement) el.parentElement.innerHTML='<span class="text-emerald-400 font-black text-xs">KBR</span>'
                }}/>
            </div>
            <div>
              <div className="text-emerald-400 text-[9px] font-bold tracking-[0.2em] uppercase">Kabupaten Bogor</div>
              <div className="text-white/40 text-[9px] mt-0.5 font-medium">PORPROV XV · JAWA BARAT 2026</div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-600/15 border border-emerald-400/30 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"/>
            <span className="text-emerald-400 text-[9px] font-bold tracking-[0.15em]">SISTEM AKTIF</span>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="text-emerald-400 text-[10px] font-bold tracking-[0.25em] uppercase mb-4 flex items-center gap-2">
            <MapPin size={12} className="text-emerald-400"/> PUSAT KOMANDO KONTINGEN
          </div>
          <h1 className="text-white text-5xl font-extrabold leading-[1.1] mb-4 tracking-tight drop-shadow-[0_0_40px_rgba(52,211,153,0.25)]">
            Tegar<br/><span className="text-emerald-400">Beriman</span>
          </h1>
          <p className="text-white/60 text-[13px] leading-relaxed max-w-[320px] font-medium">
            Sistem manajemen kontingen premium<br/>
            Kabupaten Bogor · PORPROV XV 2026
          </p>

          <div className="flex gap-4 mt-8 p-4 bg-[#060f08]/60 rounded-xl border border-emerald-400/10 backdrop-blur-md max-w-md">
            {[{v:'40',l:'Kecamatan'},{v:'19',l:'Kelurahan'},{v:'416',l:'Desa'},{v:'2.710',l:'km²'}].map(s=>(
              <div key={s.l} className="text-center flex-1 border-r border-white/5 last:border-0">
                <div className="text-emerald-400 text-base font-extrabold">{s.v}</div>
                <div className="text-white/40 text-[9px] mt-1 font-medium tracking-wide uppercase">{s.l}</div>
              </div>
            ))}
          </div>

          {/* ── QUICK ACCESS PANEL (BARU) ── */}
          <div className="mt-6 max-w-md space-y-2">
            <div className="text-white/30 text-[9px] font-bold tracking-[0.2em] uppercase mb-3">
              Dokumen Admin
            </div>

            {/* Download Manual Book */}
            <a
              href="/api/download/manual-book"
             
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-900/20 border border-emerald-400/20 hover:bg-emerald-900/40 hover:border-emerald-400/50 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/25 transition-colors">
                <BookOpen size={15} className="text-emerald-400"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white/80 text-[12px] font-bold group-hover:text-white transition-colors">
                  Manual Book Sistem
                </div>
                <div className="text-white/35 text-[10px] mt-0.5">
                  Petunjuk lengkap 10 Bab + Lampiran · .docx
                </div>
              </div>
              <ExternalLink size={13} className="text-emerald-400/60 flex-shrink-0 group-hover:text-emerald-400 transition-colors"/>
            </a>

            {/* Open Presentation */}
            <a
              href="/presentation/porprov-xv"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-900/20 border border-blue-400/20 hover:bg-blue-900/40 hover:border-blue-400/50 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-400/30 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/25 transition-colors">
                <Monitor size={15} className="text-blue-400"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white/80 text-[12px] font-bold group-hover:text-white transition-colors">
                  Presentasi Interaktif
                </div>
                <div className="text-white/35 text-[10px] mt-0.5">
                  Intelligence Command Center · 14 Slide
                </div>
              </div>
              <ExternalLink size={13} className="text-blue-400/60 flex-shrink-0 group-hover:text-blue-400 transition-colors"/>
            </a>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-3">
            {STATS.map(s=>(
              <div key={s.label} className="p-3 rounded-xl bg-[#060f08]/75 border border-emerald-400/10 backdrop-blur-md hover:bg-[#060f08]/90 transition-colors">
                <div className="text-[10px] mb-1">{s.icon}</div>
                <div className={`text-xl font-extrabold tabular-nums ${s.color}`}>{s.value}</div>
                <div className="text-white/40 text-[8px] uppercase tracking-[0.08em] mt-1 font-semibold">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="text-white/30 text-[9px] font-bold tracking-[0.15em] uppercase mb-1">Venue Unggulan</div>
            {VENUES.map((v,i)=>(
              <div key={v.nama} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-l-2 transition-all ${
                i<2?'bg-emerald-400/5 border-emerald-400':'bg-transparent border-emerald-400/10 hover:bg-white/5'
              }`}>
                <div className={`flex-1 text-[10px] font-medium ${i<2?'text-slate-200':'text-white/40'}`}>{v.nama}</div>
                <span className="text-emerald-400 text-[8px] font-bold tracking-wider">{v.status}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#060f08]/50 border border-emerald-400/10 backdrop-blur-sm mt-2">
            <span className="text-white/40 text-[9px] font-bold tracking-wider">ATLET TERDAFTAR</span>
            <AtletTicker/>
          </div>
        </div>
      </div>

      {/* ── KANAN: Form Login ── */}
      <div className="flex-1 flex items-center justify-center relative p-8 bg-gradient-to-br from-[#020d06] via-[#041209] to-[#020d06]">

        <div className="absolute inset-0 pointer-events-none" style={{backgroundImage:'linear-gradient(rgba(52,211,153,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(52,211,153,0.03) 1px,transparent 1px)',backgroundSize:'28px 28px'}}/>

        <div className="relative z-10 w-full max-w-[380px] p-8 rounded-3xl bg-[#051408]/95 backdrop-blur-xl border border-emerald-700/60 shadow-2xl shadow-black">

          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-400/30 rounded-tl-3xl pointer-events-none"/>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-400/30 rounded-br-3xl pointer-events-none"/>

          {/* Mobile quick access */}
          <div className="flex gap-2 mb-5 lg:hidden">
            <a href="/api/download/manual-book"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-900/30 border border-emerald-400/20 text-emerald-400 text-[10px] font-bold">
              <BookOpen size={12}/> Manual Book
            </a>
            <a href="/presentation/porprov-xv" target="_blank"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-900/30 border border-blue-400/20 text-blue-400 text-[10px] font-bold">
              <Monitor size={12}/> Presentasi
            </a>
          </div>

          {/* Mobile Header */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="w-14 h-14 rounded-2xl mb-3 bg-emerald-900/20 border-2 border-emerald-400/30 flex items-center justify-center">
              <span className="text-emerald-400 text-lg font-black">KBR</span>
            </div>
            <div className="text-white text-lg font-extrabold tracking-tight">Kabupaten Bogor</div>
            <div className="text-emerald-400 text-[9px] tracking-[0.2em] mt-1 font-bold">TEGAR BERIMAN</div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-emerald-400/30"/>
            <div className="flex items-center gap-1.5 px-2">
              <Shield size={12} className="text-emerald-400"/>
              <span className="text-emerald-400 text-[10px] font-bold tracking-[0.2em] uppercase">Command Access</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-emerald-400/30 to-transparent"/>
          </div>

          <h2 className="text-white text-3xl font-extrabold leading-tight mb-2 tracking-tight">
            Masuk ke<br/><span className="text-emerald-400">War Room</span>
          </h2>
          <p className="text-white/70 text-xs mb-8 font-medium">
            Kab. Bogor · Premium Kontingen · 1.097 Atlet
          </p>

          {/* Error */}
          <div className={`flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 transition-all duration-300 overflow-hidden ${error?'max-h-20 opacity-100':'max-h-0 opacity-0 !py-0 !mb-0 border-transparent'}`}>
            <AlertCircle size={16} className="text-red-400 flex-shrink-0"/>
            <span className="text-red-300 text-xs font-medium">{error}</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="username" className="text-white/70 text-[10px] font-bold tracking-[0.15em] uppercase block mb-2">Username</label>
              <input id="username" type="text" value={username} onChange={e=>setUsername(e.target.value)}
                placeholder="Masukkan username" required autoComplete="username"
                className="w-full bg-[#030a05] border border-emerald-400/40 rounded-xl px-4 py-3 text-[13px] text-white outline-none transition-all placeholder:text-white/50 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 shadow-inner"/>
            </div>

            <div>
              <label htmlFor="password" className="text-white/70 text-[10px] font-bold tracking-[0.15em] uppercase block mb-2">Password</label>
              <div className="relative">
                <input id="password" type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder="Masukkan password" required autoComplete="current-password"
                  className="w-full bg-[#030a05] border border-emerald-400/40 rounded-xl pl-4 pr-11 py-3 text-[13px] text-white outline-none transition-all placeholder:text-white/50 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 shadow-inner"/>
                <button type="button" onClick={()=>setShowPass(s=>!s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-emerald-400 transition-colors p-1">
                  {showPass?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
            </div>

            <div className="mt-2 rounded-xl p-3 bg-[#030a05]/60 border border-emerald-400/20 group hover:border-emerald-400/40 transition-colors">
              <div className="text-white/60 text-[9px] font-bold tracking-[0.15em] uppercase mb-2 flex items-center gap-1.5">
                <div className="w-1 h-1 bg-emerald-500 rounded-full"/> Demo Access
              </div>
              <button type="button" onClick={()=>{setUsername('kab.bogor');setPassword('admin123')}}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-emerald-400/10 transition-colors">
                <span className="text-white/70 text-xs font-medium">Admin Kab. Bogor</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 text-[11px] font-mono font-semibold">kab.bogor</span>
                  <ChevronRight size={12} className="text-emerald-400"/>
                </div>
              </button>
            </div>

            <button type="submit" disabled={loading||!isFormValid}
              className={`w-full mt-4 py-3.5 rounded-xl text-[13px] font-bold uppercase tracking-[0.06em] flex items-center justify-center gap-2.5 transition-all duration-300 ${
                loading||!isFormValid
                  ?'bg-slate-800 text-white/50 border border-slate-700 cursor-not-allowed'
                  :'bg-gradient-to-r from-emerald-700 to-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 border border-emerald-400/50'
              }`}>
              {loading
                ? <><Loader2 size={16} className="animate-spin text-emerald-400"/> Memverifikasi...</>
                : <><Activity size={16} className={isFormValid?'text-emerald-100':'text-white/50'}/> Masuk ke Command Center</>
              }
            </button>
          </form>

          <div className="mt-8 text-center">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-emerald-400/20"/>
              <span className="text-white/30 text-[9px] font-bold tracking-widest">SECURED · PORPROV XV</span>
              <div className="flex-1 h-px bg-emerald-400/20"/>
            </div>
            <p className="text-white/40 text-[10px] font-medium">
              © 2026 Kabupaten Bogor · KONI Jawa Barat
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}