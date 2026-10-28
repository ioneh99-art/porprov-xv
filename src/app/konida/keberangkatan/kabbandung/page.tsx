'use client'
// src/app/konida/keberangkatan/kabbandung/page.tsx
// Jadwal Keberangkatan (Command Center): kapan tiap cabor turun dan rombongan
// mana berangkat bersama. Dua panel ini dipindah dari halaman Performance atas
// permintaan Bos (28 Okt 2026), supaya Performance fokus ke prestasi atlet.

import { CalendarClock } from 'lucide-react'
import PanelJadwal from '@/components/konida/PanelJadwal'
import PapanKeberangkatan from '@/components/konida/PapanKeberangkatan'

const ACCENT = '#38bdf8'

export default function JadwalKeberangkatan() {
  return (
    <div className="min-h-screen text-zinc-300" style={{ background: 'linear-gradient(135deg,#020a14 0%,#03101c 100%)' }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <CalendarClock size={20} style={{ color: ACCENT }} />
          <div>
            <h1 className="text-xl font-black text-white">Jadwal Keberangkatan</h1>
            <p className="text-sm text-slate-400 mt-0.5">Kapan tiap cabor turun, dan rombongan mana berangkat bersama.</p>
          </div>
        </div>
        <PanelJadwal accent={ACCENT} />
        <PapanKeberangkatan accent={ACCENT} />
      </div>
    </div>
  )
}
