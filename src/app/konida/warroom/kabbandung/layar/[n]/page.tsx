'use client'
// src/app/konida/warroom/kabbandung/layar/[n]/page.tsx
// Command Center — 3 monitor landscape, masing-masing membuka satu alamat:
//   /konida/warroom/kabbandung/layar/1  Posisi kita (peringkat, medali, target 74, klasemen)
//   /konida/warroom/kabbandung/layar/2  Hari ini, sekarang (sedang main, berikutnya, misi emas, hasil terbaru)
//   /konida/warroom/kabbandung/layar/3  Sebaran dan wajah (peta kota, peraih medali, medali per cabor)
// Data sama dengan War Room (segar tiap 20 dtk); Detik Emas tampil di ketiganya.
// Mode Kunjungan (dinyalakan dari War Room → Command Center, mis. lewat HP):
// huruf lebih besar, ucapan selamat datang, dan data internal disembunyikan.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { timpaKlasemen } from '@/lib/lapor'
import { ambilRekapLapangan, type RekapLapangan } from '@/lib/lapor-klien'
import { peringkatKontingen } from '@/lib/warroom'
import { useWarRoom, tglPanjangWR } from '@/lib/warroom-klien'
import { LAYAR, kalimatRingkas, nomorLayar, papanKlasemen, persenTarget, selisihTetangga } from '@/lib/command-center'
import DetikEmas from '@/components/konida/warroom/DetikEmas'
import MisiEmas from '@/components/konida/warroom/MisiEmas'
import ArenaLive from '@/components/konida/warroom/ArenaLive'
import PetaPerjuangan from '@/components/konida/warroom/PetaPerjuangan'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const K_ID = 4, NAMA = 'KAB. BANDUNG', Q = `?kontingen_id=${K_ID}`
const ACCENT = '#38bdf8', EMAS = '#ffd700', PERAK = '#e2e8f0', PERUNGGU = '#e0a060'
const WARNA_HASIL: Record<string, string> = { emas: EMAS, perak: PERAK, perunggu: PERUNGGU, menang: '#22d3ee', lolos: '#34d399', kalah: '#fb923c', gugur: '#94a3b8', peringkat: ACCENT }

interface ModeCC { mode_kunjungan: boolean; sambutan: string }
type BarisK = { nama: string; emas: number; perak: number; perunggu: number; total: number }

/** Lebar acuan 1280px → skala komponen War Room yang dipakai ulang (1920px = 1,5×). */
function useSkala(kunjungan: boolean) {
  const [w, setW] = useState(1280)
  useEffect(() => { const f = () => setW(window.innerWidth); f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [])
  return Math.max(0.8, (w / 1280) * (kunjungan ? 1.12 : 1))
}

function Jam() {
  const [t, setT] = useState('')
  useEffect(() => {
    const f = () => setT(new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }))
    f(); const i = setInterval(f, 10_000); return () => clearInterval(i)
  }, [])
  return <span className="tabular-nums">{t}</span>
}

const nama = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

