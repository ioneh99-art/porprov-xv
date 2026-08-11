'use client'
// src/app/atlet/dokumen/page.tsx — Dokumen (bukti/sertifikat kejuaraan yang diunggah)

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Download, Plus, ExternalLink } from 'lucide-react'
import { C, Loading, PageHeader, Card, EmptyState, StatusBadge, type Kejuaraan } from '@/components/atlet/portal-ui'

export default function DokumenPage() {
  const [list, setList] = useState<Kejuaraan[]|null>(null)

  useEffect(() => {
    fetch('/api/atlet/kejuaraan')
      .then(r => r.ok ? r.json() : [])
      .then(d => setList(Array.isArray(d) ? d : []))
      .catch(() => setList([]))
  }, [])

  if (list === null) return <Loading/>

  const docs = list.filter(k => k.dokumen_url)

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto">
      <PageHeader icon={FileText} title="Dokumen" subtitle={`${docs.length} bukti/sertifikat terlampir`}/>

      {docs.length === 0 ? (
        <Card>
          <EmptyState icon={FileText} title="Belum ada dokumen"
            desc="Dokumen bukti kejuaraan (sertifikat/piagam) yang kamu unggah saat menambah prestasi akan muncul di sini."
            action={
              <Link href="/atlet/kejuaraan/tambah" className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm"
                style={{ background:C.accent, color:'#04120c' }}>
                <Plus size={16}/> Tambah Kejuaraan + Bukti
              </Link>
            }/>
        </Card>
      ) : (
        <div className="space-y-3">
          {docs.map(k => (
            <Card key={k.id} className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background:`${C.accent}1a`, color:C.accent }}>
                  <FileText size={18}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate" style={{ color:C.text }}>{k.nama_kejuaraan}</span>
                    <StatusBadge status={k.status}/>
                  </div>
                  <div className="text-[11px] truncate" style={{ color:C.muted }}>{k.dokumen_name || 'Dokumen'} · {k.tahun}</div>
                </div>
                <a href={k.dokumen_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl flex-shrink-0"
                  style={{ background:C.dark, border:`1px solid ${C.border}`, color:C.accent }}>
                  <ExternalLink size={13}/> Lihat
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
