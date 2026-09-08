'use client'
// src/app/superadmin/data-induk/page.tsx
// Data induk lintas kontingen — hanya superadmin.
//
// Dipindah ke sini dari Data Gateway profil Kab. Bandung, karena keduanya
// bukan data kontingen mana pun:
//   · Klasemen Medali  — perolehan 27 kontingen se-Jawa Barat
//   · Master Cabor     — daftar induk yang dipakai seluruh aplikasi
// Satu perubahan di sini berdampak ke semua kontingen sekaligus.

import { useState } from 'react'
import { Medal, Layers, Database, AlertTriangle } from 'lucide-react'
import { KlasemenTab, CaborTab } from '@/components/superadmin/DataInduk'

const ACCENT = '#ef4444'
type Tab = 'klasemen' | 'cabor'

export default function DataIndukPage() {
  const [tab, setTab] = useState<Tab>('klasemen')

  const TABS: { id: Tab; label: string; icon: any; desc: string }[] = [
    { id: 'klasemen', label: 'Klasemen Medali', icon: Medal,  desc: '27 kontingen' },
    { id: 'cabor',    label: 'Master Cabor',    icon: Layers, desc: 'daftar induk' },
  ]

  return (
    <div className="min-h-screen text-zinc-300 font-sans"
      style={{ background: 'linear-gradient(135deg,#140505 0%,#180808 100%)' }}>

      <div className="sticky top-0 z-40 border-b backdrop-blur-xl px-6 py-4"
        style={{ background: 'rgba(20,5,5,0.95)', borderColor: `${ACCENT}20` }}>
        <div className="max-w-[1600px] mx-auto flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}25` }}>
            <Database size={20} style={{ color: ACCENT }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Data Induk</h1>
            <p className="text-[11px] font-mono mt-0.5 text-white/35">
              Lintas kontingen · Superadmin
            </p>
          </div>
        </div>
      </div>

      <main className="p-6 max-w-[1600px] w-full mx-auto space-y-5">

        <div className="rounded-2xl border px-5 py-4 flex gap-3"
          style={{ borderColor: 'rgba(251,191,36,0.28)', background: 'rgba(251,191,36,0.07)' }}>
          <AlertTriangle size={17} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[13px] text-amber-100/85">
            <b>Perubahan di sini berlaku untuk semua kontingen.</b> Mengubah nama cabor
            mengubahnya di seluruh aplikasi; menonaktifkan cabor menghilangkannya dari
            pilihan semua orang. Klasemen memuat perolehan medali 27 kontingen se-Jawa Barat.
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: tab === t.id ? `${ACCENT}18` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${tab === t.id ? `${ACCENT}40` : 'rgba(255,255,255,0.08)'}`,
                color: tab === t.id ? ACCENT : 'rgba(255,255,255,0.45)',
              }}>
              <t.icon size={14} />
              {t.label}
              <span className="text-[9px] font-normal px-1.5 py-0.5 rounded"
                style={{ background: tab === t.id ? `${ACCENT}20` : 'rgba(255,255,255,0.06)',
                         color: tab === t.id ? ACCENT : 'rgba(255,255,255,0.3)' }}>
                {t.desc}
              </span>
            </button>
          ))}
        </div>

        {tab === 'klasemen' && <KlasemenTab />}
        {tab === 'cabor'    && <CaborTab />}
      </main>
    </div>
  )
}