export default function LayarCommandCenter() {
  const params = useParams<{ n: string }>()
  const no = nomorLayar(params?.n) ?? 1
  const { data: wr } = useWarRoom(K_ID)
  const [rekap, setRekap] = useState<RekapLapangan | null>(null)
  const [klasemen, setKlasemen] = useState<BarisK[]>([])
  const [mode, setMode] = useState<ModeCC>({ mode_kunjungan: false, sambutan: '' })
  const [galat, setGalat] = useState('')
  const [kursor, setKursor] = useState(true)
  const kunjungan = mode.mode_kunjungan
  const skala = useSkala(kunjungan)

  const muat = useCallback(async () => {
    const lap = await ambilRekapLapangan(K_ID)
    if (!lap.ok) { setGalat(lap.status === 401 ? 'Sesi login habis — masuk lagi di komputer ini.' : lap.pesan); return }
    setGalat(''); setRekap(lap.data)
    const { data } = await sb.from('klasemen_medali').select('emas,perak,perunggu,total,kontingen(nama)').limit(40)
    const flat = ((data ?? []) as any[]).map(r => ({ nama: (r.kontingen as any)?.nama ?? '-', emas: r.emas ?? 0, perak: r.perak ?? 0, perunggu: r.perunggu ?? 0, total: r.total ?? 0 }))
    setKlasemen(lap.data.rekap.laga > 0 ? timpaKlasemen(flat, lap.data.rekap, NAMA) : flat)
  }, [])
  const muatMode = useCallback(async () => {
    const r = await fetch(`/api/konida/command-center${Q}`, { cache: 'no-store' }).catch(() => null)
    if (r?.ok) setMode(await r.json())
  }, [])

  useEffect(() => {
    muat(); muatMode()
    const a = setInterval(muat, 20_000), b = setInterval(muatMode, 8_000)
    // Layar 1 ikut menyuruh server membaca situs KONI Jabar (klasemen & hasil) — server menahan sendiri bila < 15 menit.
    const tarik = () => fetch(`/api/konida/konijabar${Q}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => {})
    if (no === 1) tarik()
    const c = no === 1 ? setInterval(tarik, 15 * 60_000) : null
    // Muat ulang sesekali supaya pembaruan aplikasi ikut terpasang (layar menyala seharian).
    const d = setTimeout(() => window.location.reload(), 4 * 3_600_000)
    return () => { clearInterval(a); clearInterval(b); if (c) clearInterval(c); clearTimeout(d) }
  }, [muat, muatMode, no])

  // Layar tidak tidur & kursor tersembunyi saat diam.
  useEffect(() => {
    let kunci: any = null
    const minta = async () => { try { kunci = await (navigator as any).wakeLock?.request('screen') } catch { /* tidak didukung */ } }
    minta(); const ulang = () => { if (document.visibilityState === 'visible') minta() }
    document.addEventListener('visibilitychange', ulang)
    let t: any; const gerak = () => { setKursor(true); clearTimeout(t); t = setTimeout(() => setKursor(false), 3000) }
    window.addEventListener('mousemove', gerak); gerak()
    const tombol = (e: KeyboardEvent) => { if (['1', '2', '3'].includes(e.key)) window.location.href = `/konida/warroom/kabbandung/layar/${e.key}` }
    window.addEventListener('keydown', tombol)
    return () => { document.removeEventListener('visibilitychange', ulang); window.removeEventListener('mousemove', gerak); window.removeEventListener('keydown', tombol); clearTimeout(t); try { kunci?.release() } catch { /* */ } }
  }, [])

  const info = LAYAR[no - 1]
  return (
    <div className="fixed inset-0 z-[1000] text-white overflow-hidden flex flex-col" style={{ background: 'radial-gradient(ellipse at top, #0a1a2e 0%, #030812 60%)', cursor: kursor ? 'auto' : 'none', fontSize: `${skala}rem` }}>
      {/* Kepala layar */}
      <header className="flex items-center justify-between px-[2vw] py-[1.2vh] border-b" style={{ borderColor: 'rgba(56,189,248,0.18)', background: 'rgba(2,8,18,0.7)' }}>
        <div className="flex items-baseline gap-[1vw]">
          <span className="font-black tracking-wide" style={{ fontSize: '1.6vw', color: ACCENT }}>KONI KAB. BANDUNG</span>
          <span className="text-slate-400 font-bold" style={{ fontSize: '1.1vw' }}>PORPROV XV Jawa Barat 2026</span>
        </div>
        <div className="font-black uppercase tracking-[0.2em]" style={{ fontSize: '1.3vw' }}>{info.judul}</div>
        <div className="flex items-baseline gap-[1vw]">
          <span className="text-slate-300 font-bold" style={{ fontSize: '1.1vw' }}>{wr?.hari_ke ? `Hari ke-${wr.hari_ke}` : wr ? 'Pra-PORPROV' : ''}{wr ? ` · ${tglPanjangWR(wr.hari_ini)}` : ''}</span>
          <span className="font-black" style={{ fontSize: '1.8vw', color: ACCENT }}><Jam /></span>
        </div>
      </header>

      {galat && <div className="px-[2vw] py-[1vh] bg-red-500/20 text-red-200 font-bold" style={{ fontSize: '1.1vw' }}>{galat}</div>}

      <main className="flex-1 min-h-0 px-[2vw] py-[2vh]">
        {no === 1 && <Layar1 wr={wr} rekap={rekap} klasemen={klasemen} kunjungan={kunjungan} />}
        {no === 2 && <Layar2 wr={wr} skala={skala} kunjungan={kunjungan} sambutan={mode.sambutan} />}
        {no === 3 && <Layar3 wr={wr} rekap={rekap} kunjungan={kunjungan} />}
      </main>

      {/* Penunjuk layar — hanya terlihat saat kursor digerakkan */}
      {kursor && (
        <div className="absolute bottom-[1vh] right-[1vw] flex gap-2 text-xs z-10">
          {[1, 2, 3].map(n => <a key={n} href={`/konida/warroom/kabbandung/layar/${n}`} className={`rounded px-2 py-1 border ${n === no ? 'bg-sky-500 text-slate-950 border-sky-400' : 'border-slate-600 text-slate-300 bg-slate-900/80'}`}>Layar {n}</a>)}
          <a href="/konida/warroom/kabbandung" className="rounded px-2 py-1 border border-slate-600 text-slate-300 bg-slate-900/80">Keluar</a>
        </div>
      )}
      <DetikEmas medali={rekap?.medali_semua} />
    </div>
  )
}

/* ─────────────── Layar 1 · Posisi kita ─────────────── */
function Layar1({ wr, rekap, klasemen, kunjungan }: { wr: ReturnType<typeof useWarRoom>['data']; rekap: RekapLapangan | null; klasemen: BarisK[]; kunjungan: boolean }) {
  const r = rekap?.rekap
  const target = wr?.target_emas || rekap?.target.emas_koni || 0
  const emas = r?.emas ?? 0
  const pct = persenTarget(emas, target)
  const peringkat = peringkatKontingen(klasemen, NAMA)
  const papan = useMemo(() => papanKlasemen(klasemen, NAMA, kunjungan ? 6 : 8), [klasemen, kunjungan])
  const tetangga = useMemo(() => selisihTetangga(klasemen, NAMA), [klasemen])
  const ringkas = kalimatRingkas({ hariKe: wr?.hari_ke ?? null, peringkat, jumlahKontingen: klasemen.length || 27, emas, target, besok: wr?.misi.besok ?? 0 })
  return (
    <div className="h-full grid grid-cols-[1fr_1.15fr] gap-[2vw]">
      <div className="flex flex-col gap-[2vh] min-h-0">
        <div className="rounded-[1.4vw] flex-1 flex flex-col items-center justify-center" style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.28)' }}>
          <div className="uppercase tracking-[0.3em] text-yellow-300/80 font-black" style={{ fontSize: '1.3vw' }}>Peringkat Kab. Bandung</div>
          <div className="font-black leading-none tabular-nums" style={{ fontSize: peringkat ? '13vw' : '7vw', color: EMAS, textShadow: '0 0 3vw rgba(255,215,0,.35)' }}>{peringkat ? `#${peringkat}` : '—'}</div>
          <div className="text-slate-300 font-bold" style={{ fontSize: '1.3vw' }}>{peringkat ? `dari ${klasemen.length || 27} kontingen` : 'Klasemen belum dimulai'}</div>
          <div className="flex gap-[3vw] mt-[2.5vh]">
            {([['Emas', r?.emas ?? 0, EMAS], ['Perak', r?.perak ?? 0, PERAK], ['Perunggu', r?.perunggu ?? 0, PERUNGGU]] as const).map(([l, v, w]) => (
              <div key={l} className="text-center">
                <div className="font-black tabular-nums leading-none" style={{ fontSize: '5vw', color: w }}>{v}</div>
                <div className="uppercase tracking-widest text-slate-400 font-bold mt-[0.6vh]" style={{ fontSize: '1vw' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[1.2vw] px-[1.6vw] py-[2vh]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-baseline justify-between">
            <span className="uppercase tracking-widest font-black text-yellow-300/90" style={{ fontSize: '1.1vw' }}>Menuju target emas</span>
            <span className="font-black tabular-nums" style={{ fontSize: '2.4vw' }}><span style={{ color: EMAS }}>{emas}</span><span className="text-slate-500"> / {target || '—'}</span></span>
          </div>
          <div className="rounded-full overflow-hidden bg-white/10 mt-[1.2vh]" style={{ height: '1.6vh' }}>
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#b8860b,#ffd700)' }} />
          </div>
          <div className="flex flex-wrap gap-[0.8vw] mt-[1.6vh]">
            {ringkas.map(t => <span key={t} className="rounded-full px-[1vw] py-[0.5vh] font-bold bg-sky-500/10 border border-sky-400/30 text-sky-100" style={{ fontSize: kunjungan ? '1.3vw' : '1.05vw' }}>{t}</span>)}
          </div>
        </div>
      </div>

      <div className="rounded-[1.4vw] flex flex-col min-h-0 overflow-hidden" style={{ background: 'rgba(2,10,20,0.6)', border: '1px solid rgba(56,189,248,0.2)' }}>
        <div className="px-[1.6vw] py-[1.6vh] border-b border-white/10 flex items-baseline justify-between">
          <span className="uppercase tracking-[0.25em] font-black text-sky-300" style={{ fontSize: '1.2vw' }}>Klasemen medali</span>
          <span className="text-slate-500" style={{ fontSize: '0.9vw' }}>Resmi panitia · Kab. Bandung dari hasil yang disahkan</span>
        </div>
        {papan.length === 0 ? (
          <div className="flex-1 grid place-items-center text-center px-[2vw]">
            <div>
              <div className="font-black text-slate-300" style={{ fontSize: '2vw' }}>Klasemen belum dimulai</div>
              <div className="text-slate-500 mt-[1vh]" style={{ fontSize: '1.1vw' }}>Semua kontingen masih 0 medali. Upacara pembukaan Sabtu, 7 November 2026.</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-around px-[1vw] py-[1vh]">
            {papan.map(b => (
              <div key={b.nama} className="flex items-center gap-[1vw] rounded-[0.8vw] px-[1vw] py-[0.8vh]" style={b.kita ? { background: 'rgba(56,189,248,0.14)', border: '1px solid rgba(56,189,248,0.5)' } : undefined}>
                <span className="w-[3.5vw] text-center font-black tabular-nums" style={{ fontSize: '1.9vw', color: b.peringkat <= 3 ? [EMAS, PERAK, PERUNGGU][b.peringkat - 1] : '#94a3b8' }}>{b.peringkat}</span>
                <span className="flex-1 font-black truncate" style={{ fontSize: '1.7vw', color: b.kita ? ACCENT : '#f1f5f9' }}>{nama(b.nama)}</span>
                {([b.emas, b.perak, b.perunggu] as const).map((v, i) => <span key={i} className="w-[4.5vw] text-right font-black tabular-nums" style={{ fontSize: '1.9vw', color: [EMAS, PERAK, PERUNGGU][i] }}>{v}</span>)}
              </div>
            ))}
          </div>
        )}
        {(tetangga.atas || tetangga.bawah) && (
          <div className="grid grid-cols-2 border-t border-white/10" style={{ fontSize: '1.1vw' }}>
            <div className="px-[1.6vw] py-[1.4vh]">{tetangga.atas ? <>Kejar <b className="text-white">{nama(tetangga.atas.nama)}</b>: <b className="text-amber-300">{tetangga.atas.emas} emas</b> lagi</> : <b className="text-yellow-300">Puncak klasemen</b>}</div>
            <div className="px-[1.6vw] py-[1.4vh] border-l border-white/10">{tetangga.bawah ? <>Unggul dari <b className="text-white">{nama(tetangga.bawah.nama)}</b>: <b className="text-emerald-300">{tetangga.bawah.emas} emas</b></> : ''}</div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────── Layar 2 · Hari ini, sekarang ─────────────── */
function Layar2({ wr, skala, kunjungan, sambutan }: { wr: ReturnType<typeof useWarRoom>['data']; skala: number; kunjungan: boolean; sambutan: string }) {
  const hasil = wr?.hasil_terbaru ?? []
  const pita = hasil.map(h => `${h.cabor} · ${h.nomor} — ${h.label}${h.nilai ? ` ${h.nilai}` : ''}${h.lawan ? ` vs ${h.lawan}` : ''}`)
  return (
    <div className="h-full flex flex-col gap-[2vh]">
      {kunjungan && (
        <div className="rounded-[1.2vw] text-center py-[2vh] px-[2vw]" style={{ background: 'linear-gradient(90deg, rgba(255,215,0,0.12), rgba(56,189,248,0.12))', border: '1px solid rgba(255,215,0,0.35)' }}>
          <div className="font-black" style={{ fontSize: '2.6vw', color: EMAS }}>{sambutan}</div>
          <div className="text-slate-300 font-bold mt-[0.6vh]" style={{ fontSize: '1.2vw' }}>Pantauan langsung perjuangan atlet Kabupaten Bandung di PORPROV XV · BEDAS!</div>
        </div>
      )}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-[1.5vw]">
        {/* Komponen War Room dipakai ulang lalu diperbesar: dari jauh hurufnya harus tetap terbaca. */}
        <div className="min-h-0 overflow-hidden" style={{ zoom: skala * (kunjungan ? 1.1 : 1.25) }}><ArenaLive data={wr} /></div>
        <div className="min-h-0 overflow-hidden" style={{ zoom: skala * (kunjungan ? 1.1 : 1.25) }}><MisiEmas data={wr} accent={ACCENT} /></div>
      </div>
      <div className="rounded-[1vw] overflow-hidden flex items-stretch" style={{ background: 'rgba(2,10,20,0.75)', border: '1px solid rgba(56,189,248,0.25)' }}>
        <span className="shrink-0 px-[1.2vw] flex items-center font-black uppercase tracking-widest bg-sky-500 text-slate-950" style={{ fontSize: '1vw' }}>Hasil terbaru</span>
        <div className="flex-1 overflow-hidden py-[1.2vh]">
          {pita.length === 0
            ? <span className="px-[1.5vw] text-slate-400" style={{ fontSize: '1.3vw' }}>Hasil yang sudah disahkan KONI Kab. Bandung akan berjalan di sini.</span>
            : <div className="whitespace-nowrap inline-block font-bold" style={{ fontSize: '1.5vw', animation: `cc-pita ${Math.max(30, pita.length * 9)}s linear infinite` }}>
                {[...pita, ...pita].map((t, i) => <span key={i} className="mx-[2vw]" style={{ color: WARNA_HASIL[hasil[i % hasil.length].hasil] ?? '#fff' }}>● <span className="text-white">{t}</span></span>)}
              </div>}
        </div>
      </div>
      <style>{`@keyframes cc-pita{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
    </div>
  )
}

/* ─────────────── Layar 3 · Sebaran dan wajah ─────────────── */
function Layar3({ wr, rekap, kunjungan }: { wr: ReturnType<typeof useWarRoom>['data']; rekap: RekapLapangan | null; kunjungan: boolean }) {
  const kotak = useRef<HTMLDivElement>(null)
  const [tinggi, setTinggi] = useState(500)
  useEffect(() => {
    const f = () => { if (kotak.current) setTinggi(kotak.current.clientHeight) }
    f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f)
  }, [])
  const sorot = wr?.sorotan ?? []
  const perCabor = (rekap?.per_cabor ?? []).filter(c => c.emas + c.perak + c.perunggu > 0).slice(0, 8)
  const op = wr?.operasi
  return (
    <div className="h-full grid grid-cols-[1.35fr_1fr] gap-[2vw]">
      <div ref={kotak} className="min-h-0 relative">
        <PetaPerjuangan data={wr} accent={ACCENT} tinggi={tinggi} />
        {/* Daftar kota besar di atas peta — judul bawaan peta terlalu kecil untuk dibaca dari jauh. */}
        {wr && (
          <div className="absolute right-[1vw] bottom-[3vh] z-[600] rounded-[1vw] px-[1.2vw] py-[1.2vh] max-w-[70%]" style={{ background: 'rgba(2,8,18,0.85)', border: '1px solid rgba(56,189,248,0.35)' }}>
            <div className="uppercase tracking-[0.2em] font-black text-sky-300" style={{ fontSize: '1vw' }}>
              {wr.peta.hari_ini ? 'Bertanding hari ini' : `Bertanding berikutnya · ${tglPanjangWR(wr.peta.tanggal)}`}
            </div>
            {wr.peta.kota.length === 0
              ? <div className="text-slate-400 mt-[0.6vh]" style={{ fontSize: '1.1vw' }}>Tidak ada kegiatan cabor kita.</div>
              : wr.peta.kota.slice(0, 6).map(k => (
                  <div key={k.label} className="flex items-baseline gap-[0.8vw] mt-[0.5vh]" style={{ fontSize: '1.3vw' }}>
                    <span className="font-black text-white">{k.label}</span>
                    <span className="text-slate-400">{k.kegiatan.length} kegiatan</span>
                    {k.live > 0 && <span className="font-black text-red-400">● LIVE</span>}
                  </div>
                ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-[2vh] min-h-0">
        <div className="rounded-[1.2vw] flex-[1.4] min-h-0 overflow-hidden flex flex-col" style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.25)' }}>
          <div className="px-[1.4vw] py-[1.4vh] uppercase tracking-[0.25em] font-black text-yellow-300" style={{ fontSize: '1.1vw' }}>Peraih medali terbaru</div>
          {sorot.length === 0 ? (
            <div className="flex-1 grid place-items-center text-center px-[2vw] text-slate-400" style={{ fontSize: '1.2vw' }}>Wajah atlet peraih medali tampil di sini begitu hasilnya disahkan.</div>
          ) : (
            <div className="flex-1 grid grid-cols-2 gap-[1vw] px-[1.2vw] pb-[1.4vh] min-h-0">
              {sorot.slice(0, 4).map(s => {
                const w = s.hasil === 'emas' ? EMAS : s.hasil === 'perak' ? PERAK : PERUNGGU
                return (
                  <div key={s.id} className="rounded-[1vw] flex items-center gap-[1vw] px-[1vw] min-h-0" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${w}55` }}>
                    {s.foto
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={s.foto} alt="" className="rounded-full object-cover shrink-0" style={{ width: '6vw', height: '6vw', border: `0.25vw solid ${w}` }} />
                      : <div className="rounded-full shrink-0 grid place-items-center font-black" style={{ width: '6vw', height: '6vw', border: `0.25vw solid ${w}`, color: w, fontSize: '2vw' }}>{(s.atlet[0] ?? s.cabor).split(' ').slice(0, 2).map(x => x[0]).join('')}</div>}
                    <div className="min-w-0">
                      <div className="font-black uppercase tracking-widest" style={{ fontSize: '0.9vw', color: w }}>{s.hasil}</div>
                      <div className="font-black text-white leading-tight line-clamp-2" style={{ fontSize: '1.3vw' }}>{s.atlet.length ? (s.atlet.length <= 2 ? s.atlet.join(', ') : `${s.atlet[0]} dkk.`) : s.cabor}</div>
                      <div className="text-slate-400 truncate" style={{ fontSize: '0.95vw' }}>{s.cabor} · {s.nomor}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="rounded-[1.2vw] flex-1 min-h-0 overflow-hidden" style={{ background: 'rgba(2,10,20,0.6)', border: '1px solid rgba(56,189,248,0.2)' }}>
          <div className="px-[1.4vw] py-[1.4vh] uppercase tracking-[0.25em] font-black text-sky-300" style={{ fontSize: '1.1vw' }}>Medali per cabor</div>
          {perCabor.length === 0
            ? <div className="px-[1.4vw] text-slate-400" style={{ fontSize: '1.2vw' }}>Belum ada medali yang disahkan.</div>
            : <div className="grid grid-cols-2 gap-x-[1.5vw] gap-y-[0.6vh] px-[1.4vw]">
                {perCabor.map(c => (
                  <div key={c.cabor_id} className="flex items-center gap-[0.6vw]" style={{ fontSize: '1.2vw' }}>
                    <span className="flex-1 font-bold truncate">{c.cabor}</span>
                    <span className="font-black tabular-nums" style={{ color: EMAS }}>{c.emas}</span>
                    <span className="font-black tabular-nums" style={{ color: PERAK }}>{c.perak}</span>
                    <span className="font-black tabular-nums" style={{ color: PERUNGGU }}>{c.perunggu}</span>
                  </div>
                ))}
              </div>}
        </div>
        {/* Data internal — tidak tampil saat Mode Kunjungan */}
        {!kunjungan && op && (
          <div className="rounded-[0.8vw] px-[1.2vw] py-[1vh] text-slate-400 border border-white/10" style={{ fontSize: '0.95vw' }}>
            Operasi: <b className={op.menunggu ? 'text-amber-300' : 'text-slate-300'}>{op.menunggu} laporan menunggu disahkan</b> · <b className={op.catatan_baru ? 'text-amber-300' : 'text-slate-300'}>{op.catatan_baru} catatan lapangan baru</b>
          </div>
        )}
      </div>
    </div>
  )
}
