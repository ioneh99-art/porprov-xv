'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

export default function TambahAtletPage() {
  const router = useRouter()
  const [cabors, setCabors] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [me, setMe] = useState<any>(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nama_lengkap: '', no_ktp: '', no_kk: '',
    gender: 'L', tgl_lahir: '', tempat_lahir: '',
    cabor_id: '', telepon: '', email: '',
    alamat: '', kecamatan: '',
  })

  useEffect(() => {
    const init = async () => {
      const res = await fetch('/api/auth/me')
      const meData = await res.json()
      setMe(meData)

      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data } = await supabase
        .from('cabang_olahraga')
        .select('id, nama')
        .eq('is_active', true)
        .order('nama')
      setCabors(data ?? [])
    }
    init()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { error: err } = await supabase.from('atlet').insert({
        ...form,
        cabor_id: parseInt(form.cabor_id),
        kontingen_id: me.kontingen_id,
        status_registrasi: 'Draft',
        status_verifikasi: 'Draft',
      })
      if (err) throw new Error(err.message)
      router.push('/konida/atlet')
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-7">
        <Link href="/konida/atlet"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-white">Tambah Atlet Baru</h1>
          <p className="text-slate-500 text-xs mt-0.5">Isi data lengkap atlet</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
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
                  placeholder="Sesuai KTP" required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all" />
              </div>

              {[
                { label: 'No KTP / NIK', name: 'no_ktp', placeholder: '16 digit NIK', required: true },
                { label: 'No KK', name: 'no_kk', placeholder: 'No Kartu Keluarga' },
                { label: 'Tempat Lahir', name: 'tempat_lahir', placeholder: 'Kota kelahiran' },
                { label: 'Tanggal Lahir', name: 'tgl_lahir', placeholder: '', required: true, type: 'date' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                    {f.label} {f.required && <span className="text-red-400">*</span>}
                  </label>
                  <input name={f.name} value={(form as any)[f.name]} onChange={handleChange}
                    placeholder={f.placeholder} required={f.required} type={f.type ?? 'text'}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all" />
                </div>
              ))}

              <div>
                <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                  Gender <span className="text-red-400">*</span>
                </label>
                <select name="gender" value={form.gender} onChange={handleChange} required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition-all">
                  <option value="L">Laki-laki (Putra)</option>
                  <option value="P">Perempuan (Putri)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                  Cabang Olahraga <span className="text-red-400">*</span>
                </label>
                <select name="cabor_id" value={form.cabor_id} onChange={handleChange} required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition-all">
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
                { label: 'Email', name: 'email', placeholder: 'email@example.com', type: 'email' },
                { label: 'Kecamatan', name: 'kecamatan', placeholder: 'Kecamatan domisili' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                    {f.label}
                  </label>
                  <input name={f.name} value={(form as any)[f.name]} onChange={handleChange}
                    placeholder={f.placeholder} type={f.type ?? 'text'}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all" />
                </div>
              ))}
              <div>
                <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                  Alamat Lengkap
                </label>
                <textarea name="alamat" value={form.alamat} onChange={handleChange}
                  placeholder="Jl. ..." rows={4}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all resize-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-semibold text-sm px-6 py-2.5 rounded-xl transition-all">
            {loading
              ? <div className="w-4 h-4 border-2 border-slate-500 border-t-slate-300 rounded-full animate-spin" />
              : <Save size={14} />}
            {loading ? 'Menyimpan...' : 'Simpan Atlet'}
          </button>
          <Link href="/konida/atlet"
            className="text-slate-400 hover:text-white text-sm px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all">
            Batal
          </Link>
        </div>
      </form>
    </div>
  )
}