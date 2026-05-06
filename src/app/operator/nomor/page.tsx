'use client'
import { useEffect, useState } from 'react'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'

export default function NomorPertandinganPage() {
  const [nomors, setNomors] = useState<any[]>([])
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({
    nama: '', gender: 'L',
    tipe_skor: 'waktu', satuan: '',
    venue_id: '', tanggal_pertandingan: '',
    waktu_mulai: '',
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const meData = await fetch('/api/auth/me').then(r => r.json())
    setMe(meData)

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const [{ data: nomorList }, { data: venueList }] = await Promise.all([
      supabase.from('nomor_pertandingan')
        .select('*, cabang_olahraga(nama), venue(nama)')
        .eq('cabor_id', meData.cabor_id)
        .order('created_at', { ascending: false }),
      supabase.from('venue').select('id, nama').eq('is_active', true),
    ])

    setNomors(nomorList ?? [])
    setVenues(venueList ?? [])
    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { error: err } = await supabase.from('nomor_pertandingan').insert({
        ...form,
        cabor_id: me.cabor_id,
        venue_id: form.venue_id ? parseInt(form.venue_id) : null,
        tanggal_pertandingan: form.tanggal_pertandingan || null,
        waktu_mulai: form.waktu_mulai || null,
      })
      if (err) throw new Error(err.message)
      setShowForm(false)
      setForm({ nama: '', gender: 'L', tipe_skor: 'waktu', satuan: '', venue_id: '', tanggal_pertandingan: '', waktu_mulai: '' })
      await loadData()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus nomor pertandingan ini?')) return
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.from('nomor_pertandingan').delete().eq('id', id)
    await loadData()
  }

  const filtered = nomors.filter(n =>
    n.nama?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-lg font-semibold text-white">Nomor Pertandingan</h1>
          <p className="text-slate-500 text-xs mt-0.5">{nomors.length} nomor terdaftar</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs px-4 py-2 rounded-lg transition-colors font-semibold">
          <Plus size={14} />
          Tambah Nomor
        </button>
      </div>

      {/* Form Tambah */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-5">
          <div className="text-white text-sm font-medium mb-4">Tambah Nomor Pertandingan</div>
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs">{error}</div>
          )}
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                  Nama Nomor <span className="text-red-400">*</span>
                </label>
                <input name="nama" value={form.nama} onChange={handleChange} required
                  placeholder="contoh: Lari 100m Putra"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all" />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">Gender</label>
                <select name="gender" value={form.gender} onChange={handleChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all">
                  <option value="L">Putra</option>
                  <option value="P">Putri</option>
                  <option value="MIXED">Campuran</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">Tipe Skor</label>
                <select name="tipe_skor" value={form.tipe_skor} onChange={handleChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all">
                  <option value="waktu">Waktu (detik/menit)</option>
                  <option value="jarak">Jarak (meter/cm)</option>
                  <option value="nilai">Nilai/Poin</option>
                  <option value="skor">Skor (menang/kalah)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">Satuan</label>
                <input name="satuan" value={form.satuan} onChange={handleChange}
                  placeholder="detik / meter / poin"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all" />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">Venue</label>
                <select name="venue_id" value={form.venue_id} onChange={handleChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all">
                  <option value="">-- Pilih Venue --</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">Tanggal</label>
                <input name="tanggal_pertandingan" value={form.tanggal_pertandingan}
                  onChange={handleChange} type="date"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all" />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">Waktu Mulai</label>
                <input name="waktu_mulai" value={form.waktu_mulai}
                  onChange={handleChange} type="time"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all" />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-xl transition-all">
                {saving
                  ? <div className="w-4 h-4 border-2 border-slate-500 border-t-slate-900 rounded-full animate-spin" />
                  : <Plus size={14} />}
                Simpan
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-white text-sm px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all">
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Cari nomor pertandingan..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors" />
          </div>
          <div className="ml-auto text-slate-500 text-xs">{filtered.length} nomor</div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              {['Nama Nomor', 'Gender', 'Tipe Skor', 'Satuan', 'Venue', 'Tanggal', 'Waktu', ''].map(h => (
                <th key={h} className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3 first:pl-5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-slate-600 text-sm">
                  Belum ada nomor pertandingan — klik Tambah Nomor
                </td>
              </tr>
            ) : filtered.map(n => (
              <tr key={n.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                <td className="px-5 py-3 text-slate-200 text-xs font-medium">{n.nama}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full
                    ${n.gender === 'L' ? 'bg-blue-500/10 text-blue-400'
                    : n.gender === 'P' ? 'bg-pink-500/10 text-pink-400'
                    : 'bg-slate-700 text-slate-400'}`}>
                    {n.gender === 'L' ? 'Putra' : n.gender === 'P' ? 'Putri' : 'Mixed'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{n.tipe_skor}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{n.satuan || '-'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{n.venue?.nama || '-'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{n.tanggal_pertandingan || '-'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{n.waktu_mulai || '-'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(n.id)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}