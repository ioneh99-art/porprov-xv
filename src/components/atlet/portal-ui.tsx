'use client'
// src/components/atlet/portal-ui.tsx
// Kit UI bersama untuk halaman portal atlet (tema dark-green, konsisten dgn dashboard/sidebar).

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export const C = {
  dark:'#020D06', card:'#0a1710', cardHi:'#0e2018',
  border:'rgba(255,255,255,0.08)',
  accent:'#00B48A', emerald:'#10b981',
  gold:'#f5c518', silver:'#cbd5e1', bronze:'#cd7f32',
  blue:'#3b82f6', amber:'#f59e0b', red:'#ef4444',
  muted:'#7c8f85', text:'#e6f0ea',
}

export interface Me {
  id:number; nama_lengkap:string; no_ktp:string; cabor_nama_raw:string
  status_registrasi:string; gender:string; tgl_lahir:string
  nama_asal_daerah:string; kode_asal_daerah:string
  ukuran_kemeja:string; ukuran_celana:string; ukuran_sepatu:string
  nama_bank:string; no_rekening:string; nama_pemilik_rekening:string
  no_registrasi_koni:number; login_count:number; last_login:string
  is_public:boolean; portal_aktif:boolean; kontingen_id:number
  no_hp:string; email:string
}

export interface Kejuaraan {
  id:number; nama_kejuaraan:string; penyelenggara:string; tingkat:string
  tahun:number; tanggal:string; lokasi:string; cabor:string; nomor_lomba:string
  hasil:string; deskripsi:string; dokumen_url:string; dokumen_name:string
  status:string; medali:string; created_at:string; catatan_konida?:string
}

// Ambil profil atlet; kalau sesi invalid → lempar ke login.
export function useMe() {
  const router = useRouter()
  const [me, setMe] = useState<Me|null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/atlet/me')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setMe(d))
      .catch(() => router.push('/atlet/login'))
      .finally(() => setLoading(false))
  }, [])
  return { me, loading }
}

export function Loading({ label='Memuat…' }:{ label?:string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] gap-3" style={{ color:C.muted }}>
      <Loader2 className="animate-spin" size={20}/>
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function PageHeader({ icon:Icon, title, subtitle, action }:{
  icon:any; title:string; subtitle?:string; action?:React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <Link href="/atlet/dashboard" className="p-2 rounded-xl border transition-colors hover:bg-white/5"
          style={{ borderColor:C.border, color:C.muted }} aria-label="Kembali">
          <ArrowLeft size={16}/>
        </Link>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background:`${C.accent}1a`, color:C.accent }}>
          <Icon size={20}/>
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight" style={{ color:C.text }}>{title}</h1>
          {subtitle && <p className="text-xs" style={{ color:C.muted }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function Card({ children, className='', style }:{
  children:React.ReactNode; className?:string; style?:React.CSSProperties
}) {
  return (
    <div className={`rounded-2xl border p-5 ${className}`}
      style={{ background:C.card, borderColor:C.border, ...style }}>
      {children}
    </div>
  )
}

export function EmptyState({ icon:Icon, title, desc, action }:{
  icon:any; title:string; desc?:string; action?:React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background:`${C.muted}18`, color:C.muted }}>
        <Icon size={26}/>
      </div>
      <h3 className="font-semibold mb-1" style={{ color:C.text }}>{title}</h3>
      {desc && <p className="text-sm max-w-sm mb-4" style={{ color:C.muted }}>{desc}</p>}
      {action}
    </div>
  )
}

// Klasifikasi medali dari kolom `medali` / fallback dari `hasil`.
export function medalOf(k:Kejuaraan):'emas'|'perak'|'perunggu'|null {
  const s = `${k.medali ?? ''} ${k.hasil ?? ''}`.toLowerCase()
  if (/emas|gold|juara 1|juara i\b|peringkat 1/.test(s)) return 'emas'
  if (/perak|silver|juara 2|juara ii\b|peringkat 2/.test(s)) return 'perak'
  if (/perunggu|bronze|juara 3|juara iii\b|peringkat 3/.test(s)) return 'perunggu'
  return null
}

export const TARIF = { emas:10_000_000, perak:7_500_000, perunggu:5_000_000 }
export const fmtRp = (n:number) => 'Rp '+n.toLocaleString('id-ID')

export const STATUS_STYLE: Record<string,{bg:string;fg:string}> = {
  'Verified':        { bg:'rgba(16,185,129,.15)', fg:'#10b981' },
  'Posted':          { bg:'rgba(59,130,246,.15)', fg:'#3b82f6' },
  'Menunggu KONIDA': { bg:'rgba(245,158,11,.15)', fg:'#f59e0b' },
  'Menunggu Admin':  { bg:'rgba(245,158,11,.15)', fg:'#f59e0b' },
  'Ditolak':         { bg:'rgba(239,68,68,.15)',  fg:'#ef4444' },
}

export function StatusBadge({ status }:{ status:string }) {
  const s = STATUS_STYLE[status] ?? { bg:'rgba(124,143,133,.15)', fg:C.muted }
  return (
    <span className="text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap"
      style={{ background:s.bg, color:s.fg }}>{status || '—'}</span>
  )
}
