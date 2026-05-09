'use client'
import { useEffect, useState } from 'react'
import { Plus, Save, Trash2, Calendar, Clock, MapPin, Edit2, X } from 'lucide-react'

const FASE_OPTIONS = ['Penyisihan', 'Babak 16 Besar', 'Perempat Final', 'Semi Final', 'Final', 'Perebutan Juara 3']
const STATUS_OPTIONS = ['Terjadwal', 'Berlangsung', 'Selesai', 'Ditunda', 'Dibatalkan']

export default function JadwalOperatorPage() {
  const [me, setMe] = useState<any>(null)
  const [nomors, setNomors] = useState<any[]>([])
  const [venues, setVenues] = useState<any[]>([])
  const [jadwal, setJadwal] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nomor_id: '',
    tanggal: '',
    waktu_mulai: '',
    waktu_selesai: '',
    venue_id: '',
    fase: 'Penyisihan',
    keterangan: '',
    status: 'Terjadwal',
  })

  useEffect(() => { loadInit() }, [])

  const loadInit = async () => {
    const meData = await fetch('/api/auth/me').then(r => r.json())
    setMe(meData)

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const [{ data: nomorList }, { data: venueList }, { data: jadwalList }] = await Promise.all([
      supabase.from('nomor_pertandingan')
        .select('id, nama, gender')
        .eq('cabor_id', meData.cabor_id)
        .eq('status', 'Approved')
        .order('nama'),
      supabase.from('venue')
        .select('id, nama, alamat')
        .order('nama'),
      supabase.from('jadwal_pertandingan')
        .select(`
          id, tanggal, waktu_mulai, waktu_selesai,
          fase, status, keterangan,
          nomor_pertandingan(id, nama, gender),
          venue(id, nama)
        `)
        .order('tanggal')
        .order('waktu_mulai'),
    ])

    // Filter jadwal untuk cabor ini
    const nomorIds = new Set((nomorList ?? []).map((n: any) => n.id))
    const filtered = (jadwalList ?? []).filter((j: any) =>
      nomorIds.has(j.nomor_pertandingan?.id)
    )

    setNomors(nomorList ?? [])
    setVenues(venueList ?? [])
    setJadwal(filtered)
    setLoading(false)
  }

  const handleEdit = (j: any) => {
    setEditId(j.id)
    setForm({
      nomor_id: j.nomor_pertandingan?.id?.toString() ?? '',
      tanggal: j.tanggal ?? '',
      waktu_mulai: j.waktu_mulai?.slice(0, 5) ?? '',
      waktu_selesai: j.waktu_selesai?.slice(0, 5) ?? '',
      venue_id: j.venue?.id?.toString() ?? '',
      fase: j.fase ?? 'Penyisihan',
      keterangan: j.keterangan ?? '',
      status: j.status ?? 'Terjadwal',
    })
    setShowForm(true)
    setError('')
  }

  const handleReset = () => {
    setEditId(null)
    setForm({
      nomor_id: '', tanggal: '', waktu_mulai: '',
      waktu_selesai: '', venue_id: '', fase: 'Penyisihan',
      keterangan: '', status: 'Terjadwal',
    })
    setError('')
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!form.nomor_id || !form.tanggal) {
      setError('Nomor pertandingan dan tanggal wajib diisi')
      return
    }
    setSaving(true)
    setError('')
    try {
      const method = editId ? 'PATCH' : 'POST'
      const body = editId ? { id: editId, ...form } : form
      const res = await fetch('/api/jadwal', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      handleReset()
      loadInit()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus jadwal ini?')) return
    await fetch('/api/jadwal', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadInit()
  }

  const handleUpdateStatus = async (id: number, status: string) => {
    await fetch('/api/jadwal', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    loadInit()
  }

  const genderLabel = (g: string) => {
    if (g === 'L') return 'Putra'
    if (g === 'P') return 'Putri'
    if (g === 'MIX') return 'Mix'
    return 'Open'
  }

  const statusColor = (s: string) => {
    if (s === 'Berlangsung') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    if (s === 'Selesai') return 'bg-slate-700/50 text-slate-400 border-slate-700'
    if (s === 'Ditunda') return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    if (s === 'Dibatalkan') return 'bg-red-500/10 text-red-400 border-red-500/20'
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  }

  // Group by tanggal
  const grouped = jadwal.reduce((acc: any, j: any) => {
    const tgl = j.tanggal ?? 'Belum ditentukan'
    if (!acc[tgl]) acc[tgl] = []
    acc[tgl].push(j)
    return acc
  }, {})

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-lg font-semibold text-white">Jadwal Pertandingan</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Kelola jadwal nomor pertandingan cabor kamu
          </p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null) }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2.5 rounded-xl transition-all font-semibold">
          <Plus size={13} /> Tambah Jadwal
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="text-white text-sm font-medium">
              {editId ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}
            </div>
            <button onClick={handleReset}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
              <X size={14} />
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                Nomor Pertandingan <span className="text-red-400">*</span>
              </label>
              <select value={form.nomor_id}
                onChange={e => setForm(p => ({ ...p, nomor_id: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all">
                <option value="">-- Pilih Nomor --</option>
                {nomors.map((n: any) => (
                  <option key={n.id} value={n.id}>
                    {n.nama} ({genderLabel(n.gender)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                Tanggal <span className="text-red-400">*</span>
              </label>
              <input type="date" value={form.tanggal}
                min="2026-11-07" max="2026-11-20"
                onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all" />
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                Fase
              </label>
              <select value={form.fase}
                onChange={e => setForm(p => ({ ...p, fase: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all">
                {FASE_OPTIONS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                Waktu Mulai
              </label>
              <input type="time" value={form.waktu_mulai}
                onChange={e => setForm(p => ({ ...p, waktu_mulai: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all" />
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                Waktu Selesai
              </label>
              <input type="time" value={form.waktu_selesai}
                onChange={e => setForm(p => ({ ...p, waktu_selesai: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all" />
            </div>

            <div className="col-span-2">
              <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                Venue
              </label>
              <select value={form.venue_id}
                onChange={e => setForm(p => ({ ...p, venue_id: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all">
                <option value="">-- Pilih Venue --</option>
                {venues.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.nama}</option>
                ))}
              </select>
            </div>

            {editId && (
              <div>
                <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                  Status
                </label>
                <select value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all">
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            <div className={editId ? '' : 'col-span-2'}>
              <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                Keterangan
              </label>
              <input type="text" value={form.keterangan}
                onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))}
                placeholder="Catatan tambahan (opsional)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all" />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
              {saving
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Save size={13} />}
              {editId ? 'Simpan Perubahan' : 'Tambah Jadwal'}
            </button>
            <button onClick={handleReset}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm transition-all">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* List Jadwal */}
      {jadwal.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <Calendar size={32} className="text-slate-700 mx-auto mb-3" />
          <div className="text-slate-600 text-sm">Belum ada jadwal</div>
          <div className="text-slate-700 text-xs mt-1">
            Klik "Tambah Jadwal" untuk mulai membuat jadwal pertandingan
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([tgl, items]: any) => (
            <div key={tgl}>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl">
                  {tgl === 'Belum ditentukan' ? tgl : new Date(tgl).toLocaleDateString('id-ID', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </div>
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-slate-600 text-xs">{items.length} nomor</span>
              </div>

              <div className="space-y-2">
                {items.map((j: any) => (
                  <div key={j.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl px-5 py-4 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-white text-sm font-medium">
                            {j.nomor_pertandingan?.nama}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
                            ${j.nomor_pertandingan?.gender === 'L' ? 'bg-blue-500/10 text-blue-400' :
                              j.nomor_pertandingan?.gender === 'P' ? 'bg-pink-500/10 text-pink-400' :
                              'bg-purple-500/10 text-purple-400'}`}>
                            {genderLabel(j.nomor_pertandingan?.gender)}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                            {j.fase}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                          {j.waktu_mulai && (
                            <div className="flex items-center gap-1">
                              <Clock size={11} />
                              <span>
                                {j.waktu_mulai.slice(0,5)}
                                {j.waktu_selesai && ` – ${j.waktu_selesai.slice(0,5)}`}
                              </span>
                            </div>
                          )}
                          {j.venue && (
                            <div className="flex items-center gap-1">
                              <MapPin size={11} />
                              <span>{j.venue.nama}</span>
                            </div>
                          )}
                        </div>
                        {j.keterangan && (
                          <div className="mt-1.5 text-slate-500 text-xs">
                            {j.keterangan}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Quick status update */}
                        <select
                          value={j.status}
                          onChange={e => handleUpdateStatus(j.id, e.target.value)}
                          className={`text-[10px] px-2 py-1 rounded-lg border font-medium bg-transparent cursor-pointer transition-all ${statusColor(j.status)}`}>
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s} className="bg-slate-900 text-slate-200">{s}</option>
                          ))}
                        </select>
                        <button onClick={() => handleEdit(j)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(j.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}