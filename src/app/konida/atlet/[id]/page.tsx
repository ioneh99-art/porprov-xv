'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Upload, FileText, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'

const JENIS_DOKUMEN = [
  { key: 'ktp', label: 'KTP / NIK' },
  { key: 'kk', label: 'Kartu Keluarga' },
  { key: 'akta', label: 'Akta Kelahiran' },
  { key: 'ijazah', label: 'Ijazah' },
  { key: 'foto', label: 'Foto Atlet' },
  { key: 'npwp', label: 'NPWP' },
  { key: 'bpjs', label: 'BPJS' },
  { key: 'sertifikat', label: 'Sertifikat' },
  { key: 'lisensi', label: 'Lisensi' },
  { key: 'mutasi', label: 'Surat Mutasi' },
]

export default function DetailAtletPage() {
  const { id } = useParams()
  const [atlet, setAtlet] = useState<any>(null)
  const [dokumen, setDokumen] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const [{ data: atletData }, { data: dokumenData }] = await Promise.all([
      supabase.from('atlet').select('*, cabang_olahraga(nama), kontingen(nama)').eq('id', id).single(),
      supabase.from('dokumen_atlet').select('*').eq('atlet_id', id),
    ])

    setAtlet(atletData)
    setDokumen(dokumenData ?? [])
    setLoading(false)
  }

  const handleUpload = async (jenis: string, file: File) => {
    setUploading(jenis)
    setError('')
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const ext = file.name.split('.').pop()
      const path = `atlet-${id}/${jenis}-${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('dokumen-atlet')
        .upload(path, file, { upsert: true })

      if (uploadErr) throw new Error(uploadErr.message)

      const { data: urlData } = supabase.storage
        .from('dokumen-atlet')
        .getPublicUrl(path)

      // Hapus dokumen lama jenis yang sama
      await supabase.from('dokumen_atlet')
        .delete().eq('atlet_id', id).eq('jenis', jenis)

      await supabase.from('dokumen_atlet').insert({
        atlet_id: parseInt(id as string),
        jenis,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
      })

      await loadData()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(null)
    }
  }

  const handleDelete = async (dokId: number, path: string) => {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.from('dokumen_atlet').delete().eq('id', dokId)
    await loadData()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
    </div>
  )

  const getDok = (jenis: string) => dokumen.find(d => d.jenis === jenis)

  return (
    <div>
      <div className="flex items-center gap-3 mb-7">
        <Link href="/konida/atlet"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-white">{atlet?.nama_lengkap}</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            {atlet?.cabang_olahraga?.nama} · {atlet?.kontingen?.nama}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          {[
            { label: atlet?.status_registrasi, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
            { label: atlet?.status_verifikasi, color: atlet?.status_verifikasi === 'Verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : atlet?.status_verifikasi === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-700/50 text-slate-400 border-slate-700' },
          ].map((s, i) => (
            <span key={i} className={`text-[10px] px-2.5 py-1 rounded-full border font-medium ${s.color}`}>
              {s.label}
            </span>
          ))}
          <Link href={`/konida/atlet/${id}/edit`}
            className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-3 py-1.5 rounded-lg transition-all">
            Edit Data
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs">{error}</div>
      )}

      {/* Info Atlet */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4">
        <div className="text-white text-sm font-medium mb-4">Data Pribadi</div>
        <div className="grid grid-cols-3 gap-4 text-xs">
          {[
            { label: 'No KTP', value: atlet?.no_ktp },
            { label: 'No KK', value: atlet?.no_kk },
            { label: 'Gender', value: atlet?.gender === 'L' ? 'Laki-laki' : 'Perempuan' },
            { label: 'Tempat Lahir', value: atlet?.tempat_lahir },
            { label: 'Tanggal Lahir', value: atlet?.tgl_lahir },
            { label: 'Telepon', value: atlet?.telepon },
            { label: 'Email', value: atlet?.email },
            { label: 'Kecamatan', value: atlet?.kecamatan },
            { label: 'Alamat', value: atlet?.alamat },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">{label}</div>
              <div className="text-slate-200">{value || '-'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dokumen */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-white text-sm font-medium">Dokumen Atlet</div>
          <div className="text-slate-500 text-xs">
            {dokumen.length}/{JENIS_DOKUMEN.length} dokumen terupload
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 p-6">
          {JENIS_DOKUMEN.map(({ key, label }) => {
            const dok = getDok(key)
            const isUploading = uploading === key

            return (
              <div key={key} className={`border rounded-xl p-4 transition-all
                ${dok ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-700 bg-slate-800/30'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {dok
                      ? <CheckCircle size={14} className="text-emerald-400" />
                      : <Clock size={14} className="text-slate-600" />}
                    <span className="text-slate-300 text-xs font-medium">{label}</span>
                  </div>
                  {dok && (
                    <button onClick={() => handleDelete(dok.id, dok.file_url)}
                      className="p-1 text-slate-600 hover:text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                {dok ? (
                  <div className="flex items-center gap-2">
                    <FileText size={12} className="text-emerald-400" />
                    <a href={dok.file_url} target="_blank" rel="noreferrer"
                      className="text-emerald-400 text-[10px] hover:underline truncate flex-1">
                      {dok.file_name}
                    </a>
                  </div>
                ) : (
                  <div
                    onClick={() => fileRefs.current[key]?.click()}
                    className="border border-dashed border-slate-600 rounded-lg p-3 text-center cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5 transition-all">
                    {isUploading ? (
                      <div className="flex items-center justify-center gap-2 text-amber-400 text-xs">
                        <div className="w-3 h-3 border border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                        Mengupload...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs">
                        <Upload size={12} />
                        Klik untuk upload
                      </div>
                    )}
                  </div>
                )}

                <input
                  type="file"
                  ref={el => { fileRefs.current[key] = el }}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleUpload(key, file)
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}