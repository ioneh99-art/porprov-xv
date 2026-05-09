'use client'
import { useEffect, useState } from 'react'
import { Medal, Filter } from 'lucide-react'
import Link from 'next/link'

export default function HasilPublikPage() {
  const [hasil, setHasil] = useState<any[]>([])
  const [cabors, setCabors] = useState<any[]>([])
  const [kontingens, setKontingens] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCabor, setSelectedCabor] = useState('')
  const [selectedKontingen, setSelectedKontingen] = useState('')

  useEffect(() => { loadMaster() }, [])
  useEffect(() => { loadHasil() }, [selectedCabor, selectedKontingen])

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

  const loadHasil = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCabor) params.set('cabor_id', selectedCabor)
      if (selectedKontingen) params.set('kontingen_id', selectedKontingen)
      const res = await fetch(`/api/publik/hasil?${params}`)
      const data = await res.json()
      setHasil(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  const medaliIcon = (m: string) => {
    if (m === 'emas') return '🥇'
    if (m === 'perak') return '🥈'
    if (m === 'perunggu') return '🥉'
    return '—'
  }

  const medaliColor = (m: string) => {
    if (m === 'emas') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    if (m === 'perak') return 'bg-slate-400/10 text-slate-300 border-slate-400/20'
    if (m === 'perunggu') return 'bg-amber-600/10 text-amber-600 border-amber-600/20'
    return ''
  }

  // Group by cabor
  const grouped = hasil.reduce((acc: any, h: any) => {
    const cabor = h.nomor_pertandingan?.cabang_olahraga?.nama ?? 'Lainnya'
    if (!acc[cabor]) acc[cabor] = []
    acc[cabor].push(h)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-porprov.png" alt="PORPROV XV"
              className="w-9 h-9 object-contain mix-blend-lighten" />
            <div>
              <div className="text-white text-sm font-semibold">Hasil Pertandingan</div>
              <div className="text-slate-500 text-[10px]">PORPROV XV · Jawa Barat 2026</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/publik/jadwal"
              className="text-slate-400 hover:text-white text-xs transition-colors">
              Jadwal →
            </Link>
            <Link href="/publik/klasemen"
              className="text-slate-400 hover:text-white text-xs transition-colors">
              Klasemen →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏅</div>
          <h1 className="text-white text-3xl font-bold mb-2">Hasil Pertandingan</h1>
          <p className="text-slate-500 text-sm">PORPROV XV Jawa Barat 2026</p>
        </div>

        {/* Filter */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <select value={selectedCabor} onChange={e => setSelectedCabor(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all">
            <option value="">Semua Cabor</option>
            {cabors.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nama}</option>
            ))}
          </select>
          <select value={selectedKontingen} onChange={e => setSelectedKontingen(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all">
            <option value="">Semua Kontingen</option>
            {kontingens.map((k: any) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : hasil.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🏅</div>
            <div className="text-slate-500 text-sm">Belum ada hasil pertandingan</div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([cabor, items]: any) => (
              <div key={cabor} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
                  <Medal size={14} className="text-blue-400" />
                  <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">
                    {cabor}
                  </span>
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-slate-600 text-[10px]">{items.length} medali</span>
                </div>
                <div className="divide-y divide-slate-800/50">
                  {items.map((h: any, i: number) => (
                    <div key={i} className={`flex items-center gap-4 px-5 py-3 border ${medaliColor(h.medali)}`}>
                      <span className="text-2xl">{medaliIcon(h.medali)}</span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-200">
                          {h.nomor_pertandingan?.nama}
                        </div>
                        <div className="text-slate-400 text-xs mt-0.5">
                          {h.atlet?.nama_lengkap}
                          {h.nilai && <span className="ml-2">· {h.nilai}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-300 text-xs font-medium">{h.kontingen?.nama}</div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold capitalize ${medaliColor(h.medali)}`}>
                          {h.medali}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-10 text-slate-800 text-xs">
          © 2026 KONI Jawa Barat · Sistem Informasi PORPROV XV
        </div>
      </div>
    </div>
  )
}