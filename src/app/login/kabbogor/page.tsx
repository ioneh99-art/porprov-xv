'use client'
// src/app/login/kabbogor/page.tsx — v4
// Sprint 3 polish: VENUES list expanded with real data + better info layout
// + Quick Access: Download Manual Book + Open Presentation

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, ChevronRight, Activity,
         MapPin, Shield, Loader2, BookOpen, ExternalLink,
         Users, Trophy, Building2, Clock } from 'lucide-react'

// ─────── STATS ─────────────────────────────
const STATS = [
  { label:'Total Atlet',  value:'1.097', color:'#10b981', icon:Users,    sub:'53 cabor' },
  { label:'Cabang',       value:'61',    color:'#fbbf24', icon:Trophy,   sub:'olahraga'  },
  { label:'Total Venue',  value:'55',    color:'#3b82f6', icon:Building2,sub:'tersebar'  },
  { label:'Kontingen',    value:'27',    color:'#a855f7', icon:MapPin,   sub:'Jabar'     },
]

function PorprovCountdown() {
  const [t, setT] = useState({ d:0, h:0, m:0, s:0 })
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const TARGET = new Date('2026-11-07T08:00:00+07:00').getTime()
    const tick = () => {
      const diff = Math.max(0, TARGET - Date.now())
      setT({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
      setReady(true)
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [])

  if (!ready) return null

  const units = [
    { v: t.d, l: 'Hari'  },
    { v: t.h, l: 'Jam'   },
    { v: t.m, l: 'Menit' },
    { v: t.s, l: 'Detik' },
  ]

  return (
    <div className="rounded-2xl bg-[#060f08]/70 border border-emerald-400/15 backdrop-blur-md p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"/>
      <div className="flex items-center gap-2 mb-4">
        <Clock size={12} className="text-emerald-400"/>
        <span className="text-emerald-400/70 text-[9px] font-bold tracking-[0.2em] uppercase">
          Menuju Opening PORPROV XV
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]"/>
          <span className="text-emerald-400/50 text-[9px] font-mono">LIVE</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {units.map(u => (
          <div key={u.l} className="text-center rounded-xl bg-[#030a05]/60 border border-emerald-400/10 py-3">
            <div className="text-3xl font-extrabold tabular-nums text-emerald-300 leading-none mb-1 tracking-tight">
              {String(u.v).padStart(2, '0')}
            </div>
            <div className="text-[9px] text-white/30 uppercase tracking-widest font-bold">{u.l}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-white/30 text-[10px] font-mono">7 November 2026 · Kab. Bogor</div>
        <div className="text-emerald-400/40 text-[9px] font-bold tracking-wider uppercase">Opening Ceremony</div>
      </div>
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

        {/* Background */}
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

        {/* Main Content */}
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

          {/* Quick Access Panel */}
          <div className="mt-6 max-w-md space-y-2">
            <div className="text-white/30 text-[9px] font-bold tracking-[0.2em] uppercase mb-3">
              Dokumen Admin
            </div>

            <a href="/api/download/manual-book"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-900/20 border border-emerald-400/20 hover:bg-emerald-900/40 hover:border-emerald-400/50 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/25 transition-colors">
                <BookOpen size={15} className="text-emerald-400"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white/80 text-[12px] font-bold group-hover:text-white transition-colors">Manual Book Sistem</div>
                <div className="text-white/35 text-[10px] mt-0.5">Petunjuk lengkap 10 Bab + Lampiran · .docx</div>
              </div>
              <ExternalLink size={13} className="text-emerald-400/60 flex-shrink-0 group-hover:text-emerald-400 transition-colors"/>
            </a>

            <a href="/atlet/login" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-900/20 border border-amber-400/20 hover:bg-amber-900/40 hover:border-amber-400/50 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/25 transition-colors">
                <span className="text-sm">🏆</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white/80 text-[12px] font-bold group-hover:text-white transition-colors">Portal Atlet</div>
                <div className="text-white/35 text-[10px] mt-0.5">Login portal resmi untuk atlet · 768 aktif</div>
              </div>
              <ExternalLink size={13} className="text-amber-400/60 flex-shrink-0 group-hover:text-amber-400 transition-colors"/>
            </a>

          </div>
        </div>

        {/* ── BOTTOM: Stats + Countdown ── */}
        <div className="relative z-10 flex flex-col gap-3">

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2.5">
            {STATS.map(s=>{
              const Icon = s.icon
              return (
                <div key={s.label}
                  className="p-3 rounded-xl bg-[#060f08]/80 border backdrop-blur-md hover:bg-[#060f08]/95 transition-all relative overflow-hidden group"
                  style={{borderColor:`${s.color}25`}}>
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`${s.color}90`}}/>
                  <div className="flex items-start justify-between mb-1">
                    <Icon size={13} style={{color:s.color}}/>
                    <div className="text-[8px] font-bold uppercase tracking-widest opacity-50" style={{color:s.color}}>
                      {s.sub}
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold tabular-nums leading-tight" style={{color:s.color}}>
                    {s.value}
                  </div>
                  <div className="text-white/40 text-[9px] uppercase tracking-[0.05em] mt-0.5 font-semibold">
                    {s.label}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Countdown */}
          <PorprovCountdown/>
        </div>
      </div>

      {/* ── KANAN: Form Login ── (unchanged from v3) */}
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
          </div>

          {/* Mobile Header */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="w-14 h-14 rounded-2xl mb-3 bg-emerald-900/20 border-2 border-emerald-400/30 flex items-center justify-center">
              <span className="text-emerald-400 text-lg font-black">KBR</span>
            </div>
            <div className="text-white text-lg font-extrabold tracking-tight">Kabupaten Bogor</div>
            <div className="text-emerald-400 text-[9px] tracking-[0.2em] mt-1 font-bold">TEGAR BERIMAN</div>
          </div>

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

          <div className={`flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 transition-all duration-300 overflow-hidden ${error?'max-h-20 opacity-100':'max-h-0 opacity-0 !py-0 !mb-0 border-transparent'}`}>
            <AlertCircle size={16} className="text-red-400 flex-shrink-0"/>
            <span className="text-red-300 text-xs font-medium">{error}</span>
          </div>

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
