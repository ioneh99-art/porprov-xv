'use client'
import { useEffect, useState } from 'react'
import { Trophy, Save, Search } from 'lucide-react'

export default function InputHasilPage() {
  const [nomors, setNomors] = useState<any[]>([])
  const [peserta, setPeserta] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPeserta, setLoadingPeserta] = useState(false)
  const [me, setMe] = useState<any>(null)
  const [selectedNomor, setSelectedNomor] = useState<any>(null)
  const [hasil, setHasil] = useState<Record<number, { nilai: string; medali: string }>>({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const meData = await fetch('/api/auth/me').then(r => r.json())
    setMe(meData)

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data } = await supabase
      .from('nomor_pertandingan')
      .select('*, venue(nama)')
      .eq('cabor_id', meData.cabor_id)
      .order('tanggal_pertandingan')

    setNomors(data ?? [])
    setLoading(false)
  }

  const loadPeserta = async (nomor: any) => {
    setSelectedNomor(nomor)
    setLoadingPeserta(true)
    setPeserta([])
    setHasil({})

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Ambil atlet yang sudah Verified di cabor ini
    const { data: atletList } = await supabase
      .from('atlet')
      .select('id, nama_lengkap, kontingen(nama)')
      .eq('cabor_id', me.cabor_id)
      .eq('status_registrasi', 'Verified')
      .eq('gender', nomor.gender === 'MIXED' ? undefined : nomor.gender)

    // Ambil hasil yang sudah ada
    const { data: hasilList } = await supabase
      .from('hasil_pertandingan')
      .select('*')
      .eq('nomor_id', nomor.id)

    const hasilMap: Record<number, { nilai: string; medali: string }> = {}
    hasilList?.forEach(h => {
      hasilMap[h.atlet_id] = {
        nilai: h.nilai?.toString() ?? '',
        medali: h.medali ?? 'none',
      }
    })

    setPeserta(atletList ?? [])
    setHasil(hasilMap)
    setLoadingPeserta(false)
  }

  const handleHasilChange = (atletId: number, field: 'nilai' | 'medali', value: string) => {
    setHasil(prev => ({
      ...prev,
      [atletId]: { ...prev[atletId] ?? { nilai: '', medali: 'none' }, [field]: value }
    }))
  }

  const handleSave = async () => {
    if (!selectedNomor) return
    setSaving(true)
    setError('')
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      for (const atlet of peserta) {
        const h = hasil[atlet.id]
        if (!h || (!h.nilai && h.medali === 'none')) continue

        await supabase.from('hasil_pertandingan').upsert({
          nomor_id: selectedNomor.id,
          atlet_id: atlet.id,
          kontingen_id: atlet.kontingen_id,
          nilai: h.nilai ? parseFloat(h.nilai) : null,
          medali: h.medali || 'none',
          diinput_oleh: me.id,
        }, { onConflict: 'nomor_id,atlet_id' })
      }

      setSuccess('Hasil berhasil disimpan!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const medaliColor = (m: string) => {
    if (m === 'emas') return 'text-yellow-400'
    if (m === 'perak') return 'text-slate-300'
    if (m === 'perunggu') return 'text-amber-600'
    return 'text-slate-600'
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-lg font-semibold text-white">Input Hasil Pertandingan</h1>
        <p className="text-slate-500 text-xs mt-0.5">Pilih nomor lalu input hasil & medali</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Daftar Nomor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <div className="text-white text-sm font-medium">Nomor Pertandingan</div>
          </div>
          <div className="p-2">
            {nomors.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-xs">
                Belum ada nomor — tambah di menu Nomor Pertandingan
              </div>
            ) : nomors.map(n => (
              <button key={n.id} onClick={() => loadPeserta(n)}
                className={`w-full text-left px-4 py-3 rounded-xl mb-1 transition-all
                  ${selectedNomor?.id === n.id
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'hover:bg-slate-800'}`}>
                <div className={`text-sm font-medium ${selectedNomor?.id === n.id ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {n.nama}
                </div>
                <div className="text-slate-500 text-[10px] mt-0.5 flex gap-2">
                  <span>{n.gender === 'L' ? 'Putra' : n.gender === 'P' ? 'Putri' : 'Mixed'}</span>
                  {n.tanggal_pertandingan && <span>· {n.tanggal_pertandingan}</span>}
                  {n.venue?.nama && <span>· {n.venue.nama}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Input Hasil */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {!selectedNomor ? (
            <div className="flex items-center justify-center h-full py-20">
              <div className="text-center">
                <Trophy size={32} className="text-slate-700 mx-auto mb-3" />
                <div className="text-slate-600 text-sm">Pilih nomor pertandingan</div>
                <div className="text-slate-700 text-xs mt-1">untuk mulai input hasil</div>
              </div>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-white text-sm font-medium">{selectedNomor.nama}</div>
                  <div className="text-slate-500 text-xs mt-0.5">
                    {peserta.length} atlet terdaftar
                  </div>
                </div>
                <div className="flex gap-2">
                  {success && (
                    <span className="text-emerald-400 text-xs py-2">✅ {success}</span>
                  )}
                  {error && (
                    <span className="text-red-400 text-xs py-2">⚠ {error}</span>
                  )}
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-semibold text-xs px-4 py-2 rounded-lg transition-all">
                    {saving
                      ? <div className="w-3 h-3 border border-slate-900 border-t-transparent rounded-full animate-spin" />
                      : <Save size={13} />}
                    Simpan Hasil
                  </button>
                </div>
              </div>

              {loadingPeserta ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                </div>
              ) : peserta.length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-sm">
                  Tidak ada atlet Verified di nomor ini
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-5 py-3">Atlet</th>
                      <th className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3">Kontingen</th>
                      <th className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3">
                        Nilai ({selectedNomor.satuan || selectedNomor.tipe_skor})
                      </th>
                      <th className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3">Medali</th>
                    </tr>
                  </thead>
                  <tbody>
                    {peserta.map(a => (
                      <tr key={a.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-3 text-slate-200 text-xs font-medium">{a.nama_lengkap}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{a.kontingen?.nama}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.001"
                            value={hasil[a.id]?.nilai ?? ''}
                            onChange={e => handleHasilChange(a.id, 'nilai', e.target.value)}
                            placeholder="0.000"
                            className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={hasil[a.id]?.medali ?? 'none'}
                            onChange={e => handleHasilChange(a.id, 'medali', e.target.value)}
                            className={`bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 transition-colors ${medaliColor(hasil[a.id]?.medali ?? 'none')}`}>
                            <option value="none">— Tidak ada —</option>
                            <option value="emas">🥇 Emas</option>
                            <option value="perak">🥈 Perak</option>
                            <option value="perunggu">🥉 Perunggu</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}