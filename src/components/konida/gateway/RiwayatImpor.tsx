'use client'
// src/components/konida/gateway/RiwayatImpor.tsx
// Riwayat pemasukan data — sisi lain dari pratinjau.
//
// Pratinjau menjawab "apa yang AKAN berubah" sebelum disimpan.
// Layar ini menjawab "apa yang SUDAH berubah, oleh siapa, kapan" sesudahnya,
// termasuk nilai sebelum dan sesudah per atlet.

import { useState, useEffect, useCallback } from 'react'
import {
  History, Loader2, RefreshCw, ChevronDown, ChevronRight, ShieldCheck, Inbox,
} from 'lucide-react'

interface Jejak { atlet_id: number; nama?: string; ubah: Record<string, { lama: any; baru: any }> }
interface Baris {
  id: number; created_at: string; action: string; resource: string | null
  actor_email: string | null; actor_role: string | null
  payload: any; severity: string
}

const NAMA_AKSI: Record<string, string> = {
  GATEWAY_IMPOR_IDENTITAS:    'Impor Identitas Atlet',
  GATEWAY_IMPOR_PERLENGKAPAN: 'Impor Perlengkapan',
  GATEWAY_IMPOR_BIOMOTORIK:   'Impor Tes Biomotorik',
  GATEWAY_SIMPAN_FOTO:        'Simpan Pasfoto',
  GATEWAY_UBAH_STATUS_ATLET:  'Ubah Status Atlet',
  REKONSILIASI_COMMIT:        'Rekonsiliasi Peserta',
  REKONSILIASI_COMMIT_INTEL:  'Target Medali (KBAAS)',
  SET_PERLENGKAPAN:           'Perlengkapan (satuan)',
}

function waktu(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
const fmt = (v: any) => (v == null || v === '') ? '(kosong)' : String(v)

export default function RiwayatImpor({ accent = '#38bdf8' }: { accent?: string }) {
  const [baris, setBaris] = useState<Baris[]>([])
  const [sibuk, setSibuk] = useState(true)
  const [galat, setGalat] = useState('')
  const [buka, setBuka]   = useState<Set<number>>(new Set())

  const muat = useCallback(async () => {
    setSibuk(true); setGalat('')
    try {
      const r = await fetch('/api/gateway/riwayat?batas=100')
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error ?? 'Gagal memuat riwayat')
      setBaris(d.riwayat ?? [])
    } catch (e: any) { setGalat(e.message) }
    finally { setSibuk(false) }
  }, [])

  useEffect(() => { void muat() }, [muat])

  function toggle(id: number) {
    setBuka(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <History size={18} style={{ color: accent }} className="mt-0.5 shrink-0" />
            <div>
              <h3 className="text-white font-bold text-sm">Riwayat Pemasukan Data</h3>
              <p className="text-[12px] text-slate-500">
                Tiap perubahan lewat gerbang ini tercatat — siapa, kapan, dan nilai sebelum-sesudahnya.
              </p>
            </div>
          </div>
          <button onClick={muat} disabled={sibuk}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/10 bg-white/[0.05] hover:bg-white/10 text-slate-300 disabled:opacity-40 inline-flex items-center gap-1.5 shrink-0">
            <RefreshCw size={13} className={sibuk ? 'animate-spin' : ''} /> Muat ulang
          </button>
        </div>
      </div>

      {galat && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">{galat}</div>
      )}

      {sibuk && !baris.length && (
        <div className="rounded-2xl border border-white/10 p-12 text-center">
          <Loader2 size={22} className="mx-auto text-slate-600 animate-spin" />
        </div>
      )}

      {!sibuk && !baris.length && !galat && (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
          <Inbox size={28} className="mx-auto text-slate-700 mb-3" />
          <p className="text-sm text-slate-500">Belum ada pemasukan data lewat gerbang ini.</p>
          <p className="text-[12px] text-slate-600 mt-1">
            Riwayat akan terisi sendiri begitu ada impor yang disimpan.
          </p>
        </div>
      )}

      {baris.length > 0 && (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          {baris.map(b => {
            const p = b.payload ?? {}
            const rekap = p.rekap_perubahan
            const jejak: Jejak[] = Array.isArray(p.jejak) ? p.jejak : []
            const adaRincian = jejak.length > 0
            return (
              <div key={b.id} className="border-b border-white/[0.06] last:border-0">
                <div className="flex items-center gap-3 px-4 py-3">
                  <ShieldCheck size={15} className="text-emerald-400/70 shrink-0" />
                  <button onClick={() => adaRincian && toggle(b.id)}
                    className={`min-w-0 flex-1 text-left ${adaRincian ? '' : 'cursor-default'}`}>
                    <div className="text-sm text-slate-200 truncate">
                      {NAMA_AKSI[b.action] ?? b.action}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {waktu(b.created_at)}
                      {b.actor_email && <span> · {b.actor_email}</span>}
                      {b.actor_role && <span className="text-slate-600"> ({b.actor_role})</span>}
                    </div>
                  </button>

                  <div className="text-right shrink-0">
                    {p.tersimpan != null && (
                      <div className="text-sm font-bold text-slate-200">{p.tersimpan} baris</div>
                    )}
                    {rekap && (
                      <div className="text-[10px] text-slate-500">
                        {rekap.tambah > 0 && <span className="text-emerald-400">+{rekap.tambah} baru </span>}
                        {rekap.ubah > 0 && <span className="text-amber-400">{rekap.ubah} ditimpa</span>}
                        {!rekap.tambah && !rekap.ubah && <span>tanpa perubahan</span>}
                      </div>
                    )}
                    {p.terubah != null && <div className="text-[10px] text-slate-500">{p.terubah} atlet</div>}
                  </div>

                  {adaRincian && (
                    <button onClick={() => toggle(b.id)} className="text-slate-500 shrink-0">
                      {buka.has(b.id) ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                  )}
                </div>

                {buka.has(b.id) && adaRincian && (
                  <div className="px-4 pb-3 space-y-2.5">
                    {jejak.slice(0, 60).map((jj, i) => (
                      <div key={i} className="rounded-lg bg-white/[0.03] px-3 py-2">
                        <div className="text-[12px] text-slate-300 mb-1">
                          {jj.nama ?? `Atlet ${jj.atlet_id}`}
                        </div>
                        {Object.entries(jj.ubah ?? {}).map(([kolom, v]) => (
                          <div key={kolom} className="grid grid-cols-[120px_1fr] gap-2 text-[11px]">
                            <span className="text-slate-600 truncate">{kolom}</span>
                            <span className="min-w-0">
                              <span className="text-slate-600 line-through break-words">{fmt(v.lama)}</span>
                              <span className="text-slate-700"> → </span>
                              <span className="text-slate-300 break-words">{fmt(v.baru)}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                    {jejak.length > 60 && (
                      <div className="text-[11px] text-slate-600">
                        Menampilkan 60 dari {jejak.length} atlet dalam impor ini.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[11px] text-slate-600">
        Riwayat hanya mencakup perubahan lewat aplikasi. Perubahan yang dilakukan
        langsung ke basis data tidak tercatat di sini.
      </p>
    </div>
  )
}
