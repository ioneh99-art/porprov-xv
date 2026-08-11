'use client'
// src/app/atlet/bonus/page.tsx — Status Bonus (estimasi & kelengkapan SPJ)

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Wallet, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { C, useMe, Loading, PageHeader, Card, medalOf, TARIF, fmtRp, type Kejuaraan } from '@/components/atlet/portal-ui'

const OFFICIAL = ['Verified','Posted','Disetujui','Approved'] // status yang dihitung resmi

export default function BonusPage() {
  const { me, loading } = useMe()
  const [list, setList] = useState<Kejuaraan[]|null>(null)

  useEffect(() => {
    fetch('/api/atlet/kejuaraan')
      .then(r => r.ok ? r.json() : [])
      .then(d => setList(Array.isArray(d) ? d : []))
      .catch(() => setList([]))
  }, [])

  if (loading || !me || list === null) return <Loading/>

  const count = { emas:0, perak:0, perunggu:0 }
  let pendingCount = 0
  list.forEach(k => {
    const m = medalOf(k)
    if (!m) return
    if (OFFICIAL.includes(k.status)) count[m]++
    else pendingCount++
  })
  const rows = [
    { key:'emas' as const,     label:'🥇 Emas',     jml:count.emas,     tarif:TARIF.emas },
    { key:'perak' as const,    label:'🥈 Perak',    jml:count.perak,    tarif:TARIF.perak },
    { key:'perunggu' as const, label:'🥉 Perunggu', jml:count.perunggu, tarif:TARIF.perunggu },
  ]
  const total = rows.reduce((s,r)=>s + r.jml*r.tarif, 0)
  const bankOk = !!(me.nama_bank && me.no_rekening)

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto">
      <PageHeader icon={Wallet} title="Status Bonus" subtitle="Estimasi bonus prestasi & kelengkapan SPJ"/>

      <Card className="mb-4" style={{ background:C.cardHi }}>
        <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color:C.muted }}>Estimasi Total Bonus</div>
        <div className="text-3xl font-bold" style={{ color:C.emerald }}>{fmtRp(total)}</div>
        <div className="text-[11px] mt-1" style={{ color:C.muted }}>Dari medali berstatus resmi (Verified/Posted)</div>
      </Card>

      <Card className="mb-4">
        <div className="text-sm font-semibold mb-3" style={{ color:C.accent }}>Rincian</div>
        <div className="space-y-1">
          {rows.map(r => (
            <div key={r.key} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor:C.border }}>
              <span className="text-sm" style={{ color:C.text }}>{r.label}</span>
              <span className="text-xs" style={{ color:C.muted }}>{r.jml} × {fmtRp(r.tarif)}</span>
              <span className="text-sm font-semibold w-32 text-right" style={{ color:C.text }}>{fmtRp(r.jml*r.tarif)}</span>
            </div>
          ))}
        </div>
      </Card>

      {pendingCount > 0 && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background:'rgba(245,158,11,.12)', color:C.amber }}>
          <Info size={16} className="mt-0.5 flex-shrink-0"/>
          <span className="text-xs">{pendingCount} medali masih menunggu verifikasi KONIDA — belum dihitung ke total di atas.</span>
        </div>
      )}

      <Card>
        <div className="text-sm font-semibold mb-3" style={{ color:C.accent }}>Kelengkapan Pencairan (SPJ)</div>
        <div className="flex items-center gap-2 text-sm">
          {bankOk
            ? <><CheckCircle size={16} style={{color:C.emerald}}/><span style={{color:C.text}}>Rekening bank sudah diisi</span></>
            : <><AlertTriangle size={16} style={{color:C.amber}}/><span style={{color:C.text}}>Rekening bank belum lengkap</span></>}
        </div>
        {!bankOk && (
          <Link href="/atlet/profil" className="inline-block mt-3 text-xs font-semibold px-3 py-2 rounded-xl"
            style={{ background:C.accent, color:'#04120c' }}>Lengkapi Rekening →</Link>
        )}
      </Card>

      <p className="text-[11px] mt-4 text-center" style={{ color:C.muted }}>
        *Angka bersifat estimasi. Nominal final mengikuti ketetapan resmi panitia PORPROV.
      </p>
    </div>
  )
}
