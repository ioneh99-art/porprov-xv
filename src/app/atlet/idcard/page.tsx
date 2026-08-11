'use client'
// src/app/atlet/idcard/page.tsx — ID Card Atlet: CETAK pakai template resmi PORPROV XV
// Template asli (public/idcard/tpl-a-front.png + tpl-back.png) jadi latar, data atlet
// (Nama/Daerah/Cabor/Foto) ditumpangkan presisi. QR identitas digital ditampilkan terpisah.
// Ukuran kartu: 102 x 126 mm (potret, sesuai PDF template). Cetak via window.print().

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { QrCode, Printer, Download, Info } from 'lucide-react'
import { C, useMe, Loading, PageHeader, Card } from '@/components/atlet/portal-ui'

export default function IdCardPage() {
  const { me, loading } = useMe()
  const [qr, setQr] = useState('')

  useEffect(() => {
    if (!me) return
    const payload = `PORPROV-XV|ATLET|REG:${me.no_registrasi_koni ?? '-'}|${me.nama_lengkap}|${me.cabor_nama_raw ?? ''}`
    QRCode.toDataURL(payload, { margin:0, width:320, color:{ dark:'#1b2a7a', light:'#ffffff' } })
      .then(setQr).catch(()=>setQr(''))
  }, [me])

  if (loading || !me) return <Loading/>

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto">
      <style>{`
        @media print {
          @page { size: 102mm 126mm; margin: 0; }
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; left: 0; top: 0; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .idcard { box-shadow: none !important; margin: 0 !important;
            page-break-after: always; break-after: page; }
          .idcard:last-child { page-break-after: auto; break-after: auto; }
        }
        .idcard {
          width: 102mm; aspect-ratio: 804 / 993; position: relative;
          container-type: inline-size;
          background-size: cover; background-position: center; background-repeat: no-repeat;
          border-radius: 2mm; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,.25);
        }
        /* nilai data yg ditumpangkan di atas kolom template */
        .ov { position: absolute; font-family: system-ui, sans-serif; font-weight: 700;
          color: #1b2a7a; line-height: 1.05; overflow: hidden; text-overflow: ellipsis;
          white-space: nowrap; }
        .ov-nama   { left: 5%; top: 45.3%; width: 51%; font-size: 4.3cqw; }
        .ov-daerah { left: 5%; top: 55.4%; width: 51%; font-size: 3.7cqw; font-weight: 600; }
        .ov-cabor  { left: 5%; top: 65.4%; width: 51%; font-size: 3.7cqw; font-weight: 600; }
        .ov-foto   { left: 60.3%; top: 41.5%; width: 33.6%; height: 39.1%;
          object-fit: cover; }
      `}</style>

      <div className="no-print">
        <PageHeader icon={QrCode} title="ID Card Atlet" subtitle="Template resmi PORPROV XV — siap cetak"
          action={
            <button onClick={()=>window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm"
              style={{ background:C.accent, color:'#04120c' }}>
              <Printer size={16}/> Cetak
            </button>
          }/>
        <p className="text-xs mb-5" style={{ color:C.muted }}>
          Data <b style={{color:C.text}}>Nama · Daerah · Cabor · Foto</b> otomatis dari profilmu, ditumpangkan
          di template resmi. Klik <b style={{color:C.accent}}>Cetak</b> → ukuran kartu 102×126&nbsp;mm (depan &amp; belakang jadi 2 halaman).
        </p>
      </div>

      {/* AREA CETAK — depan + belakang */}
      <div id="print-area" className="flex flex-col items-center gap-8">
        {/* DEPAN (template kategori A + data ditumpangkan) */}
        <div className="idcard" style={{ backgroundImage:'url(/idcard/tpl-a-front.png)' }}>
          {me.foto_url && <img className="ov ov-foto" src={me.foto_url} alt=""/>}
          <div className="ov ov-nama">{me.nama_lengkap}</div>
          <div className="ov ov-daerah">{me.nama_asal_daerah || '—'}</div>
          <div className="ov ov-cabor">{me.cabor_nama_raw || '—'}</div>
        </div>

        {/* BELAKANG (legenda Akses Venue — statis) */}
        <div className="idcard" style={{ backgroundImage:'url(/idcard/tpl-back.png)' }}/>
      </div>

      {/* QR identitas digital (layar saja, tak ikut tercetak) */}
      <div className="no-print mt-8">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-xl bg-white p-2 flex-shrink-0">
              {qr && <img src={qr} alt="QR" className="w-full h-full"/>}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold mb-1" style={{ color:C.text }}>QR Identitas Digital</div>
              <p className="text-xs mb-2" style={{ color:C.muted }}>
                Untuk verifikasi keaslian atlet. Template cetak resmi belum memuat slot QR —
                bisa saya tambahkan bila diperlukan.
              </p>
              {qr && (
                <a href={qr} download={`qr-${me.no_registrasi_koni ?? me.id}.png`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background:C.accent, color:'#04120c' }}>
                  <Download size={13}/> Unduh QR
                </a>
              )}
            </div>
          </div>
        </Card>
        {!me.foto_url && (
          <div className="flex items-start gap-2 mt-3 text-xs px-3 py-2 rounded-lg"
            style={{ background:'rgba(245,158,11,.1)', color:C.amber }}>
            <Info size={14} className="mt-0.5 flex-shrink-0"/>
            <span>Foto belum ada — kotak foto di kartu masih kosong. Fitur unggah foto atlet bisa ditambahkan.</span>
          </div>
        )}
      </div>
    </div>
  )
}
