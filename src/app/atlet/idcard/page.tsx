'use client'
// src/app/atlet/idcard/page.tsx — ID Card Digital + CETAK (kartu fisik siap print)
// Contoh template kartu identitas atlet (85.6 x 54 mm / ukuran CR80). Depan + belakang.
// QR asli (lib qrcode). Tombol Cetak memakai window.print() + CSS @media print.

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { QrCode, ShieldCheck, Printer, Download } from 'lucide-react'
import { C, useMe, Loading, PageHeader } from '@/components/atlet/portal-ui'

const initials = (n?:string) => (n || '?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()

export default function IdCardPage() {
  const { me, loading } = useMe()
  const [qr, setQr] = useState('')

  useEffect(() => {
    if (!me) return
    const payload = `PORPROV-XV|ATLET|REG:${me.no_registrasi_koni ?? '-'}|${me.nama_lengkap}|${me.cabor_nama_raw ?? ''}`
    QRCode.toDataURL(payload, { margin:0, width:320, color:{ dark:'#04120c', light:'#ffffff' } })
      .then(setQr).catch(()=>setQr(''))
  }, [me])

  if (loading || !me) return <Loading/>

  const verified = ['Verified','Posted'].includes(me.status_registrasi)
  const noPeserta = me.nomor_peserta || (me.no_registrasi_koni ? `KONI-${me.no_registrasi_koni}` : `ATL-${String(me.id).padStart(5,'0')}`)

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto">
      {/* CSS khusus cetak: sembunyikan semua kecuali #print-area, kartu ukuran asli */}
      <style>{`
        @media print {
          @page { size: 86mm 54mm; margin: 0; }
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; left: 0; top: 0; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .idcard { box-shadow: none !important; margin: 0 !important; page-break-after: always; break-after: page; }
          .idcard:last-child { page-break-after: auto; break-after: auto; }
        }
        .idcard { width: 85.6mm; height: 54mm; border-radius: 3.2mm; overflow: hidden;
          position: relative; color: #eaf5ef; font-family: system-ui, sans-serif;
          box-shadow: 0 10px 30px rgba(0,0,0,.35); }
      `}</style>

      <div className="no-print">
        <PageHeader icon={QrCode} title="ID Card Atlet" subtitle="Kartu identitas digital & siap cetak (contoh template)"
          action={
            <div className="flex gap-2">
              <button onClick={()=>window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm"
                style={{ background:C.accent, color:'#04120c' }}>
                <Printer size={16}/> Cetak
              </button>
              {qr && (
                <a href={qr} download={`qr-${me.no_registrasi_koni ?? me.id}.png`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm"
                  style={{ background:C.card, border:`1px solid ${C.border}`, color:C.accent }}>
                  <Download size={16}/> QR
                </a>
              )}
            </div>
          }/>
        <p className="text-xs mb-5" style={{ color:C.muted }}>
          Pratinjau kartu depan &amp; belakang. Klik <b style={{color:C.accent}}>Cetak</b> → pilih ukuran kertas / kartu (86×54&nbsp;mm).
          Ini <b>contoh template</b> — kirim desain resmi Anda, nanti saya samakan.
        </p>
      </div>

      {/* AREA CETAK */}
      <div id="print-area" className="flex flex-col items-center gap-8">

        {/* ── DEPAN ── */}
        <div className="idcard" style={{ background:'linear-gradient(150deg,#0e3225 0%,#04140d 60%,#061c12 100%)' }}>
          {/* pita atas */}
          <div style={{ height:'11mm', background:'linear-gradient(90deg,#00B48A,#0e7a5c)', display:'flex',
            alignItems:'center', justifyContent:'space-between', padding:'0 4mm' }}>
            <div>
              <div style={{ fontSize:'2.5mm', fontWeight:800, letterSpacing:'.12em', color:'#04140d' }}>PORPROV XV · JAWA BARAT 2026</div>
              <div style={{ fontSize:'1.9mm', letterSpacing:'.14em', color:'#053a2b' }}>KARTU IDENTITAS ATLET</div>
            </div>
            <div style={{ width:'7mm', height:'7mm', borderRadius:'50%', background:'#04140d', color:'#00B48A',
              display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'3mm' }}>PB</div>
          </div>

          {/* isi */}
          <div style={{ display:'flex', gap:'3.5mm', padding:'3.5mm 4mm' }}>
            {/* foto */}
            <div style={{ width:'18mm', height:'23mm', borderRadius:'2mm', overflow:'hidden', flexShrink:0,
              border:'0.4mm solid rgba(255,255,255,.25)', background:'#0a2318',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              {me.foto_url
                ? <img src={me.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                : <span style={{ fontSize:'7mm', fontWeight:800, color:'#1c6b50' }}>{initials(me.nama_lengkap)}</span>}
            </div>

            {/* detail */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'1.8mm', letterSpacing:'.12em', color:'#4f9e83' }}>NAMA</div>
              <div style={{ fontSize:'3.6mm', fontWeight:800, lineHeight:1.05, marginBottom:'1.8mm',
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{me.nama_lengkap}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.4mm 2mm' }}>
                <Field l="Cabor" v={me.cabor_nama_raw}/>
                <Field l="No. Peserta" v={noPeserta}/>
                <Field l="Kontingen" v={me.nama_asal_daerah}/>
                <Field l="Gender" v={me.gender==='L'?'Laki-laki':me.gender==='P'?'Perempuan':me.gender}/>
              </div>
            </div>

            {/* QR */}
            <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'1mm' }}>
              <div style={{ width:'16mm', height:'16mm', background:'#fff', borderRadius:'1.5mm', padding:'0.8mm' }}>
                {qr && <img src={qr} alt="QR" style={{ width:'100%', height:'100%' }}/>}
              </div>
              <span style={{ fontSize:'1.7mm', letterSpacing:'.06em',
                color: verified ? '#34d8a6' : '#e0a944', fontWeight:700 }}>
                {verified ? '● TERVERIFIKASI' : '○ '+me.status_registrasi}
              </span>
            </div>
          </div>

          {/* pita bawah */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'3mm',
            background:'rgba(0,0,0,.25)', display:'flex', alignItems:'center', padding:'0 4mm' }}>
            <span style={{ fontSize:'1.7mm', letterSpacing:'.1em', color:'#6fae97' }}>
              ID {String(me.id).padStart(6,'0')} · Berlaku selama PORPROV XV 2026
            </span>
          </div>
        </div>

        {/* ── BELAKANG ── */}
        <div className="idcard" style={{ background:'linear-gradient(150deg,#08281c 0%,#04140d 100%)' }}>
          <div style={{ padding:'4mm', display:'flex', flexDirection:'column', height:'100%' }}>
            <div style={{ fontSize:'2.4mm', fontWeight:800, letterSpacing:'.1em', color:'#00B48A', marginBottom:'2mm' }}>KETENTUAN</div>
            <ol style={{ margin:0, paddingLeft:'3.5mm', fontSize:'2mm', lineHeight:1.5, color:'#b6cfc2' }}>
              <li>Kartu ini milik Panitia Besar PORPROV XV dan wajib dikenakan selama kegiatan.</li>
              <li>Berlaku hanya untuk pemegang sah yang namanya tercantum.</li>
              <li>Jika hilang/ditemukan, hubungi Sekretariat PORPROV XV Jawa Barat.</li>
            </ol>

            <div style={{ marginTop:'auto', display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:'3mm' }}>
              <div>
                <div style={{ fontSize:'1.8mm', color:'#4f9e83', letterSpacing:'.1em' }}>PEMEGANG</div>
                <div style={{ fontSize:'2.6mm', fontWeight:700, color:'#eaf5ef' }}>{me.nama_lengkap}</div>
                <div style={{ fontSize:'1.9mm', color:'#6fae97', marginTop:'0.6mm' }}>{me.cabor_nama_raw} · {me.nama_asal_daerah}</div>
                <div style={{ marginTop:'2.5mm', width:'34mm', borderTop:'0.3mm solid rgba(255,255,255,.3)',
                  fontSize:'1.7mm', color:'#4f9e83', paddingTop:'0.8mm' }}>Panitia Besar PORPROV XV</div>
              </div>
              <div style={{ width:'15mm', height:'15mm', background:'#fff', borderRadius:'1.5mm', padding:'0.8mm', flexShrink:0 }}>
                {qr && <img src={qr} alt="QR" style={{ width:'100%', height:'100%' }}/>}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function Field({ l, v }:{ l:string; v:any }) {
  return (
    <div style={{ minWidth:0 }}>
      <div style={{ fontSize:'1.6mm', letterSpacing:'.08em', color:'#4f9e83' }}>{l.toUpperCase()}</div>
      <div style={{ fontSize:'2.3mm', fontWeight:600, color:'#eaf5ef', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{v || '—'}</div>
    </div>
  )
}
