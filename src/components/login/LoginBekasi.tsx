'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, Monitor } from 'lucide-react'
import { setTenantPersist } from '@/hooks/useTenant'

// BEKASI — Command Center Style
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

      // ✅ Set tenant persist SEBELUM redirect
      setTenantPersist('bekasi')

      router.push(data.redirect)
    } catch { setError('Tidak dapat terhubung ke server'); setLoading(false) }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0a0a0a' }}>
      <div className="hidden lg:flex w-[52%] flex-col relative overflow-hidden"
        style={{ background: '#0f0f0f', borderRight: '1px solid #1a1a1a' }}>
        <div className="w-full h-1.5" style={{ background: 'linear-gradient(90deg, #dc2626, #ef4444, #dc2626)' }} />
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(#dc262615 1px, transparent 1px), linear-gradient(90deg, #dc262615 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative px-10 pt-10 pb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.4)' }}>
              <Monitor size={20} style={{ color: '#dc2626' }} />
            </div>
            <div>
              <div style={{ color: '#dc2626', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Command Center</div>
              <div style={{ color: 'white', fontSize: 15, fontWeight: 700 }}>PORPROV XV · Kota Bekasi</div>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-8 px-3 py-2 rounded-lg"
            style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#dc2626' }} />
            <span style={{ color: '#dc2626', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em' }}>SISTEM AKTIF · REAL-TIME</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: 'Total Venue', value: '25' },
              { label: 'Cabang Olahraga', value: '49' },
              { label: 'Nomor Pertandingan', value: '200+' },
              { label: 'Status Klaster', value: 'AKTIF' },
            ].map(({ label, value }) => (
              <div key={label} className="p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                <div style={{ color: '#dc2626', fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{value}</div>
              </div>
            ))}
          </div>
          <div className="h-px w-full mb-4" style={{ background: 'linear-gradient(90deg, #dc2626, transparent)' }} />
          <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Venue Aktif</div>
          <div className="space-y-2">
            {['Stadion Patriot Candrabhaga','GOR Bekasi Cyber Park','Kolam Renang Harapan Indah','Lapangan Tenis Bekasi Barat'].map((v, i) => (
              <div key={v} className="flex items-center gap-3 py-2 px-3 rounded-lg"
                style={{ background: i===0?'rgba(220,38,38,0.08)':'transparent', borderLeft: i===0?'2px solid #dc2626':'2px solid transparent' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: i===0?'#dc2626':'#374151' }} />
                <span style={{ color: i===0?'#e5e7eb':'#6b7280', fontSize: 11 }}>{v}</span>
                {i===0 && <span style={{ marginLeft:'auto', color:'#dc2626', fontSize:9, fontWeight:700 }}>AKTIF</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-auto px-10 pb-8">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1" style={{ background: 'rgba(220,38,38,0.2)' }} />
            <span style={{ color: '#374151', fontSize: 10 }}>PORPROV XV Platform · KONI Jabar 2026</span>
            <div className="h-px flex-1" style={{ background: 'rgba(220,38,38,0.2)' }} />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-10">
        <div className="w-full max-w-xs">
          <div className="mb-8">
            <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom: 6 }}>Tuan Rumah Klaster I</div>
            <h1 style={{ color: 'white', fontSize: 24, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 }}>
              Masuk ke<br/><span style={{ color: '#dc2626' }}>Command Center</span>
            </h1>
            <p style={{ color: '#4b5563', fontSize: 13 }}>Portal penyelenggara Kota Bekasi</p>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4"
              style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)' }}>
              <AlertCircle size={13} style={{ color: '#dc2626' }} />
              <span style={{ color: '#fca5a5', fontSize: 12 }}>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform:'uppercase', display:'block', marginBottom: 6 }}>Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Username Bekasi" autoComplete="username" required
                style={{ width:'100%', background:'#161616', border:'1px solid #262626', borderRadius:10, padding:'10px 14px', fontSize:13, color:'white', outline:'none', boxSizing:'border-box' }}
                onFocus={e => e.target.style.borderColor='#dc2626'}
                onBlur={e => e.target.style.borderColor='#262626'} />
            </div>
            <div>
              <label style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform:'uppercase', display:'block', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass?'text':'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Password" autoComplete="current-password" required
                  style={{ width:'100%', background:'#161616', border:'1px solid #262626', borderRadius:10, padding:'10px 40px 10px 14px', fontSize:13, color:'white', outline:'none', boxSizing:'border-box' }}
                  onFocus={e => e.target.style.borderColor='#dc2626'}
                  onBlur={e => e.target.style.borderColor='#262626'} />
                <button type="button" onClick={() => setShowPass(s=>!s)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#4b5563' }}>
                  {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading || !username || !password}
              style={{
                width:'100%', padding:'11px', borderRadius:10, fontSize:13, fontWeight:700,
                color:'white', border:'none', cursor:loading||!username||!password?'not-allowed':'pointer',
                background:loading||!username||!password?'#1f1f1f':'linear-gradient(135deg, #dc2626, #b91c1c)',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                letterSpacing:'0.05em', textTransform:'uppercase', marginTop:8,
              }}>
              {loading ? <div style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/> : <Monitor size={14}/>}
              {loading ? 'Verifikasi...' : 'Akses Command Center'}
            </button>
          </form>
          <div style={{ marginTop:24, textAlign:'center', color:'#374151', fontSize:11 }}>
            © 2026 Kota Bekasi · PORPROV XV Jawa Barat
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}