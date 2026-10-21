'use client'
// Tab "Jadwal Partai" di Kelola Jadwal: jadwal per partai yang diisi PIC cabor
// dari HP, KONIDA, atau matriks KONI. Langsung tampil di halaman publik.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { LABEL_STATUS_PARTAI, SARAN_BABAK, STATUS_PARTAI, WARNA_STATUS_PARTAI, type Partai, type StatusPartai } from '@/lib/jadwal-partai'
import { tanggalWIB } from '@/lib/lapor'

const Q = '?kontingen_id=4'   // hanya dibaca admin pusat; KONIDA memakai kontingen dari sesinya
const kotak = 'w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400'
const kartu = 'rounded-xl border border-slate-800 bg-slate-900/60'
const LABEL_SUMBER: Record<string, string> = { pic: 'PIC', konida: 'KONIDA', matriks: 'Matriks' }
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const tgl = (t: string) => `${Number(t.slice(8))} ${BULAN[Number(t.slice(5, 7)) - 1]}`

type Baris = Partai & { diubah_oleh: string | null }
interface Isian { cabor_id: string; tanggal: string; jam: string; nomor_teks: string; babak: string; lawan: string; venue: string; status: StatusPartai; keterangan: string }

export default function KelolaPartai() {
  const [partai, setPartai] = useState<Baris[]>([])
  const [atlet, setAtlet] = useState<Record<string, string>>({})
  const [cabor, setCabor] = useState<{ id: number; nama: string }[]>([])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [pesan, setPesan] = useState('')
  const [saringCabor, setSaringCabor] = useState('')
  const [saringTgl, setSaringTgl] = useState<'mendatang' | 'semua' | string>('mendatang')
  const [ubah, setUbah] = useState<{ id: number | null; isi: Isian } | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const hariIni = tanggalWIB()

  const muat = useCallback(async () => {
    setMemuat(true); setGalat('')
    try {
      const r = await fetch('/api/konida/jadwal-partai' + Q, { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Gagal memuat jadwal partai.')
      setPartai(d.partai); setAtlet(d.atlet); setCabor(d.cabor)
    } catch (e: any) { setGalat(e.message) } finally { setMemuat(false) }
  }, [])
  useEffect(() => { muat() }, [muat])

  const namaCabor = useMemo(() => new Map(cabor.map(c => [c.id, c.nama])), [cabor])
  const tanggalAda = useMemo(() => Array.from(new Set(partai.map(p => p.tanggal))).sort(), [partai])
  const tampil = partai.filter(p =>
    (!saringCabor || String(p.cabor_id) === saringCabor) &&
    (saringTgl === 'semua' || (saringTgl === 'mendatang' ? p.tanggal >= hariIni : p.tanggal === saringTgl)))

  const kabar = (t: string) => { setPesan(t); setTimeout(() => setPesan(''), 4000) }
  async function kirim(metode: 'POST' | 'PATCH' | 'DELETE', isi?: any, id?: number) {
    setSibuk(true); setGalat('')
    try {
      const r = await fetch('/api/konida/jadwal-partai' + Q + (metode === 'DELETE' ? `&id=${id}` : ''), {
        method: metode, headers: { 'Content-Type': 'application/json' }, body: metode === 'DELETE' ? undefined : JSON.stringify(isi),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Gagal menyimpan.')
      return true
    } catch (e: any) { setGalat(e.message); return false } finally { setSibuk(false) }
  }
  const simpan = async () => {
    if (!ubah) return
    const i = ubah.isi
    const isi = { tanggal: i.tanggal, jam: i.jam, nomor_teks: i.nomor_teks, babak: i.babak, lawan: i.lawan, venue: i.venue, status: i.status, keterangan: i.keterangan }
    const ok = ubah.id ? await kirim('PATCH', { id: ubah.id, ...isi }) : await kirim('POST', { ...isi, cabor_id: Number(i.cabor_id) })
    if (ok) { setUbah(null); kabar('Tersimpan. Halaman publik ikut berubah.'); muat() }
  }
  const hapus = async () => {
    if (!ubah?.id || !confirm('Hapus jadwal partai ini dari halaman publik?')) return
    if (await kirim('DELETE', undefined, ubah.id)) { setUbah(null); kabar('Jadwal partai dihapus (isinya tersimpan di jejak audit).'); muat() }
  }
  const ganti = (k: keyof Isian, v: string) => setUbah(u => u ? { ...u, isi: { ...u.isi, [k]: v } } : u)

  return (
    <div>
      <p className="text-slate-400 text-sm mb-3 max-w-3xl">
        Jadwal per partai diisi PIC cabor dari HP (tab <b className="text-slate-200">Jadwal</b> di /lapor), oleh KONIDA di sini, atau dari kolom
        Jam/Nomor/Lawan berkas Matriks KONI. Semua langsung tampil di halaman publik, termasuk nama atlet.
      </p>
      {galat && <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{galat}</div>}
      {pesan && <div className="mb-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">{pesan}</div>}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select value={saringTgl} onChange={e => setSaringTgl(e.target.value)} className={`${kotak} max-w-[200px]`}>
          <option value="mendatang">Hari ini & mendatang</option>
          <option value="semua">Semua tanggal</option>
          {tanggalAda.map(t => <option key={t} value={t}>{tgl(t)}{t === hariIni ? ' (hari ini)' : ''}</option>)}
        </select>
        <select value={saringCabor} onChange={e => setSaringCabor(e.target.value)} className={`${kotak} max-w-[220px]`}>
          <option value="">Semua cabor</option>
          {cabor.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
        </select>
        <button onClick={() => setUbah({ id: null, isi: { cabor_id: saringCabor, tanggal: hariIni, jam: '', nomor_teks: '', babak: '', lawan: '', venue: '', status: 'terjadwal', keterangan: '' } })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500"><Plus size={14} /> Tambah partai</button>
        <button onClick={muat} className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"><RefreshCw size={12} className={memuat ? 'animate-spin' : ''} /> Muat ulang</button>
      </div>

      <div className={`${kartu} overflow-x-auto`}>
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <th className="px-3 py-2.5">Tanggal</th><th className="px-3 py-2.5">Cabor</th><th className="px-3 py-2.5">Nomor · babak</th>
              <th className="px-3 py-2.5">Lawan</th><th className="px-3 py-2.5">Venue</th><th className="px-3 py-2.5">Atlet</th>
              <th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {memuat && !partai.length && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">Memuat…</td></tr>}
            {!memuat && !tampil.length && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">Belum ada jadwal partai{saringTgl === 'mendatang' ? ' untuk hari ini dan seterusnya' : ''}.</td></tr>}
            {tampil.map(p => (
              <tr key={p.id} className="border-b border-slate-800/70 align-top">
                <td className="px-3 py-2.5 whitespace-nowrap"><div className="text-white font-semibold">{tgl(p.tanggal)}</div><div className="text-xs text-slate-400">{p.jam ?? 'jam ?'}</div></td>
                <td className="px-3 py-2.5 text-slate-300">{namaCabor.get(p.cabor_id) ?? p.cabor_id}</td>
                <td className="px-3 py-2.5"><div className="text-white">{p.nomor_teks}</div>{p.babak && <div className="text-xs text-slate-400">{p.babak}</div>}</td>
                <td className="px-3 py-2.5 text-slate-300">{p.lawan ?? '-'}</td>
                <td className="px-3 py-2.5 text-slate-300 max-w-[200px]">{p.venue ?? '-'}</td>
                <td className="px-3 py-2.5 text-slate-300 max-w-[220px] text-xs">{p.atlet_ids.map(id => atlet[id] ?? `#${id}`).join(', ') || '-'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className="text-xs font-semibold" style={{ color: WARNA_STATUS_PARTAI[p.status] }}>{LABEL_STATUS_PARTAI[p.status]}</div>
                  <div className="text-[10px] text-slate-500">{LABEL_SUMBER[p.sumber] ?? p.sumber}{p.diubah_oleh ? ` · ${p.diubah_oleh}` : ''}</div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button onClick={() => setUbah({ id: p.id, isi: { cabor_id: String(p.cabor_id), tanggal: p.tanggal, jam: p.jam ?? '', nomor_teks: p.nomor_teks, babak: p.babak ?? '', lawan: p.lawan ?? '', venue: p.venue ?? '', status: p.status, keterangan: p.keterangan ?? '' } })}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-xs hover:border-sky-400"><Pencil size={12} /> Ubah</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ubah && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !sibuk && setUbah(null)}>
          <div className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-950 p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-white font-semibold">{ubah.id ? 'Ubah jadwal partai' : 'Tambah jadwal partai'}</div>
              <button onClick={() => setUbah(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 text-xs text-slate-400">Cabor
                <select className={`${kotak} mt-1`} value={ubah.isi.cabor_id} disabled={!!ubah.id} onChange={e => ganti('cabor_id', e.target.value)}>
                  <option value="">Pilih cabor</option>
                  {cabor.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-400">Tanggal<input type="date" className={`${kotak} mt-1`} value={ubah.isi.tanggal} onChange={e => ganti('tanggal', e.target.value)} /></label>
              <label className="text-xs text-slate-400">Jam<input type="time" className={`${kotak} mt-1`} value={ubah.isi.jam} onChange={e => ganti('jam', e.target.value)} /></label>
              <label className="col-span-2 text-xs text-slate-400">Nomor pertandingan<input className={`${kotak} mt-1`} value={ubah.isi.nomor_teks} onChange={e => ganti('nomor_teks', e.target.value)} /></label>
              <label className="text-xs text-slate-400">Babak
                <input list="k-babak" className={`${kotak} mt-1`} value={ubah.isi.babak} onChange={e => ganti('babak', e.target.value)} />
                <datalist id="k-babak">{SARAN_BABAK.map(b => <option key={b} value={b} />)}</datalist>
              </label>
              <label className="text-xs text-slate-400">Lawan<input className={`${kotak} mt-1`} value={ubah.isi.lawan} onChange={e => ganti('lawan', e.target.value)} /></label>
              <label className="col-span-2 text-xs text-slate-400">Venue / lapangan<input className={`${kotak} mt-1`} value={ubah.isi.venue} onChange={e => ganti('venue', e.target.value)} /></label>
              <label className="text-xs text-slate-400">Status
                <select className={`${kotak} mt-1`} value={ubah.isi.status} onChange={e => ganti('status', e.target.value)}>
                  {STATUS_PARTAI.map(s => <option key={s} value={s}>{LABEL_STATUS_PARTAI[s]}</option>)}
                </select>
              </label>
              <div className="text-[11px] text-slate-500 self-end pb-2">Atlet dipilih PIC cabor dari HP.</div>
              <label className="col-span-2 text-xs text-slate-400">Keterangan<textarea rows={2} className={`${kotak} mt-1`} value={ubah.isi.keterangan} onChange={e => ganti('keterangan', e.target.value)} /></label>
            </div>
            <div className="flex items-center justify-between gap-2 mt-5">
              {ubah.id ? <button onClick={hapus} disabled={sibuk} className="inline-flex items-center gap-1 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"><Trash2 size={14} /> Hapus</button> : <span />}
              <div className="flex gap-2">
                <button onClick={() => setUbah(null)} disabled={sibuk} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Batal</button>
                <button onClick={simpan} disabled={sibuk || (!ubah.id && !ubah.isi.cabor_id)} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{sibuk ? 'Menyimpan…' : 'Simpan'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
