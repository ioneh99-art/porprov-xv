'use client'
// src/app/atlet/hasil/page.tsx — Hasil & Medali (rekap perolehan)

import { useEffect, useState } from 'react'
import { Medal, Award } from 'lucide-react'
import { C, Loading, PageHeader, Card, EmptyState, StatusBadge, medalOf, type Kejuaraan } from '@/components/atlet/portal-ui'

const META = {
  emas:     { label:'Emas',     color:C.gold },
  perak:    { label:'Perak',    color:C.silver },
  perunggu: { label:'Perunggu', color:C.bronze },
} as const

export default function HasilPage() {
  const [list, setList] = useState<Kejuaraan[]|null>(null)

  useEffect(() => {
    fetch('/api/atlet/kejuaraan')
      .then(r => r.ok ? r.json() : [])
      .then(d => setList(Array.isArray(d) ? d : []))
      .catch(() => setList([]))
  }, [])

  if (list === null) return <Loading/>

  const medals = list.map(k => ({ k, m: medalOf(k) })).filter(x => x.m) as { k:Kejuaraan; m:'emas'|'perak'|'perunggu' }[]
  const count = { emas:0, perak:0, perunggu:0 }
  medals.forEach(x => count[x.m]++)
  const total = medals.length

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto">
      <PageHeader icon={Medal} title="Hasil & Medali" subtitle={`${total} medali dari ${list.length} kejuaraan`}/>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {(['emas','perak','perunggu'] as const).map(t => (
          <Card key={t} className="!p-4 text-center">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-2"
              style={{ background:`${META[t].color}22`, color:META[t].color }}>
              <Medal size={22}/>
            </div>
            <div className="text-2xl font-bold" style={{ color:C.text }}>{count[t]}</div>
            <div className="text-[11px]" style={{ color:C.muted }}>{META[t].label}</div>
          </Card>
        ))}
      </div>

      {total === 0 ? (
        <Card>
          <EmptyState icon={Award} title="Belum ada medali tercatat"
            desc="Medali dihitung dari riwayat kejuaraan yang kamu masukkan. Emas/Perak/Perunggu akan muncul di sini."/>
        </Card>
      ) : (
        <Card>
          <div className="text-sm font-semibold mb-3" style={{ color:C.accent }}>Rincian Perolehan</div>
          <div className="space-y-2">
            {medals.map(({ k, m }) => (
              <div key={k.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor:C.border }}>
                <Medal size={16} style={{ color:META[m].color }} className="flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color:C.text }}>{k.nama_kejuaraan}</div>
                  <div className="text-[11px]" style={{ color:C.muted }}>{k.nomor_lomba} · {k.tahun} · <span className="capitalize">{k.tingkat}</span></div>
                </div>
                <span className="text-[11px] font-semibold" style={{ color:META[m].color }}>{META[m].label}</span>
                <StatusBadge status={k.status}/>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
