'use client'
import { useEffect, useState } from 'react'
import { Search, User, Filter } from 'lucide-react'
import Link from 'next/link'

export default function CariAtletPage() {
  const [hasil, setHasil] = useState<any[]>([])
  const [cabors, setCabors] = useState<any[]>([])
  const [kontingens, setKontingens] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [selectedCabor, setSelectedCabor] = useState('')
  const [selectedKontingen, setSelectedKontingen] = useState('')
  const [searched, setSearched] = useState(false)

  useEffect(() => { loadMaster() }, [])

  const loadMaster = async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const [{ data: c }, { data: k }] = await Promise.all([
      supabase.from('cabang_olahraga').select('id, nama').eq('is_active', true).order('nama'),
      supabase.from('kontingen').select('id, nama').order('nama'),
    ])
    setCabors(c ?? [])
    setKontingens(k ?? [])
  }

  const handleSearch = async () => {
    if (q.length < 3 && !selectedCabor && !selectedKontingen) return
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (selectedCabor) params.set('cabor_id', selectedCabor)
      if (selectedKontingen) params.set('kontingen_id', selectedKontingen)
      const res = await fetch(`/api/publik/atlet?${params}`)
      const data = await res.json()
      setHasil(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  const hitungUsia = (tgl: string) => {
    if (!tgl) return ''
    const today = new Date()
    const lahir = new Date(tgl)
    return `${today.getFullYear() - lahir.getFullYear()} tahun`
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-porprov.png" alt="PORPROV XV"
              className="w-9 h-9 object-contain mix-blend-lighten" />
            <div>
              <div className="text-white text-sm font-semibold">Cari Atlet</div>
              <div className="text-slate-500 text-[10px]">PORPROV XV · Jawa Barat 2026</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/publik/jadwal" className="text-slate-400 hover:text-white text-xs transition-colors">Jadwal →</Link>
            <Link href="/publik/klasemen" className="text-slate-400 hover:text-white text-xs transition-colors">Klasemen →</Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔍</div>
          <h1 className="text-white text-3xl font-bold mb-2">Cari Atlet</h1>
          <p className="text-slate-500 text-sm">Data atlet resmi PORPROV XV Jawa Barat 2026</p>
        </div>

        {/* Search */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
          <div className="flex gap-3 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="text" value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Cari nama atlet (min. 3 huruf)..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all" />
            </div>
            <button onClick={handleSearch}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all">
              Cari
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={selectedCabor} onChange={e => setSelectedCabor(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all">
              <option value="">Semua Cabor</option>
              {cabors.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nama}</option>
              ))}
            </select>
            <select value={selectedKontingen} onChange={e => setSelectedKontingen(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all">
              <option value="">Semua Kontingen</option>
              {kontingens.map((k: any) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Hasil */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : !searched ? (
          <div className="text-center py-16 text-slate-600 text-sm">
            Masukkan nama atlet atau pilih filter untuk mencari
          </div>
        ) : hasil.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">😕</div>
            <div className="text-slate-500 text-sm">Atlet tidak ditemukan</div>
            <div className="text-slate-700 text-xs mt-1">Coba kata kunci lain</div>
          </div>
        ) : (
          <div>
            <div className="text-slate-500 text-xs mb-4">{hasil.length} atlet ditemukan</div>
            <div className="grid grid-cols-2 gap-3">
              {hasil.map((a: any) => (
                <div key={a.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {a.foto_url
                        ? <img src={a.foto_url} alt="" className="w-full h-full object-cover" />
                        : <User size={18} className="text-slate-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-semibold truncate">
                        {a.nama_lengkap}
                      </div>
                      <div className="text-slate-400 text-xs mt-0.5">
                        {a.cabang_olahraga?.nama}
                      </div>
                      <div className="text-slate-500 text-xs">{a.kontingen?.nama}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
                          ${a.gender === 'L' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}`}>
                          {a.gender === 'L' ? 'Putra' : 'Putri'}
                        </span>
                        {a.tgl_lahir && (
                          <span className="text-slate-600 text-[10px]">
                            {hitungUsia(a.tgl_lahir)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center mt-10 text-slate-800 text-xs">
          © 2026 KONI Jawa Barat · Sistem Informasi PORPROV XV
        </div>
      </div>
    </div>
  )
}