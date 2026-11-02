'use client'
// HeadToHead — atlet target emas kita VS lawannya:
//  🔴 Lawan pasti   : dari bagan situs panitia (setelah undian), dengan skor & klasemen grup
//  🟠 Pesaing utama : dari File B KONI (kontingen/nama + catatan analisis)
//  ⚪ Calon lawan   : peserta kontingen lain di cabor & putra/putri yang sama (foto dari situs panitia)

import { useCallback, useEffect, useState } from 'react'
import { Swords, ExternalLink, RefreshCw } from 'lucide-react'
import type { CalonKontingen, GrupKita, LawanPasti } from '@/lib/head-to-head'
import { tglPanjangWR } from '@/lib/warroom-klien'

export interface TargetH2H {
  urutan: number; tanggal: string; cabor: string; cabor_id: number | null; nomor: string | null; kota: string | null; gender: 'L' | 'P' | null
  wajah: { nama: string; foto: string | null; atlet_id: number | null }[]
  bagan: { ref: number; nama: string; url: string; dibaca_at: string } | null
  lawan_pasti: LawanPasti[]; grup: GrupKita | null
  pesaing: string | null; analisis: string[]; kontingen_disebut: string[]
  calon_jumlah: number; calon_kontingen: number; calon: CalonKontingen[]
}
export interface DataH2H { sinkron: { terakhir: string | null; ringkas: any; peserta: number; bagan: number }; target: TargetH2H[] }

const Q = '?kontingen_id=4'
const EMAS = '#ffd700', MERAH = '#f87171', JINGGA = '#fb923c', HIJAU = '#34d399'
const judul = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
const inisial = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase()

