'use client'
// src/app/atlet/daftar/page.tsx — FIXED
// Flow disesuaikan: NIK-based, password bebas (min 4 karakter)
// Styling konsisten dark green

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle, Trophy, Shield } from 'lucide-react'

const C = { dark:'#020D06', accent:'#00B48A', green:'#065F46' }

export default function AtletDaftar() {
  const router = useRouter()
  const [nik,       setNik]       = useState('')
  const [password,  setPassword]  = useState('')
  const [konfirmasi,setKonfirmasi]= useState('')
  const [email,     setEmail]     = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')
  const [loading,   setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (nik.length !== 16) { setError('NIK harus 16 digit'); return }
    if (password.length < 4) { setError('Password minimal 4 karakter'); return }
    if (password !== konfirmasi) { setError('Password dan konfirmasi tidak cocok'); return }

    setLoading(true)
    try {
      const res  = await fetch('/api/atlet/register', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ no_ktp:nik, email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Terjadi kesalahan'); setLoading(false); return }
      setSuccess(`Akun berhasil dibuat untuk ${data.nama}! Silakan login.`)
      setTimeout(() => router.push('/atlet/login'), 2500)
    } catch {
      setError('Tidak dapat terhubung ke server')
      setLoading(false)
    }
  }

  const inp = "w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all placeholder:text-zinc-600"
  const inpStyle = { background:'rgba(0,0,0,0.3)', border:'1px solid rgba(0,180,138,0.2)' }

  return (
    <div className="min-h-screen flex" style={{ background:C.dark }}>

      {/* ── KIRI — Info panel ── */}
      <div className="hidden lg:flex w-[52%] flex-col justify-center px-16 relative overflow-hidden"
        style={{ background:'rgba(5,20,10,0.6)', borderRight:'1px solid rgba(0,180,138,0.1)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:'linear-gradient(rgba(0,180,138,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,138,0.025) 1px,transparent 1px)',
            backgroundSize:'32px 32px',
          }}/>
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background:'rgba(0,180,138,0.1)', border:'2px solid rgba(0,180,138,0.25)' }}>
            <Trophy size={30} style={{ color:C.accent }}/>
          </div>
          <div className="text-[11px] font-bold tracking-[0.25em] mb-2"
            style={{ color:C.accent }}>DAFTAR ATLET · PORPROV XV</div>
          <h1 className="text-white text-3xl font-extrabold leading-tight mb-3">
            Buat Akun<br/>
            <span style={{ color:C.accent }}>Portal Atlet</span>
          </h1>
          <p className="text-zinc-500 text-sm leading-relaxed mb-8">
            NIK kamu harus sudah terdaftar dan diverifikasi<br/>
            oleh koordinator kontingen Kab. Bogor.
          </p>
          <div className="space-y-3">
            {[
              'Profil digital resmi PORPROV XV',
              'Input & pantau riwayat kejuaraan',
              'Download ID Card & Sertifikat',
              'Lengkapi data apparel & rekening bonus',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle size={14} style={{ color:C.accent, flexShrink:0 }}/>
                <span className="text-zinc-400 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KANAN — Form ── */}
      <div className="flex-1 flex items-center justify-center px-8 py-10">
        <div className="w-full max-w-sm">

          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background:'rgba(0,180,138,0.1)', border:'2px solid rgba(0,180,138,0.25)' }}>
              <Trophy size={28} style={{ color:C.accent }}/>
            </div>
            <div className="text-[11px] font-bold tracking-widest mb-1" style={{ color:C.accent }}>
              PORPROV XV · JAWA BARAT 2026
            </div>
            <h1 className="text-white text-2xl font-extrabold">Daftar Atlet</h1>
          </div>

          <h2 className="hidden lg:block text-white text-2xl font-extrabold mb-1">Buat akun</h2>
          <p className="hidden lg:block text-zinc-500 text-sm mb-6">Gunakan NIK yang sudah Verified di sistem</p>

          {/* Card */}
          <div className="rounded-2xl p-6"
            style={{ background:'rgba(5,20,10,0.95)', border:'1px solid rgba(0,180,138,0.2)' }}>

            {/* Info */}
            <div className="flex items-start gap-3 p-3 rounded-xl mb-5"
              style={{ background:'rgba(0,180,138,0.06)', border:'1px solid rgba(0,180,138,0.12)' }}>
              <Shield size={14} style={{ color:C.accent, flexShrink:0, marginTop:1 }}/>
              <div className="text-xs text-zinc-400 leading-relaxed">
                NIK harus sudah berstatus <span className="font-bold text-emerald-400">Verified</span> di sistem PORPROV XV.
                Hubungi koordinator jika belum terdaftar.
              </div>
            </div>

            {/* Success */}
            {success ? (
              <div className="text-center py-4">
                <CheckCircle size={40} style={{ color:C.accent }} className="mx-auto mb-3"/>
                <div className="text-emerald-400 text-sm font-bold">{success}</div>
                <div className="text-zinc-600 text-xs mt-2">Mengalihkan ke halaman login...</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl"
                    style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle size={13} className="text-red-400 flex-shrink-0"/>
                    <span className="text-red-400 text-xs">{error}</span>
                  </div>
                )}

                {/* NIK */}
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block mb-1.5">
                    NIK / No. KTP *
                  </label>
                  <input type="tel" inputMode="numeric" maxLength={16}
                    value={nik} onChange={e => setNik(e.target.value.replace(/\D/g,''))}
                    placeholder="16 digit NIK" required
                    className={inp + ' tracking-widest font-mono'} style={inpStyle}/>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-zinc-600">NIK pada KTP/e-KTP</span>
                    <span className={`text-[10px] font-mono ${nik.length===16?'text-emerald-400':'text-zinc-600'}`}>
                      {nik.length}/16
                    </span>
                  </div>
                </div>

                {/* Email (opsional) */}
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block mb-1.5">
                    Email <span className="text-zinc-600 normal-case">(opsional)</span>
                  </label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className={inp} style={inpStyle}/>
                </div>

                {/* Password */}
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block mb-1.5">
                    Password Baru *
                  </label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Minimal 4 karakter" required minLength={4}
                      className={inp + ' pr-11'} style={inpStyle}/>
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-emerald-400 transition-colors">
                      {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                </div>

                {/* Konfirmasi */}
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block mb-1.5">
                    Konfirmasi Password *
                  </label>
                  <input type="password"
                    value={konfirmasi} onChange={e => setKonfirmasi(e.target.value)}
                    placeholder="Ulangi password" required
                    className={inp} style={{ ...inpStyle,
                      borderColor: konfirmasi && konfirmasi !== password ? 'rgba(239,68,68,0.4)' :
                                   konfirmasi && konfirmasi === password ? 'rgba(0,180,138,0.4)' :
                                   'rgba(0,180,138,0.2)',
                    }}/>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all mt-2 disabled:opacity-40"
                  style={{ background:C.accent, color:C.dark }}>
                  {loading
                    ? <div className="w-4 h-4 border-2 border-[#020D06]/30 border-t-[#020D06] rounded-full animate-spin"/>
                    : <UserPlus size={15}/>
                  }
                  {loading ? 'Mendaftarkan...' : 'Buat Akun'}
                </button>
              </form>
            )}
          </div>

          <div className="mt-5 text-center">
            <span className="text-zinc-600 text-xs">Sudah punya akun? </span>
            <Link href="/atlet/login"
              className="text-xs font-bold transition-colors" style={{ color:C.accent }}>
              Login di sini
            </Link>
          </div>
          <p className="text-center text-zinc-700 text-[10px] mt-3">
            © 2026 KONI Kabupaten Bogor · PORPROV XV
          </p>
        </div>
      </div>
    </div>
  )
}