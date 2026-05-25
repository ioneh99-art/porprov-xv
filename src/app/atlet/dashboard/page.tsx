'use client'
// src/app/atlet/dashboard/page.tsx — v3 FULL FEATURED
// Fitur: Jadwal · Hasil Medali · Status Bonus · Kelengkapan · Kejuaraan

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Trophy, Clock, CheckCircle, Plus, User,
  Medal, AlertTriangle, ChevronRight, Shield,
  MapPin, Wallet, Calendar, TrendingUp,
  Star, Zap, Target, Edit3, CreditCard, Shirt
} from 'lucide-react'

interface AtletData {
  id: number; nama_lengkap: string; no_ktp: string
  cabor_nama_raw: string; status_registrasi: string
  gender: string; tgl_lahir: string; nama_asal_daerah: string
  ukuran_kemeja: string; ukuran_celana: string; ukuran_sepatu: string
  nama_bank: string; no_rekening: string; nama_pemilik_rekening: string
  no_registrasi_koni: number; login_count: number
  is_public: boolean; no_hp: string; email: string; kontingen_id: number
}

interface Kejuaraan {
  id: string; nama_kejuaraan: string; tingkat: string
  tahun: number; nomor_lomba: string; hasil: string; status: string
}

const C = { dark:'#020D06', accent:'#00B48A', green:'#065F46' }
const STATUS_STYLE: Record<string,{bg:string;text:string;border:string}> = {
  'Verified':       {bg:'rgba(74,222,128,0.1)', text:'#4ADE80',border:'rgba(74,222,128,0.25)'},
  'Posted':         {bg:'rgba(96,165,250,0.1)', text:'#60A5FA',border:'rgba(96,165,250,0.25)'},
  'Menunggu Admin': {bg:'rgba(251,191,36,0.1)', text:'#FBBF24',border:'rgba(251,191,36,0.25)'},
  'Ditolak Admin':  {bg:'rgba(239,68,68,0.1)',  text:'#F87171',border:'rgba(239,68,68,0.25)'},
}
const TINGKAT_STYLE: Record<string,{bg:string;text:string}> = {
  'internasional':{bg:'rgba(167,139,250,0.1)',text:'#A78BFA'},
  'nasional':     {bg:'rgba(96,165,250,0.1)', text:'#60A5FA'},
  'provinsi':     {bg:'rgba(0,180,138,0.1)',  text:'#00B48A'},
  'kab_kota':     {bg:'rgba(148,163,184,0.1)',text:'#94A3B8'},
}

// TARIF BONUS
const TARIF = { emas:10_000_000, perak:7_500_000, perunggu:5_000_000 }

function fmtRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE['Menunggu Admin']
  return (
    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
      style={{background:s.bg, color:s.text, border:`1px solid ${s.border}`}}>
      {status}
    </span>
  )
}

