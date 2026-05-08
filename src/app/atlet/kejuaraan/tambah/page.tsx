'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Upload } from 'lucide-react'
import Link from 'next/link'

export default function TambahKejuaraanPage() {
  const router = useRouter()
  const [me, setMe] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nama_kejuaraan: '',
    penyelenggara: '',
    tingkat: 'provinsi',
    tahun: new Date().getFullYear().toString(),
    tanggal: '',
    lokasi: '',
    cabor: '',
    nomor_lomba: '',
    hasil: '',
    deskripsi: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetch('/api/atlet/me').then(r => r.json()).then(data => {
      setMe(data)
      setForm(prev => ({ ...prev, cabor: data.cabor_nama ?? '' }))
    })
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

      let dokumen_url = null
      let dokumen_name = null

      // Upload dokumen kalau ada
      if (file) {
        setUploading(true)
        const ext = file.name.split('.').pop()
        const path = `kejuaraan/${me.atlet_id}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('dokumen-atlet')
          .upload(path, file, { upsert: true })
        if (uploadErr) throw new Error(uploadErr.message)
        const { data: urlData } = supabase.storage
          .from('dokumen-atlet')
          .getPublicUrl(path)
        dokumen_url = urlData.publicUrl
        dokumen_name = file.name
        setUploading(false)
      }

      const { error: err } = await supabase.from('riwayat_kejuaraan').insert({
        atlet_id: me.atlet_id,
        ...form,
        tahun: parseInt(form.tahun),
        tanggal: form.tanggal || null,
        dokumen_url,
        dokumen_name,
        status: 'Menunggu KONIDA',
      })

      if (err) throw new Error(err.message)
      router.push('/atlet/dashboard')
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/atlet/dashboard"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="text-white text-sm font-semibold">Tambah Riwayat Kejuaraan</div>
            <div className="text-slate-500 text-[10px]">Isi data kejuaraan yang pernah kamu ikuti</div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">

            {/* Informasi Kejuaraan */}
            <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="text-white text-sm font-medium mb-5">Informasi Kejuaraan</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                    Nama Kejuaraan <span className="text-red-400">*</span>
                  </label>
                  <input name="nama_kejuaraan" value={form.nama_kejuaraan} onChange={handleChange}
                    placeholder="contoh: PORPROV XIV Jawa Barat 2024" required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all" />
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">Penyelenggara</label>
                  <input name="penyelenggara" value={form.penyelenggara} onChange={handleChange}
                    placeholder="contoh: KONI Jawa Barat"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all" />
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                    Tingkat <span className="text-red-400">*</span>
                  </label>
                  <select name="tingkat" value={form.tingkat} onChange={handleChange} required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all">
                    <option value="kab_kota">Kabupaten / Kota</option>
                    <option value="provinsi">Provinsi</option>
                    <option value="nasional">Nasional</option>
                    <option value="internasional">Internasional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                    Tahun <span className="text-red-400">*</span>
                  </label>
                  <input name="tahun" type="number" value={form.tahun} onChange={handleChange}
                    min="2000" max="2030" required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all" />
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">Tanggal</label>
                  <input name="tanggal" type="date" value={form.tanggal} onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all" />
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">Lokasi</label>
                  <input name="lokasi" value={form.lokasi} onChange={handleChange}
                    placeholder="Kota/Venue pertandingan"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all" />
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                    Cabang Olahraga <span className="text-red-400">*</span>
                  </label>
                  <input name="cabor" value={form.cabor} onChange={handleChange}
                    placeholder="contoh: Atletik" required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all" />
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                    Nomor Lomba <span className="text-red-400">*</span>
                  </label>
                  <input name="nomor_lomba" value={form.nomor_lomba} onChange={handleChange}
                    placeholder="contoh: Lari 100m Putra" required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all" />
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
                    Hasil / Prestasi <span className="text-red-400">*</span>
                  </label>
                  <input name="hasil" value={form.hasil} onChange={handleChange}
                    placeholder="contoh: Juara 1 / Medali Emas / Peringkat 3" required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all" />
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">Deskripsi Tambahan</label>
                  <textarea name="deskripsi" value={form.deskripsi} onChange={handleChange}
                    placeholder="Catatan tambahan, catatan waktu/jarak, kondisi pertandingan, dll..."
                    rows={3}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all resize-none" />
                </div>
              </div>
            </div>

            {/* Upload Bukti */}
            <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="text-white text-sm font-medium mb-2">Upload Bukti Prestasi</div>
              <div className="text-slate-500 text-xs mb-4">Sertifikat, piagam, atau foto penghargaan (PDF/JPG/PNG)</div>

              <div
                onClick={() => document.getElementById('file-input')?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                  ${file ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700 hover:border-emerald-500/40 hover:bg-emerald-500/5'}`}>
                <Upload size={20} className={`mx-auto mb-2 ${file ? 'text-emerald-400' : 'text-slate-600'}`} />
                {file ? (
                  <div>
                    <div className="text-emerald-400 text-sm font-medium">{file.name}</div>
                    <div className="text-slate-500 text-xs mt-1">
                      {(file.size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-slate-400 text-sm">Klik untuk upload bukti</div>
                    <div className="text-slate-600 text-xs mt-1">PDF, JPG, PNG — max 5MB</div>
                  </div>
                )}
              </div>
              <input id="file-input" type="file" accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          {/* Info */}
          <div className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
            <div className="text-amber-400 text-xs font-medium mb-1">ℹ️ Proses Verifikasi</div>
            <div className="text-slate-500 text-xs leading-relaxed">
              Setelah submit, kejuaraan ini akan diverifikasi oleh KONIDA → Operator Cabor → Admin KONI.
              Proses verifikasi memastikan data yang masuk ke profil resmimu adalah prestasi yang valid.
            </div>
          </div>

          <div className="flex items-center gap-3 mt-5">
            <button type="submit" disabled={loading || uploading}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all">
              {loading || uploading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Save size={14} />}
              {uploading ? 'Mengupload...' : loading ? 'Menyimpan...' : 'Submit Kejuaraan'}
            </button>
            <Link href="/atlet/dashboard"
              className="text-slate-400 hover:text-white text-sm px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all">
              Batal
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}