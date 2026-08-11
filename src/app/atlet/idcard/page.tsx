'use client'
// src/app/atlet/idcard/page.tsx — ID Card Digital (kartu peserta + QR verifikasi)

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { QrCode, ShieldCheck, Download } from 'lucide-react'
import { C, useMe, Loading, PageHeader, Card } from '@/components/atlet/portal-ui'

export default function IdCardPage() {
  const { me, loading } = useMe()
  const [qr, setQr] = useState('')

  useEffect(() => {
    if (!me) return
    const payload = `PORPROV-XV|ATLET|REG:${me.no_registrasi_koni ?? '-'}|${me.nama_lengkap}|${me.cabor_nama_raw ?? ''}`
    QRCode.toDataURL(payload, { margin:1, width:320, color:{ dark:'#04120c', light:'#ffffff' } })
      .then(setQr).catch(()=>setQr(''))
  }, [me])

  if (loading || !me) return <Loading/>

  const verified = ['Verified','Posted'].includes(me.status_registrasi)

  return (
    <div className="p-5 md:p-8 max-w-md mx-auto">
      <PageHeader icon={QrCode} title="ID Card Digital" subtitle="Kartu peserta resmi & QR verifikasi"/>

      {/* Kartu */}
      <div className="rounded-3xl overflow-hidden border shadow-2xl"
        style={{ borderColor:C.border, background:'linear-gradient(160deg,#0e2a1e 0%,#04120c 100%)' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ background:'rgba(0,180,138,.12)' }}>
          <div>
            <div className="text-[10px] tracking-[0.2em] font-semibold" style={{ color:C.accent }}>PORPROV XV JAWA BARAT</div>
            <div className="text-[10px]" style={{ color:C.muted }}>Kartu Peserta Atlet</div>
          </div>
          {verified
            ? <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background:'rgba(16,185,129,.15)', color:C.emerald }}><ShieldCheck size={12}/>Terverifikasi</span>
            : <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background:'rgba(245,158,11,.15)', color:C.amber }}>{me.status_registrasi}</span>}
        </div>

        <div className="p-6 flex gap-5 items-center">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider" style={{ color:C.muted }}>Nama</div>
            <div className="text-lg font-bold leading-tight mb-3" style={{ color:C.text }}>{me.nama_lengkap}</div>
            <div className="grid grid-cols-2 gap-y-2 gap-x-3">
              <Info label="Cabor" value={me.cabor_nama_raw}/>
              <Info label="No. Reg" value={me.no_registrasi_koni || '—'}/>
              <Info label="Asal" value={me.nama_asal_daerah}/>
              <Info label="Gender" value={me.gender==='L'?'L':me.gender==='P'?'P':me.gender}/>
            </div>
          </div>
          <div className="flex-shrink-0 rounded-2xl overflow-hidden bg-white p-1.5" style={{ width:104, height:104 }}>
            {qr ? <img src={qr} alt="QR" className="w-full h-full"/> : <div className="w-full h-full animate-pulse bg-gray-200 rounded-xl"/>}
          </div>
        </div>

        <div className="px-6 py-3 text-[9px] text-center" style={{ background:'rgba(255,255,255,.03)', color:C.muted }}>
          Pindai QR untuk verifikasi keaslian · ID {String(me.id).padStart(6,'0')}
        </div>
      </div>

      {qr && (
        <a href={qr} download={`idcard-${me.no_registrasi_koni ?? me.id}.png`}
          className="mt-5 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm"
          style={{ background:C.accent, color:'#04120c' }}>
          <Download size={16}/> Unduh QR
        </a>
      )}
      {!verified && (
        <p className="text-[11px] mt-4 text-center" style={{ color:C.muted }}>
          Kartu aktif penuh setelah status kamu <b>Verified</b>.
        </p>
      )}
    </div>
  )
}

function Info({ label, value }:{ label:string; value:any }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider" style={{ color:C.muted }}>{label}</div>
      <div className="text-xs font-semibold truncate" style={{ color:C.text }}>{value || '—'}</div>
    </div>
  )
}
