'use client'
// components/login/LoginBase.tsx
// Shared login component — dikustomisasi per tenant via props

import { useState } from 'react'
import { clearTenant } from '@/hooks/useTenant'
import { useRouter } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, Loader2, LogIn, Shield } from 'lucide-react'

export interface LoginConfig {
  // Identitas
  origin: string        // 'konida' | 'bekasi' | 'jabar' | 'superadmin'
  title: string         // "PORPROV XV"
  subtitle: string      // "Kota Bekasi"
  description: string   // "Sistem Manajemen Kontingen"
  logoSrc?: string      // path logo
  logoFallback: string  // teks fallback jika logo gagal

  // Tema warna
  primaryColor: string  // hex — warna utama tombol & accent
  secondaryColor: string
  bgColor: string       // bg halaman
  cardBg: string        // bg card login
  textColor: string     // warna teks judul
  isDark: boolean       // dark mode

  // Redirect setelah login
  defaultRedirect?: string  // override redirect dari API
}

interface Props {
  config: LoginConfig
}

export default function LoginBase({ config }: Props) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) { setError('Username dan password wajib diisi'); return }
    setError(''); setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Login gagal')
        setLoading(false)
        return
      }

      // Clear tenant lama + simpan login_origin
      clearTenant()
      document.cookie = `login_origin=${config.origin}; path=/; max-age=${60*60*24*30}; samesite=lax`

      // Redirect ke halaman yang sesuai
      const target = config.defaultRedirect ?? data.redirect ?? '/konida'
      router.push(target)

    } catch {
      setError('Tidak bisa terhubung ke server')
      setLoading(false)
    }
  }

  const inputBase = `w-full px-4 py-3 text-sm rounded-xl border outline-none transition-all`

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: config.bgColor }}>

      {/* Card */}
      <div className="w-full max-w-sm">

        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor})` }}>
            {config.logoSrc ? (
              <img src={config.logoSrc} alt={config.title} className="w-14 h-14 object-contain"
                onError={e => {
                  const el = e.target as HTMLImageElement
                  el.style.display = 'none'
                  if (el.parentElement) el.parentElement.innerHTML =
                    `<span class="text-white font-black text-xl">${config.logoFallback}</span>`
                }} />
            ) : (
              <span className="text-white font-black text-xl">{config.logoFallback}</span>
            )}
          </div>
          <h1 className="text-2xl font-black mb-1" style={{ color: config.textColor }}>
            {config.title}
          </h1>
          <p className="text-sm font-semibold" style={{ color: config.primaryColor }}>
            {config.subtitle}
          </p>
          <p className="text-xs mt-1" style={{ color: config.isDark ? '#64748b' : '#94a3b8' }}>
            {config.description}
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl p-6 shadow-xl border"
          style={{
            background: config.cardBg,
            borderColor: config.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          }}>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl mb-5 text-sm"
              style={{ background: `${config.primaryColor}15`, border: `1px solid ${config.primaryColor}30` }}>
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: config.primaryColor }} />
              <span style={{ color: config.primaryColor }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                style={{ color: config.isDark ? '#64748b' : '#94a3b8' }}>
                Username
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Masukkan username"
                autoComplete="username"
                disabled={loading}
                className={inputBase}
                style={{
                  background: config.isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                  borderColor: config.isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                  color: config.isDark ? '#f1f5f9' : '#1e293b',
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                style={{ color: config.isDark ? '#64748b' : '#94a3b8' }}>
                Password
              </label>
              <div className="relative">
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  className={`${inputBase} pr-11`}
                  style={{
                    background: config.isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                    borderColor: config.isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                    color: config.isDark ? '#f1f5f9' : '#1e293b',
                  }}
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: config.isDark ? '#475569' : '#94a3b8' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor})` }}>
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Masuk...</>
                : <><LogIn size={16} /> Masuk</>}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: config.isDark ? '#374151' : '#cbd5e1' }}>
          PORPROV XV · Jawa Barat 2026
        </p>
      </div>
    </div>
  )
}