/** Muat ringkasan/rincian H2H; sekali muat juga meminta server menarik data situs bila sudah basi (server yang menahan jeda). */
export function useHeadToHead(urutan?: number) {
  const [data, setData] = useState<DataH2H | null>(null)
  const [galat, setGalat] = useState('')
  const [menarik, setMenarik] = useState(false)
  const muat = useCallback(async () => {
    const r = await fetch(`/api/konida/head-to-head${Q}${urutan ? `&urutan=${urutan}` : ''}`, { cache: 'no-store' }).catch(() => null)
    if (!r) { setGalat('Tidak ada sambungan.'); return }
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { setGalat(j.error ?? 'Gagal memuat.'); return }
    setGalat(''); setData(j)
  }, [urutan])
  const tarik = useCallback(async (paksa: boolean) => {
    setMenarik(true)
    try { await fetch(`/api/konida/head-to-head${Q}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paksa }) }) }
    finally { setMenarik(false); await muat() }
  }, [muat])
  useEffect(() => { muat(); if (!urutan) tarik(false) }, [muat, tarik, urutan])
  return { data, galat, menarik, muat, tarik }
}

function Foto({ nama, foto, px, warna }: { nama: string; foto: string | null; px: number; warna: string }) {
  return foto
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={foto} alt="" loading="lazy" referrerPolicy="no-referrer" className="rounded-full object-cover shrink-0" style={{ width: px, height: px, border: `2px solid ${warna}` }} />
    : <div className="rounded-full grid place-items-center font-black shrink-0" style={{ width: px, height: px, border: `2px solid ${warna}`, color: warna, fontSize: px * 0.36, background: 'rgba(255,255,255,0.04)' }}>{inisial(nama)}</div>
}

/** Ringkasan satu baris untuk daftar/kalender. */
export function RingkasLawan({ t }: { t: TargetH2H }) {
  const sudah = t.lawan_pasti.filter(l => l.status === 'selesai')
  const menang = sudah.filter(l => l.hasil === 'menang').length
  if (t.lawan_pasti.length) return (
    <span className="text-[11px]"><b style={{ color: MERAH }}>● {t.lawan_pasti.length} lawan pasti</b>
      {sudah.length ? <span className="text-zinc-400"> · {menang}–{sudah.length - menang}</span> : null}
      {t.grup ? <span className="text-zinc-400"> · {t.grup.nama} #{t.grup.posisi}/{t.grup.jumlah}</span> : null}</span>
  )
  return (
    <span className="text-[11px] text-zinc-400">
      {t.kontingen_disebut.length ? <b style={{ color: JINGGA }}>{t.kontingen_disebut.join(', ')} · </b> : null}
      {t.calon_jumlah ? `${t.calon_jumlah} calon lawan dari ${t.calon_kontingen} kontingen` : 'Peserta belum terbaca'}
    </span>
  )
}

export default function PanelHeadToHead({ urutan, onTutup }: { urutan: number; onTutup?: () => void }) {
  const { data, galat } = useHeadToHead(urutan)
  const t = data?.target[0]
  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(2,10,20,0.92)', border: '1px solid rgba(248,113,113,0.3)' }}>
      <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-white/10" style={{ background: 'linear-gradient(90deg, rgba(248,113,113,0.12), transparent)' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-300"><Swords size={12} /> Head-to-Head target emas</div>
          {t && <div className="text-white font-black text-lg mt-0.5">{t.cabor} · {t.nomor ?? '—'}</div>}
          {t && <div className="text-[11px] text-zinc-400">{tglPanjangWR(t.tanggal)}{t.kota ? ` · ${t.kota}` : ''}</div>}
        </div>
        {onTutup && <button type="button" onClick={onTutup} className="text-xs font-bold text-zinc-300 border border-white/15 rounded-lg px-3 py-1.5">Tutup</button>}
      </div>
      {galat && <div className="px-5 py-4 text-sm text-red-300">{galat}</div>}
      {!t && !galat && <div className="px-5 py-10 text-center text-sm text-zinc-400">Memuat lawan…</div>}
      {t && <IsiH2H t={t} terakhir={data?.sinkron.terakhir ?? null} />}
    </div>
  )
}

function IsiH2H({ t, terakhir }: { t: TargetH2H; terakhir: string | null }) {
  const wajah = t.wajah.length ? t.wajah : [{ nama: `Tim ${judul(t.cabor)}`, foto: null, atlet_id: null }]
  return (
    <div className="p-5 space-y-5">
      {/* Kita VS mereka */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex flex-col items-center text-center">
          <div className="flex -space-x-3">{wajah.slice(0, 4).map((w, i) => <Foto key={i} nama={w.nama} foto={w.foto} px={wajah.length > 1 ? 44 : 64} warna={EMAS} />)}</div>
          <div className="text-sm font-black text-white mt-2 line-clamp-2">{wajah.length > 1 ? `${judul(wajah[0].nama).split(' ')[0]} dkk.` : judul(wajah[0].nama)}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Kab. Bandung</div>
        </div>
        <div className="text-2xl font-black text-red-300 px-2">VS</div>
        <div className="flex flex-col items-center text-center">
          {t.lawan_pasti.length ? <>
            <div className="flex -space-x-3">{t.lawan_pasti.slice(0, 4).map((l, i) => <Foto key={i} nama={l.nama} foto={l.foto} px={44} warna={MERAH} />)}</div>
            <div className="text-sm font-black text-white mt-2">{t.lawan_pasti.length} lawan pasti</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-red-300">dari bagan panitia</div>
          </> : <>
            <div className="text-3xl font-black text-white">{t.calon_jumlah || '—'}</div>
            <div className="text-[11px] text-zinc-400">calon lawan · {t.calon_kontingen} kontingen</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t.bagan ? 'belum ditempatkan di bagan' : 'bagan belum dirilis'}</div>
          </>}
        </div>
      </div>

      {/* 🔴 Lawan pasti */}
      <section>
        <div className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: MERAH }}>● Lawan pasti {t.bagan ? <a href={t.bagan.url} target="_blank" rel="noopener" className="ml-1 normal-case font-bold text-zinc-400 underline underline-offset-2 inline-flex items-center gap-1">bagan panitia <ExternalLink size={10} /></a> : null}</div>
        {!t.bagan ? <p className="text-sm text-zinc-400">Panitia belum merilis bagan/undian nomor ini. Begitu dirilis, lawan pasti muncul di sini sendiri.</p>
          : !t.lawan_pasti.length ? <p className="text-sm text-zinc-400">Bagan sudah ada, tetapi Kab. Bandung belum ditempatkan di laga mana pun.</p>
          : <div className="space-y-1.5">
              {t.lawan_pasti.map((l, i) => {
                const w = l.hasil === 'menang' ? HIJAU : l.hasil === 'kalah' ? MERAH : '#94a3b8'
                return (
                  <a key={i} href={l.laga ? `https://porprov.konijabar.or.id/laga/${l.laga}` : t.bagan!.url} target="_blank" rel="noopener"
                    className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${w}33` }}>
                    <Foto nama={l.nama} foto={l.foto} px={34} warna={MERAH} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-white truncate">{l.nama}{l.nama !== l.kontingen ? <span className="text-zinc-400 font-bold"> · {l.kontingen}</span> : null}</div>
                      <div className="text-[11px] text-zinc-500 truncate">{l.meta || (l.status === 'jadwal' ? 'Terjadwal' : '')}</div>
                    </div>
                    {l.skor_kita != null && l.skor_lawan != null
                      ? <span className="text-sm font-black tabular-nums" style={{ color: w }}>{l.skor_kita}–{l.skor_lawan}</span>
                      : <span className="text-[10px] font-bold uppercase text-zinc-500">{l.status === 'live' ? '● live' : 'belum main'}</span>}
                  </a>
                )
              })}
            </div>}
        {t.grup && (
          <div className="mt-3 rounded-xl overflow-hidden border border-white/10">
            <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 bg-white/5">{t.grup.nama} · Kab. Bandung posisi {t.grup.posisi} dari {t.grup.jumlah}</div>
            {t.grup.klasemen.map((r, i) => (
              <div key={r.kontingen} className="flex items-center gap-2 px-3 py-1 text-xs" style={r.kontingen === 'Kab. Bandung' ? { background: 'rgba(56,189,248,0.12)' } : undefined}>
                <span className="w-4 text-zinc-500 tabular-nums">{i + 1}</span>
                <span className={`flex-1 ${r.kontingen === 'Kab. Bandung' ? 'text-sky-300 font-black' : 'text-zinc-200'}`}>{r.kontingen}</span>
                <span className="text-zinc-500 tabular-nums">{r.main} main</span>
                <span className="w-8 text-right font-black text-white tabular-nums">{r.poin}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 🟠 Pesaing utama (File B) */}
      <section>
        <div className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: JINGGA }}>● Pesaing utama menurut analisis KONI</div>
        {!t.pesaing && !t.analisis.length ? <p className="text-sm text-zinc-400">File B tidak mencatat pesaing untuk target ini.</p> : <>
          {t.pesaing && <p className="text-sm text-white font-bold">{t.pesaing}</p>}
          {t.kontingen_disebut.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{t.kontingen_disebut.map(k => <span key={k} className="text-[11px] font-bold rounded-full px-2 py-0.5" style={{ color: JINGGA, background: `${JINGGA}18`, border: `1px solid ${JINGGA}55` }}>{k}</span>)}</div>}
          {t.analisis.map((a, i) => <p key={i} className="text-xs text-zinc-300 mt-2 whitespace-pre-line rounded-lg bg-white/5 px-3 py-2">{a}</p>)}
        </>}
      </section>

      {/* ⚪ Calon lawan */}
      <section>
        <div className="text-[11px] font-black uppercase tracking-widest mb-2 text-zinc-300">● Calon lawan · {t.calon_jumlah} atlet dari {t.calon_kontingen} kontingen <span className="normal-case font-normal text-zinc-500">({t.gender === 'L' ? 'putra' : t.gender === 'P' ? 'putri' : 'putra & putri'}, cabor {t.cabor})</span></div>
        {!t.calon.length ? <p className="text-sm text-zinc-400">Peserta cabor ini belum terbaca dari situs panitia.</p>
          : <div className="space-y-2">
              {t.calon.map(c => (
                <div key={c.kontingen} className="rounded-xl px-3 py-2" style={{ background: c.disebut ? `${JINGGA}12` : 'rgba(255,255,255,0.03)', border: `1px solid ${c.disebut ? `${JINGGA}55` : 'rgba(255,255,255,0.08)'}` }}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-black text-white">{c.kontingen}{c.disebut && <span className="ml-2 text-[10px] font-black uppercase" style={{ color: JINGGA }}>disebut KONI</span>}</span>
                    <span className="text-[11px] text-zinc-400">{c.jumlah} atlet</span>
                  </div>
                  {c.atlet.length > 0 && <div className="flex flex-wrap gap-2 mt-2">
                    {c.atlet.map(a => (
                      <a key={a.slug} href={`https://porprov.konijabar.or.id/atlet/${a.slug}`} target="_blank" rel="noopener" title={a.nama}
                        className="flex items-center gap-1.5 rounded-full pr-2 py-0.5 text-[11px]" style={{ background: a.disebut ? `${JINGGA}25` : 'rgba(255,255,255,0.04)', border: a.disebut ? `1px solid ${JINGGA}` : '1px solid transparent' }}>
                        <Foto nama={a.nama} foto={a.foto} px={24} warna={a.disebut ? JINGGA : '#475569'} />
                        <span className={`truncate max-w-[120px] ${a.disebut ? 'text-white font-bold' : 'text-zinc-300'}`}>{judul(a.nama)}</span>
                      </a>
                    ))}
                    {c.jumlah > c.atlet.length && <span className="text-[11px] text-zinc-500 self-center">+{c.jumlah - c.atlet.length} lagi</span>}
                  </div>}
                </div>
              ))}
            </div>}
        <p className="text-[10px] text-zinc-500 mt-2">Situs panitia belum menyebut nomor tiap atlet, jadi calon lawan = semua peserta cabor & putra/putri yang sama sampai bagan dirilis.</p>
      </section>
      <div className="flex items-center justify-between text-[10px] text-zinc-500 border-t border-white/10 pt-3">
        <span>Sumber: porprov.konijabar.or.id · File B KONI Kab. Bandung</span>
        <span className="inline-flex items-center gap-1"><RefreshCw size={10} /> {terakhir ? new Date(terakhir).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'belum ditarik'}</span>
      </div>
    </div>
  )
}
