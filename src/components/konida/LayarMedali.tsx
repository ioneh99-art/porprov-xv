'use client'
// src/components/konida/LayarMedali.tsx
// Mode layar War Room untuk videotron / command center: perolehan medali dari
// laporan lapangan yang sudah disahkan, medali terbaru, dan capaian target emas.
// Ukuran huruf mengikuti lebar layar (vw) supaya terbaca dari jauh di layar apa pun.

import { useCallback, useEffect, useRef, useState } from 'react'
import { ambilRekapLapangan, type RekapLapangan } from '@/lib/lapor-klien'

const WARNA = { emas: '#ffd700', perak: '#d7dde5', perunggu: '#d08a4a' } as const
const JEDA_SEGAR_MS = 15_000

function Jam() {
  const [t, setT] = useState('')
  useEffect(() => {
    const tulis = () => setT(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }))
    tulis(); const iv = setInterval(tulis, 1000); return () => clearInterval(iv)
  }, [])
  return <span className="tabular-nums font-mono">{t}</span>
}

const jam = (ts: string) => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
const tanggalPanjang = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export default function LayarMedali({ kontingenId, onTutup }: { kontingenId: number; onTutup: () => void }) {
  const [data, setData] = useState<RekapLapangan | null>(null)
  const [galat, setGalat] = useState('')
  const wadah = useRef<HTMLDivElement>(null)

  const muat = useCallback(async () => {
    const h = await ambilRekapLapangan(kontingenId)
    if (h.ok) { setData(h.data); setGalat('') }
    // Angka terakhir tetap dipajang; yang berubah hanya peringatannya.
    else setGalat(h.status === 401 ? 'Sesi login habis. Angka di layar tidak lagi diperbarui — login ulang di komputer ini.' : `Sambungan terputus (${h.pesan}). Mencoba lagi…`)
  }, [kontingenId])

  useEffect(() => { muat(); const iv = setInterval(muat, JEDA_SEGAR_MS); return () => clearInterval(iv) }, [muat])
  useEffect(() => {
    const tekan = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.fullscreenElement) onTutup() }
    window.addEventListener('keydown', tekan); return () => window.removeEventListener('keydown', tekan)
  }, [onTutup])

  const layarPenuh = () => { document.fullscreenElement ? document.exitFullscreen() : wadah.current?.requestFullscreen?.() }

  const r = data?.rekap
  const t = data?.target
  const persenKoni = t && t.emas_koni > 0 && r ? Math.min(100, Math.round((r.emas / t.emas_koni) * 100)) : 0
  const cabor = (data?.per_cabor ?? []).filter(c => c.emas + c.perak + c.perunggu > 0).slice(0, 8)

  return (
    <div ref={wadah} className="fixed inset-0 z-[1000] overflow-hidden text-white flex flex-col"
      style={{ background: 'radial-gradient(ellipse at top, #0b2545 0%, #050d1c 60%, #02060f 100%)', padding: '1.6vw 2vw' }}>

      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="font-black uppercase tracking-[0.25em] text-sky-300" style={{ fontSize: '1vw' }}>PORPROV XV Jawa Barat 2026</div>
          <div className="font-black leading-none mt-[0.4vw]" style={{ fontSize: '3vw' }}>{data?.kontingen ? `KONTINGEN ${data.kontingen}` : 'PEROLEHAN MEDALI'}</div>
        </div>
        <div className="text-right">
          <div className="font-black text-sky-300 leading-none" style={{ fontSize: '2.6vw' }}><Jam /></div>
          <div className="text-slate-300 mt-[0.4vw]" style={{ fontSize: '1.1vw' }}>
            {data ? `${data.hari_ini.hari_ke ? `Hari ke-${data.hari_ini.hari_ke} · ` : ''}${tanggalPanjang(data.hari_ini.tanggal)}` : ''}
          </div>
        </div>
      </div>

      {galat && <div role="alert" className="mt-[1vw] rounded-xl bg-red-600/90 font-bold text-center" style={{ fontSize: '1.3vw', padding: '0.6vw 1vw' }}>{galat}</div>}

      <div className="flex-1 min-h-0 grid gap-[1.6vw] mt-[1.4vw]" style={{ gridTemplateColumns: '1.15fr 1fr' }}>
        <div className="flex flex-col gap-[1.2vw] min-h-0">
          <div className="grid grid-cols-3 gap-[1.2vw]">
            {(['emas', 'perak', 'perunggu'] as const).map(m => (
              <div key={m} className="rounded-[1.2vw] text-center" style={{ background: `${WARNA[m]}14`, border: `0.15vw solid ${WARNA[m]}66`, padding: '1.2vw 0.6vw' }}>
                <div className="font-black leading-none tabular-nums" style={{ fontSize: '9vw', color: WARNA[m], textShadow: `0 0 3vw ${WARNA[m]}55` }}>{r ? r[m] : '–'}</div>
                <div className="font-black uppercase tracking-[0.2em]" style={{ fontSize: '1.5vw', color: WARNA[m] }}>{m}</div>
              </div>
            ))}
          </div>

          <div className="rounded-[1.2vw] bg-white/5 border border-white/10 flex items-center justify-between" style={{ padding: '1vw 1.6vw' }}>
            <div>
              <div className="uppercase tracking-[0.2em] text-slate-400 font-bold" style={{ fontSize: '1vw' }}>Total medali</div>
              <div className="font-black leading-none tabular-nums" style={{ fontSize: '4.4vw' }}>{r ? r.total : '–'}</div>
            </div>
            <div className="text-right">
              <div className="uppercase tracking-[0.2em] text-slate-400 font-bold" style={{ fontSize: '1vw' }}>Hari ini</div>
              <div className="font-black tabular-nums" style={{ fontSize: '2.2vw' }}>
                <span style={{ color: WARNA.emas }}>{data?.hari_ini.rekap.emas ?? 0}</span>
                <span className="text-slate-500"> · </span><span style={{ color: WARNA.perak }}>{data?.hari_ini.rekap.perak ?? 0}</span>
                <span className="text-slate-500"> · </span><span style={{ color: WARNA.perunggu }}>{data?.hari_ini.rekap.perunggu ?? 0}</span>
              </div>
            </div>
          </div>

          {t?.ada && t.emas_koni > 0 && (
            <div className="rounded-[1.2vw] bg-white/5 border border-white/10" style={{ padding: '1vw 1.6vw' }}>
              <div className="flex items-baseline justify-between">
                <div className="uppercase tracking-[0.2em] text-slate-400 font-bold" style={{ fontSize: '1vw' }}>Target emas KONI</div>
                <div className="font-black tabular-nums" style={{ fontSize: '2vw' }}>
                  <span style={{ color: WARNA.emas }}>{r?.emas ?? 0}</span><span className="text-slate-400"> / {t.emas_koni}</span>
                </div>
              </div>
              <div className="rounded-full overflow-hidden bg-white/10 mt-[0.6vw]" style={{ height: '1.1vw' }}>
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${persenKoni}%`, background: `linear-gradient(90deg, #b8860b, ${WARNA.emas})` }} />
              </div>
              <div className="text-slate-400 mt-[0.5vw]" style={{ fontSize: '0.95vw' }}>{persenKoni}% tercapai · target cabor {t.emas_cabor} emas</div>
            </div>
          )}

          {cabor.length > 0 && (
            <div className="rounded-[1.2vw] bg-white/5 border border-white/10 flex-1 min-h-0 overflow-hidden" style={{ padding: '0.9vw 1.6vw' }}>
              <div className="uppercase tracking-[0.2em] text-slate-400 font-bold" style={{ fontSize: '1vw' }}>Penyumbang medali</div>
              <div className="grid grid-cols-2 gap-x-[2vw] mt-[0.4vw]">
                {cabor.map(c => (
                  <div key={c.cabor_id} className="flex items-center justify-between border-b border-white/5" style={{ fontSize: '1.25vw', padding: '0.35vw 0' }}>
                    <span className="font-bold truncate">{c.cabor}</span>
                    <span className="font-mono font-black tabular-nums shrink-0 ml-[1vw]">
                      <span style={{ color: WARNA.emas }}>{c.emas}</span> <span style={{ color: WARNA.perak }}>{c.perak}</span> <span style={{ color: WARNA.perunggu }}>{c.perunggu}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[1.2vw] bg-white/5 border border-white/10 flex flex-col min-h-0" style={{ padding: '1.2vw 1.6vw' }}>
          <div className="uppercase tracking-[0.2em] text-slate-400 font-bold" style={{ fontSize: '1vw' }}>Medali terbaru</div>
          <div className="flex-1 min-h-0 overflow-hidden mt-[0.6vw]">
            {data && data.medali_terbaru.length === 0 && (
              <div className="h-full flex items-center justify-center text-center text-slate-400" style={{ fontSize: '1.6vw' }}>
                Belum ada medali yang disahkan.<br />Hasil pertama akan muncul di sini.
              </div>
            )}
            {(data?.medali_terbaru ?? []).slice(0, 7).map(m => (
              <div key={m.id} className="flex items-center gap-[1.2vw] border-b border-white/5" style={{ padding: '0.75vw 0' }}>
                {/* Lencana lonjong: kata "PERUNGGU" tidak muat di lingkaran. */}
                <div className="shrink-0 rounded-full flex items-center justify-center font-black text-slate-950 uppercase tracking-wide"
                  style={{ width: '7.6vw', height: '2.8vw', fontSize: '1vw', background: WARNA[m.hasil], boxShadow: `0 0 1.6vw ${WARNA[m.hasil]}66` }}>{m.hasil}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-black leading-tight truncate" style={{ fontSize: '1.7vw' }}>{m.atlet.length > 2 ? `${m.atlet[0]} dkk. (${m.atlet.length} atlet)` : m.atlet.join(' & ')}</div>
                  <div className="text-slate-300 truncate" style={{ fontSize: '1.15vw' }}>{m.cabor} · {m.nomor}{m.nilai ? ` · ${m.nilai}` : ''}</div>
                </div>
                <div className="shrink-0 text-slate-400 font-mono tabular-nums" style={{ fontSize: '1.05vw' }}>{jam(m.waktu)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-slate-500 mt-[0.8vw]" style={{ fontSize: '0.85vw' }}>
        <span>Sumber: laporan PIC cabor yang telah disahkan KONI Kabupaten Bandung{data ? ` · diperbarui ${jam(data.diperbarui)}` : ''}</span>
        <span className="flex gap-[0.6vw]">
          <button onClick={layarPenuh} className="rounded border border-white/20 text-slate-300" style={{ padding: '0.25vw 0.8vw' }}>Layar penuh</button>
          <button onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); onTutup() }} className="rounded border border-white/20 text-slate-300" style={{ padding: '0.25vw 0.8vw' }}>Tutup</button>
        </span>
      </div>
    </div>
  )
}