export default function AtletDashboard() {
  const router = useRouter()
  const [me,        setMe]        = useState<AtletData|null>(null)
  const [kejuaraan, setKejuaraan] = useState<Kejuaraan[]>([])
  const [loading,   setLoading]   = useState(true)
  const [editData,  setEditData]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  // Edit fields
  const [kemeja,   setKemeja]   = useState('')
  const [celana,   setCelana]   = useState('')
  const [sepatu,   setSepatu]   = useState('')
  const [bank,     setBank]     = useState('')
  const [rekening, setRekening] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [meRes, kejRes] = await Promise.all([
        fetch('/api/atlet/me'),
        fetch('/api/atlet/kejuaraan'),
      ])
      if (!meRes.ok) { router.push('/atlet/login'); return }
      const [meData, kejData] = await Promise.all([meRes.json(), kejRes.json()])
      setMe(meData)
      setKejuaraan(Array.isArray(kejData) ? kejData : [])
      setKemeja(meData.ukuran_kemeja||'')
      setCelana(meData.ukuran_celana||'')
      setSepatu(meData.ukuran_sepatu||'')
      setBank(meData.nama_bank||'')
      setRekening(meData.no_rekening||'')
    } catch { router.push('/atlet/login') }
    finally { setLoading(false) }
  }

  async function saveData() {
    setSaving(true)
    await fetch('/api/atlet/update', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ukuran_kemeja:kemeja, ukuran_celana:celana, ukuran_sepatu:sepatu, nama_bank:bank, no_rekening:rekening }),
    })
    setSaving(false); setSaved(true); setEditData(false)
    setTimeout(()=>setSaved(false), 3000)
    loadAll()
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center" style={{background:C.dark}}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3"/>
        <div className="text-zinc-500 text-sm">Memuat dashboard...</div>
      </div>
    </div>
  )
  if (!me) return null

  // Kalkulasi kelengkapan
  const kelFields = [
    {label:'NIK/KTP',       ok:!!me.no_ktp,                        icon:Shield},
    {label:'Ukuran Kemeja', ok:!!me.ukuran_kemeja,                 icon:Shirt},
    {label:'Ukuran Sepatu', ok:!!me.ukuran_sepatu,                 icon:Target},
    {label:'Rekening Bank', ok:!!(me.nama_bank && me.no_rekening), icon:CreditCard},
    {label:'No. Reg KONI',  ok:!!me.no_registrasi_koni,            icon:Star},
  ]
  const pct = Math.round(kelFields.filter(f=>f.ok).length/kelFields.length*100)

  // Kalkulasi bonus dari kejuaraan terverifikasi
  const kej_verified = kejuaraan.filter(k=>k.status==='Verified')
  const emas    = kej_verified.filter(k=>k.hasil.toLowerCase().includes('emas')||k.hasil.includes('1')).length
  const perak   = kej_verified.filter(k=>k.hasil.toLowerCase().includes('perak')||k.hasil.includes('2')).length
  const perunggu= kej_verified.filter(k=>k.hasil.toLowerCase().includes('perunggu')||k.hasil.includes('3')).length
  const totalBonus = emas*TARIF.emas + perak*TARIF.perak + perunggu*TARIF.perunggu

  const pending  = kejuaraan.filter(k=>k.status.startsWith('Menunggu')).length
  const ditolak  = kejuaraan.filter(k=>k.status==='Ditolak').length

  const inp = "w-full px-3 py-2 rounded-lg text-xs text-white outline-none transition-all"
  const inpStyle = { background:'rgba(0,0,0,0.3)', border:'1px solid rgba(0,180,138,0.15)' }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">

      {/* ── HEADER GREETING ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-zinc-500 text-sm mb-1">
            Selamat datang,
          </div>
          <h1 className="text-white text-2xl font-extrabold leading-tight">
            {me.nama_lengkap.split(' ')[0]} 👋
          </h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-zinc-400 text-xs flex items-center gap-1">
              <Trophy size={11} style={{color:C.accent}}/>{me.cabor_nama_raw}
            </span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-400 text-xs">{me.gender==='L'?'Putra':'Putri'}</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-400 text-xs flex items-center gap-1">
              <MapPin size={11} style={{color:C.accent}}/>{me.nama_asal_daerah||'Kab. Bogor'}
            </span>
            <StatusBadge status={me.status_registrasi}/>
          </div>
        </div>
        <div className="text-right">
          <div className="text-zinc-600 text-[10px]">Login ke-{me.login_count||1}</div>
          {me.no_registrasi_koni && (
            <div className="text-zinc-500 text-[10px] flex items-center gap-1 justify-end mt-1">
              <Shield size={10}/> {me.no_registrasi_koni}
            </div>
          )}
        </div>
      </div>

      {/* ── WARNING kelengkapan ── */}
      {pct < 100 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.2)'}}>
          <AlertTriangle size={15} className="text-amber-400 flex-shrink-0"/>
          <div className="text-xs text-amber-300 flex-1">
            Data {pct}% lengkap — lengkapi rekening untuk pencairan bonus medali.
          </div>
          <button onClick={()=>setEditData(true)}
            className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1">
            Lengkapi <ChevronRight size={11}/>
          </button>
        </div>
      )}

      {/* ── ROW 1: 4 KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {label:'Total Kejuaraan', val:kejuaraan.length,          icon:Trophy,      color:'#F59E0B', sub:'diinput'},
          {label:'Terverifikasi',   val:kej_verified.length,       icon:CheckCircle, color:'#4ADE80', sub:'valid'},
          {label:'Menunggu Review', val:pending,                    icon:Clock,       color:pending>0?'#FBBF24':'#52525B', sub:'proses'},
          {label:'Estimasi Bonus',  val:totalBonus>0?fmtRp(totalBonus):'Rp 0', icon:Wallet, color:'#60A5FA', sub:'dari medali', small:true},
        ].map(k=>(
          <div key={k.label} className="rounded-2xl p-4"
            style={{background:'rgba(5,20,10,0.9)',border:'1px solid rgba(0,180,138,0.12)'}}>
            <div className="flex justify-between items-start mb-3">
              <span className="text-zinc-500 text-[10px] font-medium">{k.label}</span>
              <k.icon size={15} style={{color:k.color}}/>
            </div>
            <div className={`font-extrabold leading-tight ${k.small?'text-base':'text-2xl'}`}
              style={{color:k.color}}>{k.val}</div>
            <div className="text-zinc-600 text-[10px] mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── ROW 2: Jadwal + Kelengkapan ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Jadwal tanding */}
        <div className="rounded-2xl overflow-hidden"
          style={{background:'rgba(5,20,10,0.9)',border:'1px solid rgba(0,180,138,0.15)'}}>
          <div className="flex items-center justify-between px-5 py-4"
            style={{borderBottom:'1px solid rgba(0,180,138,0.08)'}}>
            <div className="flex items-center gap-2">
              <Calendar size={16} style={{color:C.accent}}/>
              <div>
                <div className="text-white text-sm font-bold">Jadwal Tanding</div>
                <div className="text-zinc-600 text-[10px]">PORPROV XV · 15–29 Juni 2026</div>
              </div>
            </div>
            <Link href="/atlet/jadwal"
              className="text-[10px] font-bold flex items-center gap-1"
              style={{color:C.accent}}>
              Lihat semua <ChevronRight size={11}/>
            </Link>
          </div>
          <div className="px-5 py-8 text-center">
            <div className="text-4xl mb-3">🏟️</div>
            <div className="text-white font-bold text-sm mb-1">H-{Math.max(0,Math.ceil((new Date('2026-06-15').getTime()-Date.now())/86400000))} Menuju PORPROV</div>
            <div className="text-zinc-500 text-xs">15 Juni 2026 · Kab. Bogor</div>
            <div className="mt-4 px-4 py-3 rounded-xl text-xs"
              style={{background:'rgba(0,180,138,0.05)',border:'1px solid rgba(0,180,138,0.1)'}}>
              <span className="text-zinc-400">Cabor kamu: </span>
              <span className="text-white font-bold">{me.cabor_nama_raw}</span>
            </div>
          </div>
        </div>

        {/* Kelengkapan data */}
        <div className="rounded-2xl overflow-hidden"
          style={{background:'rgba(5,20,10,0.9)',border:'1px solid rgba(0,180,138,0.15)'}}>
          <div className="flex items-center justify-between px-5 py-4"
            style={{borderBottom:'1px solid rgba(0,180,138,0.08)'}}>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} style={{color:C.accent}}/>
              <div>
                <div className="text-white text-sm font-bold">Kelengkapan Data</div>
                <div className="text-zinc-600 text-[10px]">{pct}% lengkap</div>
              </div>
            </div>
            <button onClick={()=>setEditData(e=>!e)}
              className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
              style={{
                background:editData?'rgba(0,180,138,0.12)':'rgba(255,255,255,0.04)',
                color:editData?C.accent:'#71717A',
                border:`1px solid ${editData?'rgba(0,180,138,0.25)':'rgba(255,255,255,0.08)'}`,
              }}>
              <Edit3 size={10}/> {editData?'Batal':'Edit'}
            </button>
          </div>
          <div className="px-5 py-4">
            {/* Progress bar */}
            <div className="h-2 rounded-full mb-4" style={{background:'rgba(0,180,138,0.08)'}}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{width:`${pct}%`,background:C.accent}}/>
            </div>
            {/* Field checklist */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {kelFields.map(f=>(
                <div key={f.label} className="flex items-center gap-2 text-xs">
                  {f.ok
                    ? <CheckCircle size={12} style={{color:'#4ADE80',flexShrink:0}}/>
                    : <AlertTriangle size={12} style={{color:'#FBBF24',flexShrink:0}}/>
                  }
                  <span style={{color:f.ok?'#71717A':'#FDE68A'}}>{f.label}</span>
                </div>
              ))}
            </div>
            {/* Edit form */}
            {editData && (
              <div className="space-y-2 pt-3" style={{borderTop:'1px solid rgba(0,180,138,0.08)'}}>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase tracking-wider block mb-1">Kemeja</label>
                    <select value={kemeja} onChange={e=>setKemeja(e.target.value)}
                      className={inp} style={inpStyle}>
                      <option value="">-</option>
                      {['S','M','L','XL','XXL','XXXL'].map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase tracking-wider block mb-1">Celana</label>
                    <input value={celana} onChange={e=>setCelana(e.target.value)}
                      placeholder="S/M/L" className={inp} style={inpStyle}/>
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase tracking-wider block mb-1">Sepatu</label>
                    <input type="number" value={sepatu} onChange={e=>setSepatu(e.target.value)}
                      placeholder="38" min="34" max="48" className={inp} style={inpStyle}/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase tracking-wider block mb-1">Bank</label>
                    <input value={bank} onChange={e=>setBank(e.target.value)}
                      placeholder="BRI / BNI / Mandiri" className={inp} style={inpStyle}/>
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase tracking-wider block mb-1">No. Rekening</label>
                    <input value={rekening} onChange={e=>setRekening(e.target.value)}
                      placeholder="0123456789" className={inp} style={inpStyle}/>
                  </div>
                </div>
                <button onClick={saveData} disabled={saving}
                  className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  style={{background:C.accent,color:C.dark}}>
                  {saving ? '⏳ Menyimpan...' : '💾 Simpan Data'}
                </button>
                {saved && <div className="text-center text-emerald-400 text-xs">✅ Tersimpan!</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ROW 3: Status Bonus ── */}
      <div className="rounded-2xl p-5"
        style={{background:'rgba(5,20,10,0.9)',border:'1px solid rgba(0,180,138,0.15)'}}>
        <div className="flex items-center gap-2 mb-4">
          <Wallet size={16} style={{color:'#60A5FA'}}/>
          <div>
            <div className="text-white text-sm font-bold">Status Bonus Medali</div>
            <div className="text-zinc-600 text-[10px]">Estimasi berdasarkan kejuaraan terverifikasi</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            {med:'🥇 Emas',    jml:emas,     tarif:TARIF.emas,     color:'#F5C518'},
            {med:'🥈 Perak',   jml:perak,    tarif:TARIF.perak,    color:'#C0C0C0'},
            {med:'🥉 Perunggu',jml:perunggu, tarif:TARIF.perunggu, color:'#CD7F32'},
          ].map(m=>(
            <div key={m.med} className="p-3 rounded-xl text-center"
              style={{background:`${m.color}0A`,border:`1px solid ${m.color}25`}}>
              <div className="text-sm font-bold mb-0.5" style={{color:m.color}}>{m.jml}×</div>
              <div className="text-[10px] text-zinc-400 mb-1">{m.med}</div>
              <div className="text-xs font-bold text-white">{fmtRp(m.jml*m.tarif)}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl"
          style={{background:'rgba(96,165,250,0.06)',border:'1px solid rgba(96,165,250,0.15)'}}>
          <div>
            <div className="text-zinc-400 text-xs">Total Estimasi Bonus</div>
            <div className="text-[10px] text-zinc-600">Sesuai SK Bupati yang berlaku</div>
          </div>
          <div className="text-xl font-extrabold" style={{color:'#60A5FA'}}>
            {fmtRp(totalBonus)}
          </div>
        </div>
        {!me.no_rekening && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-400">
            <AlertTriangle size={12}/>
            Rekening belum diisi — pencairan bonus akan tertunda!
            <button onClick={()=>setEditData(true)} className="underline font-bold">Isi sekarang</button>
          </div>
        )}
      </div>

      {/* ── ROW 4: Riwayat Kejuaraan ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{background:'rgba(5,20,10,0.9)',border:'1px solid rgba(0,180,138,0.15)'}}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{borderBottom:'1px solid rgba(0,180,138,0.08)'}}>
          <div className="flex items-center gap-2">
            <Trophy size={16} style={{color:'#F59E0B'}}/>
            <div>
              <div className="text-white text-sm font-bold">Riwayat Kejuaraan</div>
              <div className="text-zinc-600 text-[10px]">{kejuaraan.length} kejuaraan · {kej_verified.length} terverifikasi</div>
            </div>
          </div>
          <Link href="/atlet/kejuaraan/tambah"
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl"
            style={{background:C.accent,color:C.dark}}>
            <Plus size={13}/> Tambah
          </Link>
        </div>

        {kejuaraan.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">🏆</div>
            <div className="text-zinc-500 text-sm font-medium">Belum ada kejuaraan</div>
            <div className="text-zinc-700 text-xs mt-1">Tambahkan prestasi kamu untuk diverifikasi</div>
          </div>
        ) : (
          <div>
            {kejuaraan.slice(0,5).map((k,i)=>{
              const ts = TINGKAT_STYLE[k.tingkat]||TINGKAT_STYLE.kab_kota
              const ss = STATUS_STYLE[k.status]||STATUS_STYLE['Menunggu Admin']
              return (
                <div key={k.id} className="px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                  style={{borderTop:i>0?'1px solid rgba(255,255,255,0.04)':'none'}}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-white text-sm font-bold truncate">{k.nama_kejuaraan}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{background:ts.bg,color:ts.text}}>
                          {k.tingkat.replace('_','/')}
                        </span>
                      </div>
                      <div className="text-zinc-500 text-xs">
                        {k.nomor_lomba} · <span className="text-zinc-300 font-semibold">{k.hasil}</span> · {k.tahun}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                      style={{background:ss.bg,color:ss.text,border:`1px solid ${ss.border}`}}>
                      {k.status}
                    </span>
                  </div>
                </div>
              )
            })}
            {kejuaraan.length > 5 && (
              <div className="px-5 py-3 text-center" style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                <Link href="/atlet/kejuaraan"
                  className="text-xs font-bold flex items-center justify-center gap-1"
                  style={{color:C.accent}}>
                  Lihat {kejuaraan.length-5} kejuaraan lainnya <ChevronRight size={12}/>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}