'use client'
// src/components/konida/KartuBpjsProfil.tsx — kotak "Kartu BPJS Ketenagakerjaan" di profil atlet.
// Data lewat /api/konida/kartu-bpjs (bergerbang sesi); gambar & PDF = signed URL 10 menit.

import { useEffect, useState } from 'react'
import { AlertTriangle, Download, Loader2, ShieldCheck } from 'lucide-react'

interface Kartu {
  id: number; status_cocok: string; kpj: string; nik_samar: string; nama_kartu: string
  berlaku: string | null; jumlah_unduh: number; gambar_url: string | null; pdf_url: string | null
}

function Isi({ k }: { k: Kartu }) {
  return (
    <div className="p-4 space-y-3">
      {k.gambar_url && (
        <a href={k.gambar_url} target="_blank" rel="noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={k.gambar_url} alt={`Kartu BPJS ${k.nama_kartu}`} className="w-full max-w-sm rounded-xl shadow-lg" />
        </a>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div><div className="text-[10px] text-zinc-500">No. Peserta (KPJ)</div><div className="font-mono font-semibold text-zinc-200">{k.kpj}</div></div>
        <div><div className="text-[10px] text-zinc-500">Berlaku s.d.</div><div className="font-semibold text-zinc-200">{k.berlaku || '—'}</div></div>
        <div><div className="text-[10px] text-zinc-500">Nama di kartu</div><div className="font-semibold text-zinc-200">{k.nama_kartu}</div></div>
        <div><div className="text-[10px] text-zinc-500">NIK di kartu</div><div className="font-mono font-semibold text-zinc-200">{k.nik_samar}</div></div>
      </div>
      <div className="flex items-center justify-between gap-2">
        {k.pdf_url && (
          <a href={k.pdf_url} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25">
            <Download size={12} /> Unduh PDF
          </a>
        )}
        <span className="text-[10px] text-zinc-500">Diunduh pemilik {k.jumlah_unduh}×</span>
      </div>
    </div>
  )
}

export default function KartuBpjsProfil({ atletId }: { atletId: number }) {
  const [data, setData] = useState<{ kartu: Kartu[]; calon: Kartu[] } | null>(null)
  const [galat, setGalat] = useState('')

  useEffect(() => {
    let hidup = true
    setData(null); setGalat('')
    fetch(`/api/konida/kartu-bpjs?atlet_id=${atletId}`)
      .then(async r => { const d = await r.json().catch(() => ({})); if (!hidup) return; r.ok ? setData(d) : setGalat(d.error || 'Gagal memuat kartu BPJS.') })
      .catch(() => hidup && setGalat('Gagal memuat kartu BPJS.'))
    return () => { hidup = false }
  }, [atletId])

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-4 py-2.5 text-[9px] uppercase tracking-widest font-bold flex items-center gap-2"
        style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <ShieldCheck size={10} /> Kartu BPJS Ketenagakerjaan
      </div>
      {galat ? <div className="p-4 text-xs text-rose-400">{galat}</div>
        : !data ? <div className="p-4 text-xs text-zinc-500 flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Memuat…</div>
        : data.kartu.length ? data.kartu.map(k => <Isi key={k.id} k={k} />)
        : data.calon.length ? (
          <>
            <div className="mx-4 mt-4 p-3 rounded-lg flex gap-2 items-start text-xs text-amber-300" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>Ada kartu dengan nama sama, tapi <b>NIK di kartu berbeda</b> dengan NIK atlet ini. Periksa mana yang benar sebelum dipakai.</span>
            </div>
            {data.calon.map(k => <Isi key={k.id} k={k} />)}
          </>
        )
        : <div className="p-4 text-xs text-zinc-500">Belum ada kartu BPJS untuk atlet ini.</div>}
    </div>
  )
}
