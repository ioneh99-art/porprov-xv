'use client'
// src/app/login/dayung/page.tsx — Login khusus Operator Dayung (model Kab. Bandung).
// Background: taruh file di /public/logos/dayung-bg.jpg (sementara fallback gradient).

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, ChevronRight, Activity, Waves, Shield, Loader2, Users, ListChecks, Layers, Clock } from 'lucide-react'

const STATS = [
  { label: 'Atlet Dayung', value: '67', color: '#38bdf8', icon: Users,      sub: 'Kab. Bandung' },
  { label: 'Disiplin',     value: '4',  color: '#fbbf24', icon: Layers,     sub: 'Canoe/Kayak/Rowing/TBR' },
  { label: 'Nomor',        value: '54', color: '#34d399', icon: ListChecks, sub: 'pertandingan' },
  { label: 'Tahun',        value: "'26", color: '#a855f7', icon: Waves,     sub: 'PORPROV XV' },
]

function PorprovCountdown() {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 })
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const TARGET = new Date('2026-11-07T08:00:00+07:00').getTime()
    const tick = () => {
      const diff = Math.max(0, TARGET - Date.now())
      setT({ d: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) })
      setReady(true)
    }
    tick(); const iv = setInterval(tick, 1000); return () => clearInterval(iv)
  }, [])
  if (!ready) return null
  const units = [{ v: t.d, l: 'Hari' }, { v: t.h, l: 'Jam' }, { v: t.m, l: 'Menit' }, { v: t.s, l: 'Detik' }]
  return (
    <div className="rounded-2xl bg-[#040f1c]/70 border border-sky-400/15 backdrop-blur-md p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
      <div className="flex items-center gap-2 mb-4">
        <Clock size={12} className="text-sky-400" />
        <span className="text-sky-400/70 text-[9px] font-bold tracking-[0.2em] uppercase">Menuju Opening PORPROV XV</span>
        <div className="ml-auto flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" /><span className="text-sky-400/50 text-[9px] font-mono">LIVE</span></div>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {units.map(u => (
          <div key={u.l} className="text-center rounded-xl bg-[#02080f]/60 border border-sky-400/10 py-3">
            <div className="text-3xl font-extrabold tabular-nums text-sky-300 leading-none mb-1 tracking-tight">{String(u.v).padStart(2, '0')}</div>
            <div className="text-[9px] text-white/30 uppercase tracking-widest font-bold">{u.l}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-white/30 text-[10px] font-mono">7 November 2026 · Kab. Bandung</div>
        <div className="text-sky-400/40 text-[9px] font-bold tracking-wider uppercase">Opening Ceremony</div>
      </div>
    </div>
  )
}

export default function LoginDayung() {
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
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login gagal'); setLoading(false); return }
      document.cookie = `login_origin=dayung; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
      router.push(data.redirect || '/operator/dayung')
    } catch { setError('Tidak dapat terhubung ke server'); setLoading(false) }
  }

  const isFormValid = username.trim() !== '' && password.trim() !== ''

  return (
    <div className="min-h-screen flex overflow-hidden font-sans bg-[#020a14]">
      {/* ── KIRI: Panel Info ── */}
      <div className="hidden lg:flex w-[58%] relative overflow-hidden flex-col p-10 justify-between">
        {/* Background — taruh /public/logos/dayung-bg.jpg */}
        <div className="absolute inset-0 z-0 opacity-50 pointer-events-none saturate-50 bg-cover bg-center" style={{ backgroundImage: "url('/logos/dayung-bg.jpg')" }} />
        <div className="absolute inset-0 z-[1] bg-gradient-to-br from-[#020a14]/85 via-[#04121f]/65 to-[#020a14]/90 pointer-events-none" />
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(56,189,248,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.06) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(2,10,20,0.7)_100%)] pointer-events-none" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-transparent via-transparent to-[#020a14]/95 pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-900/35 border-2 border-sky-400/40 flex items-center justify-center backdrop-blur-sm"><Waves size={20} className="text-sky-400" /></div>
            <div>
              <div className="text-sky-400 text-[9px] font-bold tracking-[0.2em] uppercase">Cabor Dayung</div>
              <div className="text-white/40 text-[9px] mt-0.5 font-medium">KAB. BANDUNG · PORPROV XV 2026</div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-600/15 border border-sky-400/30 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" /><span className="text-sky-400 text-[9px] font-bold tracking-[0.15em]">SISTEM AKTIF</span>
          </div>
        </div>

        {/* Main */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="text-sky-400 text-[10px] font-bold tracking-[0.25em] uppercase mb-4 flex items-center gap-2"><Waves size={12} /> OPERATOR CABOR DAYUNG</div>
          <h1 className="text-white text-5xl font-extrabold leading-[1.1] mb-4 tracking-tight drop-shadow-[0_0_40px_rgba(56,189,248,0.25)]">Dayung<br /><span className="text-sky-400">Kab. Bandung</span></h1>
          <p className="text-white/60 text-[13px] leading-relaxed max-w-[340px] font-medium">Pusat operasional cabor Dayung — roster, kompetisi, biomotorik & performance intelligence · PORPROV XV 2026</p>
        </div>

        {/* Bottom: Stats + Countdown */}
        <div className="relative z-10 flex flex-col gap-3">
          <div className="grid grid-cols-4 gap-2.5">
            {STATS.map(s => {
              const Icon = s.icon
              return (
                <div key={s.label} className="p-3 rounded-xl bg-[#040f1c]/80 border backdrop-blur-md relative overflow-hidden" style={{ borderColor: `${s.color}25` }}>
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `${s.color}90` }} />
                  <div className="flex items-start justify-between mb-1"><Icon size={13} style={{ color: s.color }} /><div className="text-[8px] font-bold uppercase tracking-widest opacity-50" style={{ color: s.color }}>{s.sub}</div></div>
                  <div className="text-2xl font-extrabold tabular-nums leading-tight" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-white/40 text-[9px] uppercase tracking-[0.05em] mt-0.5 font-semibold">{s.label}</div>
                </div>
              )
            })}
          </div>
          <PorprovCountdown />
        </div>
      </div>

      {/* ── KANAN: Form Login ── */}
      <div className="flex-1 flex items-center justify-center relative p-8 bg-gradient-to-br from-[#020a14] via-[#03101c] to-[#020a14]">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(56,189,248,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.03) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative z-10 w-full max-w-[380px] p-8 rounded-3xl bg-[#051019]/95 backdrop-blur-xl border border-sky-700/60 shadow-2xl shadow-black">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-sky-400/30 rounded-tl-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-sky-400/30 rounded-br-3xl pointer-events-none" />

          {/* Mobile header */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="w-14 h-14 rounded-2xl mb-3 bg-sky-900/20 border-2 border-sky-400/30 flex items-center justify-center"><Waves size={26} className="text-sky-400" /></div>
            <div className="text-white text-lg font-extrabold tracking-tight">Cabor Dayung</div>
            <div className="text-sky-400 text-[9px] tracking-[0.2em] mt-1 font-bold">KAB. BANDUNG</div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-sky-400/30" />
            <div className="flex items-center gap-1.5 px-2"><Shield size={12} className="text-sky-400" /><span className="text-sky-400 text-[10px] font-bold tracking-[0.2em] uppercase">Operator Access</span></div>
            <div className="flex-1 h-px bg-gradient-to-r from-sky-400/30 to-transparent" />
          </div>

          <h2 className="text-white text-3xl font-extrabold leading-tight mb-2 tracking-tight">Masuk ke<br /><span className="text-sky-400">Operator Dayung</span></h2>
          <p className="text-white/70 text-xs mb-8 font-medium">Cabor Dayung · Kab. Bandung · 67 Atlet</p>

          <div className={`flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 transition-all duration-300 overflow-hidden ${error ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 !py-0 !mb-0 border-transparent'}`}>
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" /><span className="text-red-300 text-xs font-medium">{error}</span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="username" className="text-white/70 text-[10px] font-bold tracking-[0.15em] uppercase block mb-2">Username</label>
              <input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Masukkan username" required autoComplete="username"
                className="w-full bg-[#02080f] border border-sky-400/40 rounded-xl px-4 py-3 text-[13px] text-white outline-none transition-all placeholder:text-white/50 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20 shadow-inner" />
            </div>
            <div>
              <label htmlFor="password" className="text-white/70 text-[10px] font-bold tracking-[0.15em] uppercase block mb-2">Password</label>
              <div className="relative">
                <input id="password" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Masukkan password" required autoComplete="current-password"
                  className="w-full bg-[#02080f] border border-sky-400/40 rounded-xl pl-4 pr-11 py-3 text-[13px] text-white outline-none transition-all placeholder:text-white/50 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20 shadow-inner" />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-sky-400 transition-colors p-1">{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>

            <div className="mt-2 rounded-xl p-3 bg-[#02080f]/60 border border-sky-400/20 hover:border-sky-400/40 transition-colors">
              <div className="text-white/60 text-[9px] font-bold tracking-[0.15em] uppercase mb-2 flex items-center gap-1.5"><div className="w-1 h-1 bg-sky-500 rounded-full" /> Demo Access</div>
              <button type="button" onClick={() => { setUsername('op.dayung'); setPassword('dayung123') }} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-sky-400/10 transition-colors">
                <span className="text-white/70 text-xs font-medium">Operator Dayung</span>
                <div className="flex items-center gap-1.5"><span className="text-sky-400 text-[11px] font-mono font-semibold">op.dayung</span><ChevronRight size={12} className="text-sky-400" /></div>
              </button>
            </div>

            <button type="submit" disabled={loading || !isFormValid}
              className={`w-full mt-4 py-3.5 rounded-xl text-[13px] font-bold uppercase tracking-[0.06em] flex items-center justify-center gap-2.5 transition-all duration-300 ${loading || !isFormValid ? 'bg-slate-800 text-white/50 border border-slate-700 cursor-not-allowed' : 'bg-gradient-to-r from-sky-700 to-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_25px_rgba(56,189,248,0.5)] hover:-translate-y-0.5 border border-sky-400/50'}`}>
              {loading ? <><Loader2 size={16} className="animate-spin text-sky-400" /> Memverifikasi...</> : <><Activity size={16} className={isFormValid ? 'text-sky-100' : 'text-white/50'} /> Masuk ke Operator Dayung</>}
            </button>
          </form>

          <div className="mt-8 text-center">
            <div className="flex items-center gap-3 mb-3"><div className="flex-1 h-px bg-sky-400/20" /><span className="text-white/30 text-[9px] font-bold tracking-widest">SECURED · PORPROV XV</span><div className="flex-1 h-px bg-sky-400/20" /></div>
            <p className="text-white/40 text-[10px] font-medium">© 2026 Cabor Dayung · Kab. Bandung · KONI Jabar</p>
          </div>
        </div>
      </div>
    </div>
  )
}
