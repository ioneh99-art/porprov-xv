'use client'

// Tambah Atlet Baru — Light Theme Bekasi
// src/app/konida/atlet/tambah/page.tsx

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, User, Phone, MapPin,
  Calendar, FileText, Shield, AlertCircle,
  CheckCircle, Loader2, ChevronRight,
} from 'lucide-react'

export default function TambahAtletPage() {
  const router = useRouter()
  const [cabors, setCabors] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [me, setMe] = useState<any>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [step, setStep] = useState<1|2>(1)

  const [form, setForm] = useState({
    nama_lengkap: '', no_ktp: '', no_kk: '',
    gender: 'L', tgl_lahir: '', tempat_lahir: '',
    cabor_id: '', telepon: '', email: '',
    alamat: '', kecamatan: '',
  })

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const meData = await res.json()
        setMe(meData)
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data } = await supabase
          .from('cabang_olahraga').select('id,nama')
          .eq('is_active', true).order('nama')
        setCabors(data ?? [])
      } catch (e) {
        console.error(e)
      }
    }
    init()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const step1Valid = form.nama_lengkap && form.no_ktp && form.tgl_lahir && form.cabor_id
  const step2Valid = true // kontak opsional

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
        kontingen_id: me?.kontingen_id,
        status_registrasi: 'Draft',
        status_verifikasi: 'Draft',
      })
      if (err) throw new Error(err.message)
      setSuccess(true)
      setTimeout(() => router.push('/konida/atlet'), 1800)
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  // ─── Field component ─────────────────────────────────────
  const Field = ({ label, name, type='text', placeholder='', required=false, children }: {
    label:string; name:string; type?:string; placeholder?:string; required?:boolean; children?:React.ReactNode
  }) => (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-500 normal-case font-normal">*</span>}
      </label>
      {children ?? (
        <input name={name} value={(form as any)[name]} onChange={handleChange}
          type={type} placeholder={placeholder} required={required}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#3c4858] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E84E0F]/30 focus:border-[#E84E0F] transition-all" />
      )}
    </div>
  )

  // ─── Success state ────────────────────────────────────────
  if (success) return (
    <div className="min-h-screen bg-[#eeeeee] flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center max-w-md w-full">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-[#3c4858] mb-2">Atlet Berhasil Ditambahkan!</h2>
        <p className="text-gray-400 text-sm mb-4">Data <b className="text-[#3c4858]">{form.nama_lengkap}</b> sudah tersimpan sebagai Draft.</p>
        <div className="flex items-center justify-center gap-1.5 text-sm text-gray-400">
          <Loader2 size={14} className="animate-spin" /> Mengalihkan ke halaman atlet...
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#eeeeee] p-8 font-sans">

      {/* ─── Header ─── */}
      <div className="flex items-center gap-4 mb-7">
        <Link href="/konida/atlet"
          className="w-9 h-9 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center shadow-sm transition-colors">
          <ArrowLeft size={16} className="text-gray-500" />
        </Link>
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5">
            <Link href="/konida/atlet" className="hover:text-[#E84E0F] transition-colors">Data Atlet</Link>
            <ChevronRight size={12} />
            <span className="text-[#3c4858]">Tambah Atlet Baru</span>
          </div>
          <h1 className="text-xl font-light text-[#3c4858]">Tambah Atlet Baru</h1>
          <p className="text-xs text-gray-400 mt-0.5">Kontingen Kota Bekasi · PORPROV XV</p>
        </div>
      </div>

      {/* ─── Error Banner ─── */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-red-700">Gagal menyimpan</div>
            <div className="text-xs text-red-500 mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* ─── Step indicator ─── */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { n:1, label:'Data Pribadi' },
          { n:2, label:'Kontak & Alamat' },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <button onClick={() => s.n===2 && step1Valid && setStep(2) || s.n===1 && setStep(1)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                step===s.n
                  ? 'bg-[#E84E0F] text-white shadow-md shadow-[#E84E0F]/30'
                  : step>s.n
                    ? 'bg-green-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-400'
              }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${step===s.n?'bg-white/20':''}`}>
                {step>s.n ? '✓' : s.n}
              </span>
              {s.label}
            </button>
            {i < 1 && <ChevronRight size={14} className="text-gray-300" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* ─── Step 1: Data Pribadi ─── */}
        {step===1 && (
          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                  <User size={16} className="text-[#E84E0F]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#3c4858]">Data Pribadi</div>
                  <div className="text-[10px] text-gray-400">Informasi identitas atlet</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Nama Lengkap" name="nama_lengkap" placeholder="Sesuai KTP" required />
                </div>
                <Field label="No KTP / NIK" name="no_ktp" placeholder="16 digit NIK" required />
                <Field label="No KK" name="no_kk" placeholder="No Kartu Keluarga" />
                <Field label="Tempat Lahir" name="tempat_lahir" placeholder="Kota kelahiran" />
                <Field label="Tanggal Lahir" name="tgl_lahir" type="date" required />
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Gender <span className="text-red-500 normal-case font-normal">*</span>
                  </label>
                  <div className="flex gap-3">
                    {[{val:'L',label:'♂ Putra'},{val:'P',label:'♀ Putri'}].map(g=>(
                      <button key={g.val} type="button"
                        onClick={()=>setForm(f=>({...f,gender:g.val}))}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          form.gender===g.val
                            ? g.val==='L' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-pink-50 border-pink-300 text-pink-700'
                            : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                        }`}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Cabang Olahraga <span className="text-red-500 normal-case font-normal">*</span>
                  </label>
                  <select name="cabor_id" value={form.cabor_id} onChange={handleChange} required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#3c4858] focus:outline-none focus:ring-2 focus:ring-[#E84E0F]/30 focus:border-[#E84E0F] transition-all">
                    <option value="">-- Pilih Cabor --</option>
                    {cabors.map(c=><option key={c.id} value={c.id}>{c.nama}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Side: Info + Preview */}
            <div className="space-y-4">
              {/* Preview card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Preview Data</div>
                <div className={`w-14 h-14 rounded-xl mx-auto flex items-center justify-center text-white font-black text-2xl mb-3 ${form.gender==='L'?'bg-gradient-to-br from-blue-400 to-blue-600':'bg-gradient-to-br from-pink-400 to-pink-600'}`}>
                  {form.nama_lengkap.charAt(0) || '?'}
                </div>
                <div className="text-center">
                  <div className="font-semibold text-[#3c4858] text-sm">{form.nama_lengkap||'Nama Atlet'}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {form.gender==='L'?'Putra':'Putri'} · {cabors.find(c=>String(c.id)===form.cabor_id)?.nama||'Cabor'}
                  </div>
                  {form.tgl_lahir && (
                    <div className="text-[10px] text-gray-400 mt-1">
                      Lahir {new Date(form.tgl_lahir).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full" />
                  <span className="text-[10px] text-gray-400">Status: Draft</span>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <div className="text-xs font-bold text-blue-700 mb-2">💡 Tips Input Data</div>
                <ul className="text-xs text-blue-600 space-y-1.5">
                  <li>• NIK harus 16 digit sesuai KTP</li>
                  <li>• Nama sesuai dokumen resmi</li>
                  <li>• Pilih cabor yang sesuai event PORPROV XV</li>
                  <li>• Data tersimpan sebagai Draft, bisa diedit sebelum Submit</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 2: Kontak & Alamat ─── */}
        {step===2 && (
          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Phone size={16} className="text-blue-500" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#3c4858]">Kontak & Alamat</div>
                  <div className="text-[10px] text-gray-400">Informasi kontak atlet (opsional)</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="No Telepon" name="telepon" placeholder="08xxxxxxxxxx" />
                <Field label="Email" name="email" type="email" placeholder="email@example.com" />
                <Field label="Kecamatan" name="kecamatan" placeholder="Kecamatan domisili" />
                <div />
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Alamat Lengkap</label>
                  <textarea name="alamat" value={form.alamat} onChange={handleChange}
                    placeholder="Jl. nama jalan, RT/RW, Kelurahan..." rows={3}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#3c4858] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E84E0F]/30 focus:border-[#E84E0F] transition-all resize-none" />
                </div>
              </div>
            </div>

            {/* Summary sebelum submit */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Ringkasan Data</div>
              <div className="space-y-3">
                {[
                  {label:'Nama',   value:form.nama_lengkap, icon:User},
                  {label:'NIK',    value:form.no_ktp||'-',  icon:FileText},
                  {label:'Gender', value:form.gender==='L'?'Putra':'Putri', icon:User},
                  {label:'Cabor',  value:cabors.find(c=>String(c.id)===form.cabor_id)?.nama||'-', icon:Shield},
                  {label:'Lahir',  value:form.tgl_lahir ? new Date(form.tgl_lahir).toLocaleDateString('id-ID') : '-', icon:Calendar},
                ].map(s=>(
                  <div key={s.label} className="flex items-center gap-3">
                    <s.icon size={13} className="text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-gray-400">{s.label}</div>
                      <div className="text-xs font-medium text-[#3c4858] truncate">{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                  <AlertCircle size={12} className="flex-shrink-0" />
                  Data akan tersimpan sebagai <b>Draft</b>. Submit ke operator untuk verifikasi.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Action buttons ─── */}
        <div className="flex items-center gap-3 mt-6">
          {step===1 ? (
            <button type="button"
              onClick={()=>{ if(step1Valid) setStep(2) }}
              disabled={!step1Valid}
              className="flex items-center gap-2 bg-[#E84E0F] hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-400 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all shadow-md shadow-[#E84E0F]/20">
              Lanjut ke Kontak & Alamat
              <ChevronRight size={15} />
            </button>
          ) : (
            <>
              <button type="button" onClick={()=>setStep(1)}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium text-sm px-5 py-2.5 rounded-xl transition-all">
                <ArrowLeft size={14} /> Kembali
              </button>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 bg-[#E84E0F] hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-400 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all shadow-md shadow-[#E84E0F]/20">
                {loading ? <><Loader2 size={14} className="animate-spin"/> Menyimpan...</> : <><Save size={14}/> Simpan Atlet</>}
              </button>
            </>
          )}
          <Link href="/konida/atlet"
            className="text-gray-400 hover:text-gray-600 text-sm px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-all">
            Batal
          </Link>
        </div>
      </form>
    </div>
  )
}