'use client'

// P1f — Admin Fase Kompetisi (kunci waktu per tahap). Superadmin only.
import { useEffect, useState } from 'react'
import { Calendar, Plus, Trash2, Save, X } from 'lucide-react'

const TIPE = ['pendaftaran', 'verifikasi', 'kualifikasi', 'kompetisi'] as const
const EMPTY = { id: null as number | null, tipe: 'pendaftaran', nama: '', tanggal_buka: '', tanggal_tutup: '', is_active: true }

export default function FasePage() {
  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState<any>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = async () => {
    setLoading(true)
    const r = await fetch('/api/superadmin/fase')
    setList(r.ok ? await r.json() : [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const toLocal = (v: string) => v ? v.slice(0, 16) : ''
  const save = async () => {
    setErr('')
    const r = await fetch('/api/superadmin/fase', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        tanggal_buka: form.tanggal_buka ? new Date(form.tanggal_buka).toISOString() : null,
        tanggal_tutup: form.tanggal_tutup ? new Date(form.tanggal_tutup).toISOString() : null,
      }),
    })
    if (!r.ok) { setErr((await r.json().catch(() => ({})))?.error || 'Gagal simpan'); return }
    setForm(EMPTY); await load()
  }
  const del = async (id: number) => {
    if (!confirm('Hapus fase ini?')) return
    await fetch('/api/superadmin/fase', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await load()
  }
  const edit = (f: any) => setForm({ id: f.id, tipe: f.tipe, nama: f.nama ?? '', tanggal_buka: toLocal(f.tanggal_buka), tanggal_tutup: toLocal(f.tanggal_tutup), is_active: f.is_active })

  const now = Date.now()
  const status = (f: any) => {
    if (!f.is_active) return { t: 'Nonaktif', c: 'text-slate-500 bg-slate-500/10' }
    const b = f.tanggal_buka ? Date.parse(f.tanggal_buka) : -Infinity
    const t = f.tanggal_tutup ? Date.parse(f.tanggal_tutup) : Infinity
    if (now < b) return { t: 'Belum buka', c: 'text-amber-400 bg-amber-500/10' }
    if (now > t) return { t: 'Tutup', c: 'text-red-400 bg-red-500/10' }
    return { t: 'Terbuka', c: 'text-emerald-400 bg-emerald-500/10' }
  }
  const fmt = (d: string) => d ? new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="text-emerald-400" size={22} />
          <div>
            <h1 className="text-xl font-light">Fase Kompetisi</h1>
            <p className="text-xs text-slate-500">Kunci waktu per tahap. Tanpa fase = tidak dikunci. Di luar jendela = aksi ditolak server.</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
          <div className="grid grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Tahap</label>
              <select value={form.tipe} onChange={e => setForm({ ...form, tipe: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                {TIPE.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Nama (opsional)</label>
              <input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Buka</label>
              <input type="datetime-local" value={form.tanggal_buka} onChange={e => setForm({ ...form, tanggal_buka: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Tutup</label>
              <input type="datetime-local" value={form.tanggal_tutup} onChange={e => setForm({ ...form, tanggal_tutup: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={save} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold text-sm px-4 py-2 rounded-lg">
                {form.id ? <><Save size={14} /> Update</> : <><Plus size={14} /> Tambah</>}
              </button>
              {form.id && <button onClick={() => setForm(EMPTY)} className="p-2 text-slate-500 hover:text-slate-300"><X size={16} /></button>}
            </div>
          </div>
          <label className="flex items-center gap-2 mt-3 text-xs text-slate-400">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Aktif (dipakai untuk penguncian)
          </label>
          {err && <div className="mt-2 text-xs text-red-400">{err}</div>}
        </div>

        {/* List */}
        {loading ? <div className="text-slate-500 text-sm">Memuat…</div> : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <tr><th className="text-left px-4 py-3">Tahap</th><th className="text-left px-4 py-3">Nama</th><th className="text-left px-4 py-3">Buka</th><th className="text-left px-4 py-3">Tutup</th><th className="text-left px-4 py-3">Status</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody>
                {list.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-600">Belum ada fase. Tambah di atas untuk mulai mengunci waktu.</td></tr>}
                {list.map(f => { const st = status(f); return (
                  <tr key={f.id} className="border-b border-slate-800/50">
                    <td className="px-4 py-3 font-medium capitalize">{f.tipe}</td>
                    <td className="px-4 py-3 text-slate-400">{f.nama || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{fmt(f.tanggal_buka)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{fmt(f.tanggal_tutup)}</td>
                    <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded-full ${st.c}`}>{st.t}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => edit(f)} className="text-xs px-2 py-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10">Edit</button>
                        <button onClick={() => del(f.id)} className="p-1.5 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
