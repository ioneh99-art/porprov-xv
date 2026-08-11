'use client'
// src/app/atlet/profil/page.tsx — Profil Saya (data diri + apparel + rekening)

import { useEffect, useState } from 'react'
import { User, Save, CheckCircle, Shirt, CreditCard, Eye, EyeOff } from 'lucide-react'
import { C, useMe, Loading, PageHeader, Card } from '@/components/atlet/portal-ui'

const maskKtp = (v?:string) => v ? v.slice(0,4)+' •••• •••• '+v.slice(-2) : '—'

export default function ProfilPage() {
  const { me, loading } = useMe()
  const [form, setForm] = useState({ ukuran_kemeja:'', ukuran_sepatu:'', nama_bank:'', no_rekening:'', is_public:false })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (me) setForm({
      ukuran_kemeja: me.ukuran_kemeja || '', ukuran_sepatu: me.ukuran_sepatu || '',
      nama_bank: me.nama_bank || '', no_rekening: me.no_rekening || '',
      is_public: !!me.is_public,
    })
  }, [me])

  if (loading || !me) return <Loading/>

  const save = async () => {
    setSaving(true); setErr(''); setSaved(false)
    try {
      const r = await fetch('/api/atlet/update', {
        method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form),
      })
      if (!r.ok) throw new Error((await r.json().catch(()=>({}))).error || 'Gagal menyimpan')
      setSaved(true); setTimeout(()=>setSaved(false), 2500)
    } catch (e:any) { setErr(e.message) } finally { setSaving(false) }
  }

  const Field = ({ label, value }:{ label:string; value:any }) => (
    <div>
      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color:C.muted }}>{label}</div>
      <div className="text-sm font-medium" style={{ color:C.text }}>{value || '—'}</div>
    </div>
  )
  const Input = ({ k, label, placeholder }:{ k:keyof typeof form; label:string; placeholder?:string }) => (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color:C.muted }}>{label}</span>
      <input value={form[k] as string} placeholder={placeholder}
        onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
        className="w-full px-3 py-2 rounded-xl text-sm outline-none border focus:border-emerald-500/60"
        style={{ background:C.dark, borderColor:C.border, color:C.text }}/>
    </label>
  )

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto">
      <PageHeader icon={User} title="Profil Saya" subtitle="Data diri, apparel & rekening bonus"/>

      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-4" style={{ color:C.accent }}>
          <User size={16}/><span className="text-sm font-semibold">Identitas</span>
          <span className="text-[10px] ml-auto px-2 py-0.5 rounded-full" style={{ background:`${C.muted}18`, color:C.muted }}>Hanya bisa diubah admin</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Nama Lengkap" value={me.nama_lengkap}/>
          <Field label="NIK / KTP" value={maskKtp(me.no_ktp)}/>
          <Field label="Cabor" value={me.cabor_nama_raw}/>
          <Field label="Jenis Kelamin" value={me.gender==='L'?'Laki-laki':me.gender==='P'?'Perempuan':me.gender}/>
          <Field label="Asal Daerah" value={me.nama_asal_daerah}/>
          <Field label="Status" value={me.status_registrasi}/>
          <Field label="No. Reg KONI" value={me.no_registrasi_koni}/>
          <Field label="No. HP" value={me.no_hp}/>
          <Field label="Email" value={me.email}/>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-4" style={{ color:C.accent }}>
            <Shirt size={16}/><span className="text-sm font-semibold">Ukuran Apparel</span>
          </div>
          <div className="space-y-3">
            <Input k="ukuran_kemeja" label="Ukuran Kemeja" placeholder="mis. L / XL"/>
            <Input k="ukuran_sepatu" label="Ukuran Sepatu" placeholder="mis. 42"/>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-4" style={{ color:C.accent }}>
            <CreditCard size={16}/><span className="text-sm font-semibold">Rekening Bonus</span>
          </div>
          <div className="space-y-3">
            <Input k="nama_bank" label="Nama Bank" placeholder="mis. BJB / BRI"/>
            <Input k="no_rekening" label="No. Rekening" placeholder="nomor rekening"/>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <button onClick={()=>setForm(p=>({...p,is_public:!p.is_public}))}
          className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {form.is_public ? <Eye size={16} style={{color:C.emerald}}/> : <EyeOff size={16} style={{color:C.muted}}/>}
            <div className="text-left">
              <div className="text-sm font-medium" style={{ color:C.text }}>Profil Publik</div>
              <div className="text-[11px]" style={{ color:C.muted }}>Tampilkan profil di halaman publik atlet</div>
            </div>
          </div>
          <div className="w-10 h-6 rounded-full p-0.5 transition-colors"
            style={{ background: form.is_public ? C.emerald : C.border }}>
            <div className="w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: form.is_public ? 'translateX(16px)' : 'none' }}/>
          </div>
        </button>
      </Card>

      {err && <div className="mt-4 text-sm px-4 py-3 rounded-xl" style={{ background:'rgba(239,68,68,.12)', color:C.red }}>{err}</div>}

      <div className="mt-5 flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60"
          style={{ background:C.accent, color:'#04120c' }}>
          {saved ? <CheckCircle size={16}/> : <Save size={16}/>}
          {saving ? 'Menyimpan…' : saved ? 'Tersimpan' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  )
}
