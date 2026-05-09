'use client'
import { useEffect, useState } from 'react'
import { Search, Plus, Save, Trash2 } from 'lucide-react'

export default function AdminKualifikasiPage() {
  const [cabors, setCabors] = useState<any[]>([])
  const [nomors, setNomors] = useState<any[]>([])
  const [kontingens, setKontingens] = useState<any[]>([])
  const [kuotas, setKuotas] = useState<any[]>([])
  const [selectedCabor, setSelectedCabor] = useState('')
  const [selectedNomor, setSelectedNomor] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [me, setMe] = useState<any>(null)

  useEffect(() => { loadInit() }, [])
  useEffect(() => {
    if (selectedCabor) loadNomors()
  }, [selectedCabor])
  useEffect(() => {
    if (selectedNomor) loadKuotas()
  }, [selectedNomor])

  const loadInit = async () => {
    const meData = await fetch('/api/auth/me').then(r => r.json())
    setMe(meData)

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const [{ data: caborList }, { data: kontigenList }] = await Promise.all([
      supabase.from('cabang_olahraga').select('id, nama').eq('is_active', true).order('nama'),
      supabase.from('kontingen').select('id, nama').order('nama'),
    ])

    setCabors(caborList ?? [])
    setKontingens(kontigenList ?? [])
  }

  const loadNomors = async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('nomor_pertandingan')
      .select('id, nama, gender')
      .eq('cabor_id', selectedCabor)
      .order('nama')
    setNomors(data ?? [])
    setSelectedNomor('')
    setKuotas([])
  }

  const loadKuotas = async () => {
    setLoading(true)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('kuota_kualifikasi')
      .select('*, kontingen(nama)')
      .eq('nomor_id', selectedNomor)

    // Merge dengan semua kontingen
    const merged = kontingens.map(k => {
      const existing = data?.find(d => d.kontingen_id === k.id)
      return {
        kontingen_id: k.id,
        kontingen_nama: k.nama,
        kuota_max: existing?.kuota_max ?? 1,
        id: existing?.id ?? null,
        changed: false,
      }
    })
    setKuotas(merged)
    setLoading(false)
  }

  const handleKuotaChange = (kontingenId: number, value: number) => {
    setKuotas(prev => prev.map(k =>
      k.kontingen_id === kontingenId
        ? { ...k, kuota_max: value, changed: true }
        : k
    ))
  }

  const handleSaveAll = async () => {
    setSaving(true)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const changed = kuotas.filter(k => k.changed)
    for (const k of changed) {
      await supabase.from('kuota_kualifikasi').upsert({
        nomor_id: parseInt(selectedNomor),
        kontingen_id: k.kontingen_id,
        kuota_max: k.kuota_max,
        created_by: me.id,
      }, { onConflict: 'nomor_id,kontingen_id' })
    }

    await loadKuotas()
    setSaving(false)
  }

  const setAllKuota = (val: number) => {
    setKuotas(prev => prev.map(k => ({ ...k, kuota_max: val, changed: true })))
  }

  const selectedNomorData = nomors.find(n => n.id.toString() === selectedNomor)
  const totalKuota = kuotas.reduce((sum, k) => sum + (k.kuota_max || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-lg font-semibold text-white">Setup Kuota Kualifikasi</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Tentukan berapa atlet per kontingen untuk setiap nomor pertandingan
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
              Cabang Olahraga
            </label>
            <select value={selectedCabor} onChange={e => setSelectedCabor(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all">
              <option value="">-- Pilih Cabor --</option>
              {cabors.map(c => (
                <option key={c.id} value={c.id}>{c.nama}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
              Nomor Pertandingan
            </label>
            <select value={selectedNomor} onChange={e => setSelectedNomor(e.target.value)}
              disabled={!selectedCabor}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50">
              <option value="">-- Pilih Nomor --</option>
              {nomors.map(n => (
                <option key={n.id} value={n.id}>
                  {n.nama} ({n.gender === 'L' ? 'Putra' : n.gender === 'P' ? 'Putri' : 'Mixed'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Kuota Table */}
      {selectedNomor && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-white text-sm font-medium">{selectedNomorData?.nama}</div>
              <div className="text-slate-500 text-xs mt-0.5">
                Total kuota: <span className="text-white font-medium">{totalKuota}</span> atlet dari {kontingens.length} kontingen
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs">Set semua ke:</span>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setAllKuota(n)}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white text-xs font-medium transition-all">
                  {n}
                </button>
              ))}
              <button onClick={handleSaveAll} disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs px-4 py-2 rounded-lg transition-all font-semibold ml-2">
                {saving
                  ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                  : <Save size={13} />}
                Simpan Semua
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-5 py-3">Kontingen</th>
                    <th className="text-center text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3 w-40">Kuota Atlet</th>
                    <th className="text-center text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3 w-32">Terpakai</th>
                  </tr>
                </thead>
                <tbody>
                  {kuotas.map(k => (
                    <tr key={k.kontingen_id} className={`border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors ${k.changed ? 'bg-blue-500/5' : ''}`}>
                      <td className="px-5 py-2.5 text-slate-200 text-xs font-medium">
                        {k.kontingen_nama}
                        {k.changed && <span className="ml-2 text-[9px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">diubah</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleKuotaChange(k.kontingen_id, Math.max(0, k.kuota_max - 1))}
                            className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-all">−</button>
                          <span className="text-white text-sm font-semibold w-6 text-center">{k.kuota_max}</span>
                          <button onClick={() => handleKuotaChange(k.kontingen_id, k.kuota_max + 1)}
                            className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-all">+</button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-slate-500 text-xs">0 / {k.kuota_max}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!selectedNomor && (
        <div className="text-center py-16 text-slate-600 text-sm">
          Pilih cabor dan nomor pertandingan untuk setup kuota
        </div>
      )}
    </div>
  )
}