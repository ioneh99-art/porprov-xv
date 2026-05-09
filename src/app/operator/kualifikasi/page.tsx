'use client'
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Users } from 'lucide-react'

export default function OperatorKualifikasiPage() {
  const [me, setMe] = useState<any>(null)
  const [nomors, setNomors] = useState<any[]>([])
  const [selectedNomor, setSelectedNomor] = useState('')
  const [lineup, setLineup] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState<number | null>(null)

  useEffect(() => { loadInit() }, [])
  useEffect(() => { if (selectedNomor) loadLineup() }, [selectedNomor])

  const loadInit = async () => {
    const meData = await fetch('/api/auth/me').then(r => r.json())
    setMe(meData)

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('nomor_pertandingan')
      .select('id, nama, gender')
      .eq('cabor_id', meData.cabor_id)
      .order('nama')
    setNomors(data ?? [])
  }

  const loadLineup = async () => {
    setLoading(true)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('kualifikasi_atlet')
      .select(`
        *,
        atlet(nama_lengkap, gender, tgl_lahir),
        kontingen(nama)
      `)
      .eq('nomor_id', selectedNomor)
      .neq('status', 'Dibatalkan')
      .order('created_at')
    setLineup(data ?? [])
    setLoading(false)
  }

  const handleKonfirmasi = async (id: number) => {
    setProcessing(id)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.from('kualifikasi_atlet').update({
      status: 'Dikonfirmasi',
      dikonfirmasi_oleh: me.id,
      dikonfirmasi_at: new Date().toISOString(),
    }).eq('id', id)
    await loadLineup()
    setProcessing(null)
  }

  const handleKonfirmasiSemua = async () => {
    if (!confirm(`Konfirmasi semua ${lineup.length} atlet sekaligus?`)) return
    setLoading(true)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const ids = lineup.filter(l => l.status === 'Terdaftar').map(l => l.id)
    for (const id of ids) {
      await supabase.from('kualifikasi_atlet').update({
        status: 'Dikonfirmasi',
        dikonfirmasi_oleh: me.id,
        dikonfirmasi_at: new Date().toISOString(),
      }).eq('id', id)
    }
    await loadLineup()
  }

  const handleBatalkan = async (id: number) => {
    const catatan = prompt('Alasan pembatalan:')
    if (!catatan) return
    setProcessing(id)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.from('kualifikasi_atlet').update({
      status: 'Dibatalkan',
      catatan,
    }).eq('id', id)
    await loadLineup()
    setProcessing(null)
  }

  const totalKonfirmasi = lineup.filter(l => l.status === 'Dikonfirmasi').length
  const totalMenunggu = lineup.filter(l => l.status === 'Terdaftar').length
  const selectedNomorData = nomors.find(n => n.id.toString() === selectedNomor)

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-lg font-semibold text-white">Konfirmasi Lineup</h1>
        <p className="text-slate-500 text-xs mt-0.5">
          Konfirmasi atlet yang siap bertanding per nomor pertandingan
        </p>
      </div>

      {/* Pilih Nomor */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-5">
        <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
          Nomor Pertandingan
        </label>
        <select value={selectedNomor} onChange={e => setSelectedNomor(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all">
          <option value="">-- Pilih Nomor --</option>
          {nomors.map(n => (
            <option key={n.id} value={n.id}>
              {n.nama} ({n.gender === 'L' ? 'Putra' : n.gender === 'P' ? 'Putri' : 'Mixed'})
            </option>
          ))}
        </select>
      </div>

      {selectedNomor && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-white text-sm font-medium">{selectedNomorData?.nama}</div>
              <div className="text-slate-500 text-xs mt-0.5">
                {lineup.length} atlet terdaftar ·
                <span className="text-emerald-400 ml-1">{totalKonfirmasi} dikonfirmasi</span> ·
                <span className="text-amber-400 ml-1">{totalMenunggu} menunggu</span>
              </div>
            </div>
            {totalMenunggu > 0 && (
              <button onClick={handleKonfirmasiSemua}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded-lg transition-all font-semibold">
                <CheckCircle size={13} />
                Konfirmasi Semua ({totalMenunggu})
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : lineup.length === 0 ? (
            <div className="text-center py-16">
              <Users size={32} className="text-slate-700 mx-auto mb-3" />
              <div className="text-slate-600 text-sm">Belum ada atlet yang didaftarkan ke nomor ini</div>
              <div className="text-slate-700 text-xs mt-1">KONIDA perlu mendaftarkan atlet terlebih dahulu</div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-5 py-3 w-8">#</th>
                  <th className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3">Atlet</th>
                  <th className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3">Kontingen</th>
                  <th className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3">Gender</th>
                  <th className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3">Status</th>
                  <th className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {lineup.map((l, i) => (
                  <tr key={l.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-3 text-slate-600 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-slate-200 text-xs font-medium">{l.atlet?.nama_lengkap}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{l.kontingen?.nama}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full
                        ${l.atlet?.gender === 'L' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}`}>
                        {l.atlet?.gender === 'L' ? 'Putra' : 'Putri'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium
                        ${l.status === 'Dikonfirmasi'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {l.status === 'Terdaftar' && (
                          <button onClick={() => handleKonfirmasi(l.id)}
                            disabled={processing === l.id}
                            className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50">
                            <CheckCircle size={11} /> Konfirmasi
                          </button>
                        )}
                        {l.status !== 'Dibatalkan' && (
                          <button onClick={() => handleBatalkan(l.id)}
                            disabled={processing === l.id}
                            className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50">
                            <XCircle size={11} /> Batalkan
                          </button>
                        )}
                        {l.status === 'Dikonfirmasi' && (
                          <span className="text-emerald-400 text-[10px]">✅ Siap bertanding</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!selectedNomor && (
        <div className="text-center py-16 text-slate-600 text-sm">
          Pilih nomor pertandingan untuk lihat dan konfirmasi lineup
        </div>
      )}
    </div>
  )
}