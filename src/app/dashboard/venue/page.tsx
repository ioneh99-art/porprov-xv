'use client'
import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, MapPin, X, Save } from 'lucide-react'

export default function VenuePage() {
  const [venues, setVenues] = useState<any[]>([])
  const [klasters, setKlasters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nama: '', alamat: '', klaster_id: '', kota: ''
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const [{ data: v }, { data: k }] = await Promise.all([
      supabase.from('venue').select('*, klaster(nama)').order('nama'),
      supabase.from('klaster').select('id, nama').order('nama'),
    ])
    setVenues(v ?? [])
    setKlasters(k ?? [])
    setLoading(false)
  }

  const handleEdit = (v: any) => {
    setEditId(v.id)
    setForm({
      nama: v.nama ?? '',
      alamat: v.alamat ?? '',
      klaster_id: v.klaster_id?.toString() ?? '',
      kota: v.kota ?? '',
    })
    setShowForm(true)
    setError('')
  }

  const handleReset = () => {
    setEditId(null)
    setForm({ nama: '', alamat: '', klaster_id: '', kota: '' })
    setShowForm(false)
    setError('')
  }

  const handleSave = async () => {
    if (!form.nama) { setError('Nama venue wajib diisi'); return }
    setSaving(true)
    setError('')
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const payload = {
        nama: form.nama.trim(),
        alamat: form.alamat.trim() || null,
        klaster_id: form.klaster_id ? parseInt(form.klaster_id) : null,
        kota: form.kota.trim() || null,
      }
      if (editId) {
        await supabase.from('venue').update(payload).eq('id', editId)
      } else {
        await supabase.from('venue').insert(payload)
      }
      handleReset()
      loadData()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus venue ini?')) return
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.from('venue').delete().eq('id', id)
    loadData()
  }

  // Group by klaster
  const grouped = venues.reduce((acc: any, v: any) => {
    const k = v.klaster?.nama ?? 'Tanpa Klaster'
    if (!acc[k]) acc[k] = []
    acc[k].push(v)
    return acc
  }, {})

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-lg font-semibold text-white">Manajemen Venue</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Kelola venue pertandingan per klaster
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2.5 rounded-xl transition-all font-semibold">
          <Plus size={13} /> Tambah Venue
        </button>
      </div>

      {/* Stats klaster */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {klasters.map((k: any) => {
          const count = venues.filter(v => v.klaster_id === k.id).length
          return (
            <div key={k.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="text-white text-2xl font-bold">{count}</div>
              <div className="text-slate-500 text-xs mt-1">{k.nama}</div>
            </div>
          )
        })}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-white text-2xl font-bold">{venues.length}</div>
          <div className="text-slate-500 text-xs mt-1">Total Venue</div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="text-white text-sm font-medium">
              {editId ? 'Edit Venue' : 'Tambah Venue Baru'}
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
                Nama Venue <span className="text-red-400">*</span>
              </label>
              <input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))}
                placeholder="contoh: GOR Kota Bekasi"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                Klaster
              </label>
              <select value={form.klaster_id} onChange={e => setForm(p => ({ ...p, klaster_id: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all">
                <option value="">-- Pilih Klaster --</option>
                {klasters.map((k: any) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                Kota
              </label>
              <input value={form.kota} onChange={e => setForm(p => ({ ...p, kota: e.target.value }))}
                placeholder="contoh: Kota Bekasi"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all" />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                Alamat
              </label>
              <input value={form.alamat} onChange={e => setForm(p => ({ ...p, alamat: e.target.value }))}
                placeholder="Alamat lengkap venue"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all" />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
              {saving
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Save size={13} />}
              {editId ? 'Simpan' : 'Tambah'}
            </button>
            <button onClick={handleReset}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm transition-all">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* List per klaster */}
      <div className="space-y-5">
        {Object.entries(grouped).map(([klaster, items]: any) => (
          <div key={klaster} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-blue-400" />
                <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">
                  {klaster}
                </span>
              </div>
              <span className="text-slate-600 text-xs">{items.length} venue</span>
            </div>
            <div className="divide-y divide-slate-800/50">
              {items.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/20 transition-colors">
                  <div>
                    <div className="text-slate-200 text-sm font-medium">{v.nama}</div>
                    {v.alamat && (
                      <div className="text-slate-500 text-xs mt-0.5">{v.alamat}</div>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleEdit(v)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(v.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}