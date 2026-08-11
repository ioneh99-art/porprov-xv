'use client'
// src/app/atlet/kejuaraan/page.tsx — Riwayat Juara (daftar kejuaraan atlet)

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Plus, MapPin, Calendar, FileText, Medal } from 'lucide-react'
import { C, Loading, PageHeader, Card, EmptyState, StatusBadge, medalOf, type Kejuaraan } from '@/components/atlet/portal-ui'

const MEDAL_COLOR = { emas:C.gold, perak:C.silver, perunggu:C.bronze }

export default function KejuaraanPage() {
  const [list, setList] = useState<Kejuaraan[]|null>(null)

  useEffect(() => {
    fetch('/api/atlet/kejuaraan')
      .then(r => r.ok ? r.json() : [])
      .then(d => setList(Array.isArray(d) ? d : []))
      .catch(() => setList([]))
  }, [])

  if (list === null) return <Loading/>

  const tambahBtn = (
    <Link href="/atlet/kejuaraan/tambah"
      className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm"
      style={{ background:C.accent, color:'#04120c' }}>
      <Plus size={16}/> Tambah
    </Link>
  )

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto">
      <PageHeader icon={Trophy} title="Riwayat Juara" subtitle={`${list.length} kejuaraan tercatat`} action={tambahBtn}/>

      {list.length === 0 ? (
        <Card>
          <EmptyState icon={Trophy} title="Belum ada riwayat kejuaraan"
            desc="Tambahkan prestasi kejuaraanmu untuk diverifikasi KONIDA dan dihitung sebagai bonus."
            action={tambahBtn}/>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map(k => {
            const m = medalOf(k)
            return (
              <Card key={k.id} className="!p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: m ? `${MEDAL_COLOR[m]}22` : `${C.muted}18`, color: m ? MEDAL_COLOR[m] : C.muted }}>
                    <Medal size={18}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate" style={{ color:C.text }}>{k.nama_kejuaraan}</span>
                      <StatusBadge status={k.status}/>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color:C.muted }}>
                      {k.nomor_lomba} · <span className="capitalize">{k.tingkat}</span> · {k.hasil}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color:C.muted }}>
                      <span className="flex items-center gap-1"><Calendar size={11}/>{k.tahun}</span>
                      {k.lokasi && <span className="flex items-center gap-1"><MapPin size={11}/>{k.lokasi}</span>}
                      {k.dokumen_url && (
                        <a href={k.dokumen_url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 hover:underline" style={{ color:C.accent }}>
                          <FileText size={11}/>Bukti
                        </a>
                      )}
                    </div>
                    {k.catatan_konida && (
                      <div className="mt-2 text-[11px] px-2 py-1 rounded-lg" style={{ background:'rgba(245,158,11,.1)', color:C.amber }}>
                        Catatan KONIDA: {k.catatan_konida}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
