'use client'
// src/app/atlet/login/page.tsx — Universal (semua kontingen)

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, Trophy, Medal, Star } from 'lucide-react'

const STATS = [
  { v:'1.097', l:'Atlet Terdaftar' },
  { v:'61',    l:'Cabang Olahraga' },
  { v:'27',    l:'Kontingen'       },
  { v:'15',    l:'Hari Kompetisi'  },
]

export default function LoginAtletUniversal() {
  const router = useRouter()
  const [nik,      setNik]      = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nik.length !== 16) { setError('NIK harus 16 digit'); return }
    setError(''); setLoading(true)
    try {
      const res  = await fetch('/api/atlet/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nik, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login gagal'); setLoading(false); return }
      document.cookie = `atlet_token=${data.token}; path=/; max-age=${60*60*8}; samesite=lax`
      localStorage.setItem('atlet_nik', nik)
      router.push('/atlet/dashboard')
    } catch {
      setError('Tidak dapat terhubung ke server')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background:'#020D06' }}>

      {/* ── KIRI: Branding ── */}
      <div className="hidden lg:flex w-[55%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background:'rgba(5,20,10,0.8)', borderRight:'1px solid rgba(0,180,138,0.1)' }}>

        {/* Grid bg */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage:'linear-gradient(rgba(0,180,138,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,138,0.03) 1px,transparent 1px)',
          backgroundSize:'32px 32px',
        }}/>
        {/* Glow circles */}
        <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background:'radial-gradient(circle,rgba(0,180,138,0.08) 0%,transparent 70%)' }}/>
        <div className="absolute top-[-60px] right-[-60px] w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{ background:'radial-gradient(circle,rgba(0,180,138,0.05) 0%,transparent 70%)' }}/>

        {/* Top logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background:'rgba(0,180,138,0.12)', border:'1px solid rgba(0,180,138,0.3)' }}>
            <Trophy size={20} style={{ color:'#00B48A' }}/>
          </div>
          <div>
            <div className="text-white text-sm font-bold">PORPROV XV</div>
            <div className="text-[10px] font-bold tracking-widest" style={{ color:'#00B48A' }}>JAWA BARAT 2026</div>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10">
          <div className="text-[11px] font-bold tracking-[0.3em] mb-4" style={{ color:'#00B48A' }}>
            PORTAL ATLET RESMI
          </div>
          <h1 className="text-white font-extrabold leading-tight mb-4" style={{ fontSize:'clamp(32px,4vw,52px)' }}>
            Satu Portal<br/>
            <span style={{ color:'#00B48A' }}>Semua Kontingen</span>
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-sm">
            Login dengan NIK kamu. Sistem otomatis mendeteksi kontingen, cabor, dan semua data terdaftar.
          </p>

          {/* Medal icons */}
          <div className="flex gap-4 mb-10">
            {[
              { icon:'🥇', label:'Pantau Jadwal', color:'#F59E0B' },
              { icon:'🏆', label:'Hasil & Medali', color:'#00B48A' },
              { icon:'💰', label:'Status Bonus',   color:'#60A5FA' },
              { icon:'📋', label:'Data Lengkap',   color:'#A78BFA' },
            ].map(f => (
              <div key={f.label} className="flex flex-col items-center gap-1.5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                  style={{ background:`${f.color}12`, border:`1px solid ${f.color}25` }}>
                  {f.icon}
                </div>
                <span className="text-[9px] text-zinc-500 text-center font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats bottom */}
        <div className="relative z-10 grid grid-cols-4 gap-3">
          {STATS.map(s => (
            <div key={s.l} className="text-center p-3 rounded-xl"
              style={{ background:'rgba(0,180,138,0.04)', border:'1px solid rgba(0,180,138,0.1)' }}>
              <div className="text-lg font-extrabold" style={{ color:'#00B48A' }}>{s.v}</div>
              <div className="text-[9px] text-zinc-600 mt-0.5 font-medium uppercase tracking-wide">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── KANAN: Form Login ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10" style={{
        backgroundImage:'linear-gradient(rgba(0,180,138,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,138,0.02) 1px,transparent 1px)',
        backgroundSize:'28px 28px',
      }}>
        <div className="w-full max-w-[380px]">

          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background:'rgba(0,180,138,0.1)', border:'2px solid rgba(0,180,138,0.25)' }}>
              <Trophy size={28} style={{ color:'#00B48A' }}/>
            </div>
            <div className="text-[10px] font-bold tracking-[0.25em] mb-1" style={{ color:'#00B48A' }}>
              PORPROV XV · JAWA BARAT 2026
            </div>
            <h1 className="text-white text-2xl font-extrabold">Portal Atlet</h1>
          </div>

          {/* Card */}
          <div className="rounded-3xl p-8 relative" style={{
            background:'rgba(5,20,10,0.95)',
            border:'1px solid rgba(0,180,138,0.2)',
            boxShadow:'0 25px 60px rgba(0,0,0,0.5)',
          }}>
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-3xl pointer-events-none"
              style={{ borderColor:'rgba(0,180,138,0.3)' }}/>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-3xl pointer-events-none"
              style={{ borderColor:'rgba(0,180,138,0.3)' }}/>

            <h2 className="text-white text-2xl font-extrabold mb-1">Masuk ke Portal</h2>
            <p className="text-zinc-500 text-sm mb-6">
              Semua atlet PORPROV XV Jawa Barat 2026
            </p>

            {/* Info box */}
            <div className="flex items-start gap-3 p-3 rounded-xl mb-6" style={{
              background:'rgba(0,180,138,0.06)', border:'1px solid rgba(0,180,138,0.15)',
            }}>
              <ShieldCheck size={15} style={{ color:'#00B48A', flexShrink:0, marginTop:1 }}/>
              <div className="text-xs text-zinc-400 leading-relaxed">
                <span className="font-semibold" style={{ color:'#00B48A' }}>Username:</span> NIK / KTP (16 digit)<br/>
                <span className="font-semibold" style={{ color:'#00B48A' }}>Password:</span> 4 digit terakhir NIK
                <span className="text-zinc-600"> · dapat diganti setelah login</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl mb-5" style={{
                background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
              }}>
                <AlertCircle size={14} className="text-red-400 flex-shrink-0"/>
                <span className="text-red-300 text-xs">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* NIK */}
              <div>
                <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block mb-1.5">
                  Nomor NIK / KTP
                </label>
                <input type="tel" inputMode="numeric" maxLength={16}
                  value={nik} onChange={e => setNik(e.target.value.replace(/\D/g,''))}
                  placeholder="16 digit NIK" required
                  className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none tracking-widest font-mono transition-all"
                  style={{
                    background:'rgba(0,0,0,0.4)',
                    border: nik.length===16 ? '1px solid rgba(0,180,138,0.5)' : '1px solid rgba(0,180,138,0.15)',
                  }}
                  onFocus={e => e.target.style.borderColor='rgba(0,180,138,0.4)'}
                  onBlur={e  => e.target.style.borderColor=nik.length===16?'rgba(0,180,138,0.5)':'rgba(0,180,138,0.15)'}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-zinc-600">Nomor pada e-KTP</span>
                  <span className={`text-[10px] font-mono ${nik.length===16?'text-emerald-400':'text-zinc-600'}`}>
                    {nik.length}/16
                  </span>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input type={showPass?'text':'password'} maxLength={20}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Password" required
                    className="w-full pl-4 pr-11 py-3 rounded-xl text-sm text-white outline-none transition-all"
                    style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(0,180,138,0.15)' }}
                    onFocus={e => e.target.style.borderColor='rgba(0,180,138,0.4)'}
                    onBlur={e  => e.target.style.borderColor='rgba(0,180,138,0.15)'}
                  />
                  <button type="button" onClick={() => setShowPass(s=>!s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-emerald-400 transition-colors">
                    {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button type="submit"
                disabled={loading || nik.length!==16 || !password}
                className="w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all mt-2"
                style={{
                  background: (loading||nik.length!==16||!password)
                    ? 'rgba(255,255,255,0.04)'
                    : 'linear-gradient(135deg,#00B48A,#065F46)',
                  color: (loading||nik.length!==16||!password)
                    ? 'rgba(255,255,255,0.25)' : 'white',
                  border:'1px solid rgba(0,180,138,0.3)',
                  boxShadow: (loading||nik.length!==16||!password)
                    ? 'none' : '0 0 20px rgba(0,180,138,0.25)',
                }}>
                {loading
                  ? <><Loader2 size={15} className="animate-spin"/> Memverifikasi...</>
                  : <><Trophy size={15}/> Masuk ke Portal Atlet</>
                }
              </button>
            </form>

            <div className="mt-6 pt-5" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-center text-zinc-600 text-xs">
                Masalah login? Hubungi koordinator kontingen kamu
              </p>
              <p className="text-center text-zinc-700 text-[10px] mt-2">
                © 2026 KONI Jawa Barat · PORPROV XV
              </p>
            </div>
          </div>

          {/* Link ke login Kab. Bogor */}
          <div className="mt-5 text-center">
            <p className="text-zinc-600 text-xs mb-2">Login sebagai koordinator kontingen?</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <a href="/login/kabbogor"
                className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
                style={{ background:'rgba(0,180,138,0.08)', color:'#00B48A', border:'1px solid rgba(0,180,138,0.2)' }}>
                🏛 Koordinator Kab. Bogor
              </a>
              <a href="/login"
                className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
                style={{ background:'rgba(255,255,255,0.04)', color:'#71717A', border:'1px solid rgba(255,255,255,0.08)' }}>
                Admin PORPROV
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}