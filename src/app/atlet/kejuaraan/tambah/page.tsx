'use client'
// src/app/atlet/kejuaraan/tambah/page.tsx — FIXED
// Perubahan:
// - Upload dokumen via API route (bukan direct supabase client)
// - Styling konsisten dark green
// - Fix: me.cabor_nama → cabor_nama_raw
// - POST ke /api/atlet/kejuaraan bukan direct supabase insert

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Upload, CheckCircle, Info } from 'lucide-react'

const C = { dark:'#020D06', accent:'#00B48A', green:'#065F46' }

const TINGKAT_OPTIONS = [
  { val:'kab_kota',      label:'Kabupaten / Kota' },
  { val:'provinsi',      label:'Provinsi' },
  { val:'nasional',      label:'Nasional' },
  { val:'internasional', label:'Internasional' },
]

export default function TambahKejuaraan() {
  const router = useRouter()
  const [cabor,    setCabor]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [uploading,setUploading]= useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [file,     setFile]     = useState<File | null>(null)
  const [form,     setForm]     = useState({
    nama_kejuaraan:'', penyelenggara:'', tingkat:'provinsi',
    tahun: String(new Date().getFullYear()),
    tanggal:'', lokasi:'', nomor_lomba:'', hasil:'', deskripsi:'',
  })

  useEffect(() => {
    // Ambil info atlet dari /api/atlet/me untuk pre-fill cabor
    fetch('/api/atlet/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setCabor(data.cabor_nama_raw || '')
        else router.push('/atlet/login')
      })
  }, [])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let dokumen_url  = null
      let dokumen_name = null

      // 1. Upload dokumen dulu jika ada — via API route (bukan direct supabase)
      if (file) {
        setUploading(true)
        const fd = new FormData()
        fd.append('file', file)
        const upRes = await fetch('/api/atlet/upload-dokumen', { method:'POST', body:fd })
        if (!upRes.ok) {
          const e = await upRes.json()
          throw new Error(e.error || 'Upload gagal')
        }
        const upData  = await upRes.json()
        dokumen_url   = upData.url
        dokumen_name  = file.name
        setUploading(false)
      }

      // 2. POST data kejuaraan ke API route
      const res = await fetch('/api/atlet/kejuaraan', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          ...form,
          cabor,
          dokumen_url,
          dokumen_name,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan')

      setSuccess(true)
      setTimeout(() => router.push('/atlet/dashboard'), 1800)

    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
      setUploading(false)
    } finally {
      setLoading(false)
    }
  }

  // Input style helper
  const inp = "w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all placeholder:text-zinc-600"
  const inpStyle = { background:'rgba(0,0,0,0.3)', border:'1px solid rgba(0,180,138,0.15)' }

  if (success) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:C.dark }}>
      <div className="text-center">
        <CheckCircle size={48} style={{ color:C.accent }} className="mx-auto mb-4"/>
        <div className="text-white text-lg font-bold mb-2">Kejuaraan berhasil disubmit!</div>
        <div className="text-zinc-500 text-sm">Menunggu verifikasi KONIDA...</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen pb-10" style={{
      background: C.dark,
      backgroundImage:'linear-gradient(rgba(0,180,138,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,138,0.025) 1px,transparent 1px)',
      backgroundSize:'32px 32px',
    }}>

      {/* Top bar */}
      <div className="sticky top-0 z-10 backdrop-blur-md"
        style={{ background:'rgba(2,13,6,0.92)', borderBottom:'1px solid rgba(0,180,138,0.1)' }}>
        <div className="max-w-2xl mx-auto px-5 py-3.5 flex items-center gap-3">
          <Link href="/atlet/dashboard"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
            <ArrowLeft size={16}/>
          </Link>
          <div>
            <div className="text-white text-sm font-bold">Tambah Riwayat Kejuaraan</div>
            <div className="text-zinc-600 text-[10px]">Input prestasi untuk diverifikasi KONIDA</div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6">

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
            <span className="text-red-400 text-xs">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Card: Info Kejuaraan ── */}
          <div className="rounded-2xl p-5"
            style={{ background:'rgba(5,20,10,0.9)', border:'1px solid rgba(0,180,138,0.15)' }}>
            <div className="text-white text-sm font-bold mb-4">Informasi Kejuaraan</div>
            <div className="space-y-3">

              <div>
                <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block mb-1.5">
                  Nama Kejuaraan *
                </label>
                <input value={form.nama_kejuaraan} onChange={set('nama_kejuaraan')} required
                  placeholder="contoh: PORPROV XIV Jawa Barat 2024"
                  className={inp} style={inpStyle}/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block mb-1.5">
                    Tingkat *
                  </label>
                  <select value={form.tingkat} onChange={set('tingkat')} required
                    className={inp} style={inpStyle}>
                    {TINGKAT_OPTIONS.map(o => (
                      <option key={o.val} value={o.val}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block mb-1.5">
                    Tahun *
                  </label>
                  <input type="number" value={form.tahun} onChange={set('tahun')}
                    min="2000" max="2030" required className={inp} style={inpStyle}/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block mb-1.5">
                    Penyelenggara
                  </label>
                  <input value={form.penyelenggara} onChange={set('penyelenggara')}
                    placeholder="contoh: KONI Jawa Barat"
                    className={inp} style={inpStyle}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block mb-1.5">
                    Tanggal
                  </label>
                  <input type="date" value={form.tanggal} onChange={set('tanggal')}
                    className={inp} style={inpStyle}/>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block mb-1.5">
                  Lokasi
                </label>
                <input value={form.lokasi} onChange={set('lokasi')}
                  placeholder="Kota / Venue pertandingan"
                  className={inp} style={inpStyle}/>
              </div>
            </div>
          </div>

          {/* ── Card: Prestasi ── */}
          <div className="rounded-2xl p-5"
            style={{ background:'rgba(5,20,10,0.9)', border:'1px solid rgba(0,180,138,0.15)' }}>
            <div className="text-white text-sm font-bold mb-4">Detail Prestasi</div>
            <div className="space-y-3">

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block mb-1.5">
                    Cabang Olahraga *
                  </label>
                  <input value={cabor} onChange={e => setCabor(e.target.value)} required
                    placeholder="Atletik, Hockey, dll"
                    className={inp} style={inpStyle}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block mb-1.5">
                    Nomor Lomba *
                  </label>
                  <input value={form.nomor_lomba} onChange={set('nomor_lomba')} required
                    placeholder="Lari 100m Putra"
                    className={inp} style={inpStyle}/>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block mb-1.5">
                  Hasil / Prestasi *
                </label>
                <input value={form.hasil} onChange={set('hasil')} required
                  placeholder="Juara 1 / Medali Emas / Peringkat 3"
                  className={inp} style={inpStyle}/>
              </div>

              <div>
                <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block mb-1.5">
                  Deskripsi Tambahan
                </label>
                <textarea value={form.deskripsi} onChange={set('deskripsi')} rows={3}
                  placeholder="Catatan waktu, jarak, skor, kondisi pertandingan, dll..."
                  className={inp + ' resize-none'} style={inpStyle}/>
              </div>
            </div>
          </div>

          {/* ── Card: Upload Bukti ── */}
          <div className="rounded-2xl p-5"
            style={{ background:'rgba(5,20,10,0.9)', border:'1px solid rgba(0,180,138,0.15)' }}>
            <div className="text-white text-sm font-bold mb-1">Upload Bukti Prestasi</div>
            <div className="text-zinc-500 text-xs mb-4">Sertifikat, piagam, atau foto (PDF/JPG/PNG, max 5MB)</div>

            <div
              onClick={() => document.getElementById('file-input')?.click()}
              className="rounded-xl p-5 text-center cursor-pointer transition-all border-2 border-dashed"
              style={{
                borderColor: file ? 'rgba(0,180,138,0.5)' : 'rgba(0,180,138,0.15)',
                background:  file ? 'rgba(0,180,138,0.05)' : 'rgba(0,0,0,0.2)',
              }}>
              <Upload size={22} className="mx-auto mb-2"
                style={{ color: file ? C.accent : '#52525B' }}/>
              {file ? (
                <>
                  <div className="text-sm font-bold" style={{ color:C.accent }}>{file.name}</div>
                  <div className="text-zinc-600 text-xs mt-1">{(file.size/1024).toFixed(0)} KB</div>
                </>
              ) : (
                <>
                  <div className="text-zinc-400 text-sm">Klik untuk pilih file</div>
                  <div className="text-zinc-600 text-xs mt-1">atau drag & drop</div>
                </>
              )}
            </div>
            <input id="file-input" type="file" accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}/>
          </div>

          {/* ── Info verifikasi ── */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{ background:'rgba(251,191,36,0.05)', border:'1px solid rgba(251,191,36,0.15)' }}>
            <Info size={14} className="text-amber-400 flex-shrink-0 mt-0.5"/>
            <div className="text-xs text-zinc-400 leading-relaxed">
              Setelah submit, kejuaraan akan diverifikasi:{' '}
              <span className="text-amber-400 font-semibold">KONIDA → Operator Cabor → Admin KONI</span>.
              Proses memastikan data prestasi yang masuk ke profil resmimu adalah valid.
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading || uploading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
              style={{ background:C.accent, color:C.dark }}>
              {(loading || uploading)
                ? <div className="w-4 h-4 border-2 border-[#020D06]/30 border-t-[#020D06] rounded-full animate-spin"/>
                : <Save size={15}/>
              }
              {uploading ? 'Mengupload...' : loading ? 'Menyimpan...' : 'Submit Kejuaraan'}
            </button>
            <Link href="/atlet/dashboard"
              className="px-5 py-3 rounded-xl text-sm text-zinc-400 hover:text-white transition-all"
              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
              Batal
            </Link>
          </div>

        </form>
      </div>
    </div>
  )
}