'use client'
// src/app/dashboard/rapor-kontingen/page.tsx — KONI Jabar: Rapor Kontingen & Peta Kekuatan PORPROV XV.
// Akses halaman /dashboard dibatasi middleware (superadmin, koni_jabar); data diperiksa lagi di API.
import { Trophy } from 'lucide-react'
import RaporKontingen from '@/components/porprov15/RaporKontingen'

export default function RaporKontingenJabarPage() {
  return (
    <div className="text-zinc-300">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/30"><Trophy size={20} className="text-blue-400" /></div>
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">RAPOR KONTINGEN PORPROV XV</h1>
          <div className="text-[11px] text-slate-500">27 kontingen Jawa Barat · efisiensi, tingkat menang, peta kekuatan per cabor, dan ketergantungan</div>
        </div>
      </div>
      <RaporKontingen aksen="#60a5fa" />
    </div>
  )
}
