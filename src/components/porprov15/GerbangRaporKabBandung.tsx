'use client'
// src/components/porprov15/GerbangRaporKabBandung.tsx
// Gerbang fitur Rapor Kontingen untuk KONI Kab. Bandung:
//  - terkunci → layar terkunci (data tidak dimuat; API juga menolak)
//  - Superadministrator → panel saklar Buka/Kunci + pratinjau selalu terlihat
import { useEffect, useState } from 'react'
import { Lock, Unlock, Trophy, ShieldCheck } from 'lucide-react'
import RaporKontingen from './RaporKontingen'

const AKSEN = '#a78bfa'
const KONTINGEN_KAB_BANDUNG = 4

interface Akses { terbuka: boolean; boleh: boolean; bisaUbah: boolean; diubah_oleh: string | null; diubah_at: string | null }

export const PERISTIWA_SAKLAR = 'saklar-rapor-kontingen'

export default function GerbangRaporKabBandung() {
  const [akses, setAkses] = useState<Akses | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [menyimpan, setMenyimpan] = useState(false)

  const muat = async () => {
    const r = await fetch('/api/porprov15/rapor-kontingen/akses', { cache: 'no-store' })
    const j = await r.json()
    if (!r.ok) { setGalat(j.error ?? 'Gagal memuat.'); return }
    setAkses(j)
  }
  useEffect(() => { muat() }, [])

  const ubah = async (terbuka: boolean) => {
    const pesan = terbuka
      ? 'Buka Rapor Kontingen untuk KONI Kab. Bandung?\n\nSemua akun KONIDA Kab. Bandung langsung bisa melihat rapor 27 kontingen.'
      : 'Kunci kembali Rapor Kontingen untuk KONI Kab. Bandung?\n\nMenu tetap terlihat bergembok, isinya tidak bisa dibuka.'
    if (!confirm(pesan)) return
    setMenyimpan(true)
    const r = await fetch('/api/porprov15/rapor-kontingen/akses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ terbuka }) })
    const j = await r.json()
    setMenyimpan(false)
    if (!r.ok) { alert(j.error ?? 'Gagal menyimpan.'); return }
    setAkses(j)
    window.dispatchEvent(new Event(PERISTIWA_SAKLAR))
  }

  const waktu = (x: string | null) => (x ? new Date(x).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

  return (
    <div className="text-zinc-300 min-h-screen" style={{ background: 'linear-gradient(150deg,#05030f,#0d0a1f)', margin: '-1.75rem', padding: '1.75rem' }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${AKSEN}15`, border: `1px solid ${AKSEN}40` }}><Trophy size={20} style={{ color: AKSEN }} /></div>
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">RAPOR KONTINGEN PORPROV XV</h1>
          <div className="text-[11px] text-slate-500">Posisi Kab. Bandung di antara 27 kontingen · efisiensi, peta kekuatan per cabor, penguasa cabor</div>
        </div>
      </div>

      {galat && <div className="rounded-2xl p-5 text-sm text-red-300 bg-red-500/5 border border-red-500/20">{galat}</div>}

      {akses?.bisaUbah && (
        <div className="rounded-2xl p-4 mb-5 flex items-center gap-4 flex-wrap" style={{ background: `${AKSEN}0d`, border: `1px solid ${AKSEN}35` }}>
          <ShieldCheck size={18} style={{ color: AKSEN }} />
          <div className="flex-1 min-w-[240px]">
            <div className="text-sm font-bold text-white">Saklar Superadministrator: {akses.terbuka
              ? <span className="text-emerald-400">TERBUKA untuk KONI Kab. Bandung</span>
              : <span className="text-amber-300">TERKUNCI untuk KONI Kab. Bandung</span>}</div>
            <div className="text-[11px] text-slate-400">Hanya Superadministrator yang melihat panel ini. Anda selalu bisa melihat isinya. Terakhir diubah {waktu(akses.diubah_at)} oleh {akses.diubah_oleh ?? '—'}.</div>
          </div>
          {akses.terbuka
            ? <button disabled={menyimpan} onClick={() => ubah(false)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50"><Lock size={13} /> Kunci</button>
            : <button disabled={menyimpan} onClick={() => ubah(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50"><Unlock size={13} /> Buka untuk Kab. Bandung</button>}
        </div>
      )}

      {akses && !akses.boleh && (
        <div className="rounded-2xl p-8 text-center max-w-xl mx-auto mt-10" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${AKSEN}15`, border: `1px solid ${AKSEN}40` }}><Lock size={24} style={{ color: AKSEN }} /></div>
          <div className="text-lg font-black text-white mb-2">Fitur belum dibuka</div>
          <div className="text-sm text-slate-400 leading-relaxed">
            Rapor Kontingen menampilkan posisi Kab. Bandung di antara 27 kontingen PORPROV XV: efisiensi atlet,
            tingkat menang, peta kekuatan tiap cabor, dan siapa penguasa tiap cabor. Fitur ini dibuka oleh Superadministrator.
          </div>
        </div>
      )}

      {akses?.boleh && <RaporKontingen sorotKontingenId={KONTINGEN_KAB_BANDUNG} aksen={AKSEN} />}
    </div>
  )
}
