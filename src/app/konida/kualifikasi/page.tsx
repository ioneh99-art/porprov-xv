'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, CheckCircle, AlertTriangle } from 'lucide-react'

export default function KonidaKualifikasiPage() {
  const [me, setMe] = useState<any>(null)
  const [cabors, setCabors] = useState<any[]>([])
  const [nomors, setNomors] = useState<any[]>([])
  const [atletList, setAtletList] = useState<any[]>([])
  const [kualifikasi, setKualifikasi] = useState<any[]>([])
  const [kuota, setKuota] = useState<any>(null)
  const [selectedCabor, setSelectedCabor] = useState('')
  const [selectedNomor, setSelectedNomor] = useState('')
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState<number | null>(null)

  useEffect(() => { loadInit() }, [])
  useEffect(() => { if (selectedCabor) loadNomors() }, [selectedCabor])
  useEffect(() => { if (selectedNomor) loadKualifikasi() }, [selectedNomor])

  const loadInit = async () => {
    const meData = await fetch('/api/auth/me').then(r => r.json())
    setMe(meData)

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: caborList } = await supabase
      .from('cabang_olahraga').select('id, nama').eq('is_active', true).order('nama')
    setCabors(caborList ?? [])

    // Atlet verified dari kontingen ini
    const { data: atlet } = await supabase
      .from('atlet')
      .select('id, nama_lengkap, cabor_id, cabang_olahraga(nama)')
      .eq('kontingen_id', meData.kontingen_id)
      .eq('status_registrasi', 'Verified')
    setAtletList(atlet ?? [])
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
  }

  const loadKualifikasi = async () => {
    setLoading(true)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const [{ data: kualData }, { data: kuotaData }] = await Promise.all([
      supabase.from('kualifikasi_atlet')
        .select('*, atlet(nama_lengkap, gender)')
        .eq('nomor_id', selectedNomor)
        .eq('kontingen_id', me.kontingen_id),
      supabase.from('kuota_kualifikasi')
        .select('*')
        .eq('nomor_id', selectedNomor)
        .eq('kontingen_id', me.kontingen_id)
        .single(),
    ])

    setKualifikasi(kualData ?? [])
    setKuota(kuotaData)
    setLoading(false)
  }

  const handleDaftarkan = async (atletId: number) => {
    setProcessing(atletId)
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { error } = await supabase.from('kualifikasi_atlet').insert({
        nomor_id: parseInt(selectedNomor),
        atlet_id: atletId,
        kontingen_id: me.kontingen_id,
        status: 'Terdaftar',
        didaftarkan_oleh: me.id,
      })
      if (!error) await loadKualifikasi()
    } finally {
      setProcessing(null)
    }
  }

  const handleBatalkan = async (kualId: number) => {
    if (!confirm('Batalkan pendaftaran atlet ini?')) return
    setProcessing(kualId)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.from('kualifikasi_atlet').delete().eq('id', kualId)
    await loadKualifikasi()
    setProcessing(null)
  }

  const sudahDaftar = (atletId: number) =>
    kualifikasi.some(k => k.atlet_id === atletId)

  const atletCabor = atletList.filter(a =>
    a.cabor_id?.toString() === selectedCabor
  )

  const kuotaMax = kuota?.kuota_max ?? 0
  const kuotaTerpakai = kualifikasi.filter(k => k.status !== 'Dibatalkan').length
  const kuotaSisa = kuotaMax - kuotaTerpakai
  const melebihiKuota = kuotaSisa <= 0 && kuotaMax > 0

  const selectedNomorData = nomors.find(n => n.id.toString() === selectedNomor)

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-lg font-semibold text-white">Kualifikasi Atlet</h1>
        <p className="text-slate-500 text-xs mt-0.5">
          Daftarkan atlet kontingen kamu ke nomor pertandingan
        </p>
      </div>

      {/* Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
              Cabang Olahraga
            </label>
            <select value={selectedCabor} onChange={e => setSelectedCabor(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition-all">
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
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition-all disabled:opacity-50">
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

      {selectedNomor && (
        <div className="grid grid-cols-2 gap-4">

          {/* Atlet tersedia */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <div className="text-white text-sm font-medium">Atlet Tersedia</div>
              <div className="text-slate-500 text-xs mt-0.5">
                Atlet verified di cabor ini — {atletCabor.length} atlet
              </div>
            </div>
            <div className="divide-y divide-slate-800/50">
              {atletCabor.length === 0 ? (
                <div className="text-center py-8 text-slate-600 text-xs">
                  Tidak ada atlet verified di cabor ini
                </div>
              ) : atletCabor.map(a => (
                <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/20 transition-colors">
                  <div>
                    <div className="text-slate-200 text-xs font-medium">{a.nama_lengkap}</div>
                    <div className="text-slate-500 text-[10px]">{a.cabang_olahraga?.nama}</div>
                  </div>
                  {sudahDaftar(a.id) ? (
                    <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                      <CheckCircle size={11} /> Terdaftar
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDaftarkan(a.id)}
                      disabled={processing === a.id || melebihiKuota}
                      className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50 font-medium">
                      <Plus size={11} /> Daftarkan
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sudah didaftarkan */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white text-sm font-medium">
                    Terdaftar di {selectedNomorData?.nama}
                  </div>
                  <div className="text-slate-500 text-xs mt-0.5">
                    {kuotaTerpakai} / {kuotaMax > 0 ? kuotaMax : '∞'} kuota terpakai
                  </div>
                </div>
                {kuotaMax > 0 && (
                  <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium
                    ${melebihiKuota
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                    Sisa: {kuotaSisa}
                  </span>
                )}
              </div>
              {!kuota && (
                <div className="mt-2 flex items-center gap-1.5 text-amber-400 text-[10px]">
                  <AlertTriangle size={11} />
                  Kuota belum diset Admin — tidak ada batasan
                </div>
              )}
              {melebihiKuota && (
                <div className="mt-2 flex items-center gap-1.5 text-red-400 text-[10px]">
                  <AlertTriangle size={11} />
                  Kuota penuh — tidak bisa tambah atlet lagi
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              </div>
            ) : kualifikasi.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-xs">
                Belum ada atlet yang didaftarkan
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {kualifikasi.map((k, i) => (
                  <div key={k.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600 text-xs w-4">{i + 1}</span>
                      <div>
                        <div className="text-slate-200 text-xs font-medium">{k.atlet?.nama_lengkap}</div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full
                          ${k.status === 'Dikonfirmasi' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {k.status}
                        </span>
                      </div>
                    </div>
                    {k.status !== 'Dikonfirmasi' && (
                      <button onClick={() => handleBatalkan(k.id)}
                        disabled={processing === k.id}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedNomor && (
        <div className="text-center py-16 text-slate-600 text-sm">
          Pilih cabor dan nomor pertandingan untuk mendaftarkan atlet
        </div>
      )}
    </div>
  )
}