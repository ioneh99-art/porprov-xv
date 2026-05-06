'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Send } from 'lucide-react'
import Link from 'next/link'

export default function EditAtletPage() {
  const router = useRouter()
  const { id } = useParams()
  const [cabors, setCabors] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusVerif, setStatusVerif] = useState('')
  const [catatanCabor, setCatatanCabor] = useState('')

  const [form, setForm] = useState({
    nama_lengkap: '', no_ktp: '', no_kk: '',
    gender: 'L', tgl_lahir: '', tempat_lahir: '',
    cabor_id: '', telepon: '', email: '',
    alamat: '', kecamatan: '',
    status_registrasi: 'Draft',
    catatan_verifikasi: '',
  })

  useEffect(() => { init() }, [])

  const init = async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const [{ data: atlet }, { data: caborList }] = await Promise.all([
      supabase.from('atlet').select('*').eq('id', id).single(),
      supabase.from('cabang_olahraga').select('id, nama').eq('is_active', true).order('nama'),
    ])

    if (atlet) {
      setForm({
        nama_lengkap: atlet.nama_lengkap ?? '',
        no_ktp: atlet.no_ktp ?? '',
        no_kk: atlet.no_kk ?? '',
        gender: atlet.gender ?? 'L',
        tgl_lahir: atlet.tgl_lahir ?? '',
        tempat_lahir: atlet.tempat_lahir ?? '',
        cabor_id: atlet.cabor_id?.toString() ?? '',
        telepon: atlet.telepon ?? '',
        email: atlet.email ?? '',
        alamat: atlet.alamat ?? '',
        kecamatan: atlet.kecamatan ?? '',
        status_registrasi: atlet.status_registrasi ?? 'Draft',
        catatan_verifikasi: atlet.catatan_verifikasi ?? '',
      })
      setStatusVerif(atlet.status_verifikasi ?? 'Draft')
      setCatatanCabor(atlet.catatan_cabor ?? '')
    }
    setCabors(caborList ?? [])
    setFetching(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const canEdit = ['Draft', 'Ditolak Cabor', 'Ditolak Admin'].includes(form.status_registrasi)
  const canSubmit = canEdit

  const handleSave = async () => {
    if (!canEdit) return
    setError('')
    setLoading(true)
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { error: err } = await supabase.from('atlet').update({
        ...form,
        cabor_id: parseInt(form.cabor_id),
      }).eq('id', id)
      if (err) throw new Error(err.message)
      setSuccess('Data berhasil disimpan!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitKeCabor = async () => {
    setError('')
    setLoading(true)
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const me = await fetch('/api/auth/me').then(r => r.json())

      // Simpan dulu data terbaru
      await supabase.from('atlet').update({
        ...form,
        cabor_id: parseInt(form.cabor_id),
      }).eq('id', id)

      // Submit ke cabor
      await supabase.rpc('submit_ke_cabor', {
        atlet_id: parseInt(id as string),
        user_id: me.id
      })

      setSuccess('Atlet berhasil disubmit ke Operator Cabor!')
      setForm(prev => ({ ...prev, status_registrasi: 'Menunggu Cabor' }))
      setTimeout(() => router.push('/konida/atlet'), 1500)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      'Draft': 'bg-slate-700/50 text-slate-400 border-slate-700',
      'Menunggu Cabor': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'Menunggu Admin': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'Verified': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'Posted': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'Ditolak Cabor': 'bg-red-500/10 text-red-400 border-red-500/20',
      'Ditolak Admin': 'bg-red-500/10 text-red-400 border-red-500/20',
    }
    return map[status] ?? 'bg-slate-700/50 text-slate-400 border-slate-700'
  }

  if (fetching) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <Link href="/konida/atlet"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-white">Edit Atlet</h1>
          <p className="text-slate-500 text-xs mt-0.5">{form.nama_lengkap}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium ${statusColor(form.status_registrasi)}`}>
            {form.status_registrasi}
          </span>
          <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium ${statusColor(statusVerif)}`}>
            Verif: {statusVerif}
          </span>
        </div>
      </div>

      {/* Alert */}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs">{error}</div>
      )}
      {success && (
        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 text-xs">{success}</div>
      )}

      {/* Catatan penolakan */}
      {(form.status_registrasi === 'Ditolak Cabor' || form.status_registrasi === 'Ditolak Admin') && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <div className="text-red-400 text-xs font-medium mb-1">
            {form.status_registrasi === 'Ditolak Cabor' ? '⚠ Ditolak oleh Operator Cabor:' : '⚠ Ditolak oleh Admin PORPROV:'}
          </div>
          <div className="text-red-300 text-xs">
            {form.status_registrasi === 'Ditolak Cabor' ? catatanCabor : form.catatan_verifikasi}
          </div>
          <div className="text-red-400/60 text-[10px] mt-1">Silakan perbaiki data dan submit ulang.</div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Data Pribadi */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="text-white text-sm font-medium mb-5">Data Pribadi</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                Nama Lengkap <span className="text-red-400">*</span>
              </label>
              <input name="nama_lengkap" value={form.nama_lengkap} onChange={handleChange}
                disabled={!canEdit} required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>

            {[
              { label: 'No KTP / NIK', name: 'no_ktp', required: true },
              { label: 'No KK', name: 'no_kk' },
              { label: 'Tempat Lahir', name: 'tempat_lahir' },
              { label: 'Tanggal Lahir', name: 'tgl_lahir', type: 'date', required: true },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                  {f.label} {f.required && <span className="text-red-400">*</span>}
                </label>
                <input name={f.name} value={(form as any)[f.name]} onChange={handleChange}
                  type={f.type ?? 'text'} required={f.required} disabled={!canEdit}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
              </div>
            ))}

            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">Gender</label>
              <select name="gender" value={form.gender} onChange={handleChange} disabled={!canEdit}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="L">Laki-laki (Putra)</option>
                <option value="P">Perempuan (Putri)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                Cabang Olahraga <span className="text-red-400">*</span>
              </label>
              <select name="cabor_id" value={form.cabor_id} onChange={handleChange} disabled={!canEdit}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">-- Pilih Cabor --</option>
                {cabors.map(c => (
                  <option key={c.id} value={c.id}>{c.nama}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Kontak & Alamat */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="text-white text-sm font-medium mb-5">Kontak & Alamat</div>
          <div className="flex flex-col gap-4">
            {[
              { label: 'No Telepon', name: 'telepon', placeholder: '08xxxxxxxxxx' },
              { label: 'Email', name: 'email', type: 'email' },
              { label: 'Kecamatan', name: 'kecamatan' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">{f.label}</label>
                <input name={f.name} value={(form as any)[f.name]} onChange={handleChange}
                  type={f.type ?? 'text'} placeholder={(f as any).placeholder ?? ''}
                  disabled={!canEdit}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
              </div>
            ))}
            <div>
              <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">Alamat</label>
              <textarea name="alamat" value={form.alamat} onChange={handleChange}
                rows={4} disabled={!canEdit}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mt-5 flex-wrap">
        {canEdit && (
          <button onClick={handleSave} disabled={loading}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all">
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save size={14} />}
            Simpan Draft
          </button>
        )}

        {canSubmit && (
          <button onClick={handleSubmitKeCabor} disabled={loading}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-xl transition-all">
            <Send size={14} />
            Submit ke Cabor
          </button>
        )}

        {/* Status info messages */}
        {form.status_registrasi === 'Menunggu Cabor' && (
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-blue-400 text-xs">Menunggu review Operator Cabor</span>
          </div>
        )}
        {form.status_registrasi === 'Menunggu Admin' && (
          <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2.5">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-purple-400 text-xs">Menunggu verifikasi Admin PORPROV</span>
          </div>
        )}
        {form.status_registrasi === 'Verified' && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
            <span className="text-emerald-400 text-xs">✅ Verified — menunggu posting Admin</span>
          </div>
        )}
        {form.status_registrasi === 'Posted' && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
            <span className="text-emerald-400 text-xs">✅ Posted — data final tidak dapat diubah</span>
          </div>
        )}

        <Link href="/konida/atlet"
          className="text-slate-400 hover:text-white text-sm px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all">
          Kembali
        </Link>
      </div>
    </div>
  )
}