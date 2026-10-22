'use client'
// src/app/lapor/FormJadwal.tsx
// Jadwal partai dari HP PIC: hasil technical meeting/undian — tanggal, jam,
// nomor, babak, atlet, lawan, venue. Langsung tampil di halaman publik.

import { useMemo, useState } from 'react'
import { LABEL_STATUS_PARTAI, SARAN_BABAK, STATUS_PARTAI, WARNA_STATUS_PARTAI, type StatusPartai } from '@/lib/jadwal-partai'
import { tanggalWIB } from '@/lib/lapor'
import { DOMAIN_RESMI_KABBANDUNG } from '@/lib/alamat'

export interface PartaiSaya {
  id: number; tanggal: string; jam: string | null; nomor_teks: string; disiplin: string | null; nomor_resmi: string | null
  babak: string | null; atlet_ids: number[]; lawan: string | null; venue: string | null; status: StatusPartai
  keterangan: string | null; sumber: string; diubah_oleh: string | null; updated_at: string
}
export interface NomorJadwal { kunci: string; label: string; disiplin: string | null; nama: string; atlet_ids: number[] }
interface Kegiatan { nama: string; mulai: string | null; selesai: string | null; venue: string | null }

const kotak = 'w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3.5 text-base text-white placeholder-slate-500 focus:outline-none focus:border-sky-400'
const judulIsian = 'block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2'
const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const tglTampil = (t: string) => { const d = new Date(t + 'T00:00:00Z'); return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]}` }

interface Isian { tanggal: string; jam: string; nomorTeks: string; nomor: NomorJadwal | null; babak: string; atlet: number[]; lawan: string; venue: string; keterangan: string; status: StatusPartai }

export default function FormJadwal({ nomor, atlet, partai, kegiatan, muat, sesiHabis }: {
  nomor: NomorJadwal[]
  atlet: { id: number; nama: string }[]
  partai: PartaiSaya[]
  kegiatan: Kegiatan[]
  muat: () => Promise<boolean>
  sesiHabis: (pesan: string) => void
}) {
  const hariIni = tanggalWIB()
  const venueSaran = useMemo(() => Array.from(new Set(kegiatan.flatMap(k => (k.venue ?? '').split(/ \| | \/ /)).map(v => v.trim()).filter(Boolean))), [kegiatan])
  const awalKegiatan = kegiatan.map(k => k.mulai).filter((t): t is string => !!t).sort()[0]
  const kosong = (): Isian => ({
    tanggal: awalKegiatan && awalKegiatan > hariIni ? awalKegiatan : hariIni, jam: '', nomorTeks: '', nomor: null, babak: '',
    atlet: [], lawan: '', venue: venueSaran.length === 1 ? venueSaran[0] : '', keterangan: '', status: 'terjadwal',
  })

  const [buka, setBuka] = useState<{ id: number | null; isi: Isian } | null>(null)
  const [cariAtlet, setCariAtlet] = useState('')
  const [semuaAtlet, setSemuaAtlet] = useState(false)
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [kabar, setKabar] = useState('')
  const [lihatLama, setLihatLama] = useState(false)

  const namaAtlet = useMemo(() => new Map(atlet.map(a => [a.id, a.nama])), [atlet])
  const ganti = <K extends keyof Isian>(k: K, v: Isian[K]) => setBuka(b => b ? { ...b, isi: { ...b.isi, [k]: v } } : b)

  const saranNomor = useMemo(() => {
    if (!buka || buka.isi.nomor) return []
    const q = buka.isi.nomorTeks.trim().toLowerCase()
    return q ? nomor.filter(n => n.label.toLowerCase().includes(q)).slice(0, 8) : []
  }, [buka, nomor])
  const terdaftar = useMemo(() => new Set(buka?.isi.nomor?.atlet_ids ?? []), [buka])
  const atletTampil = useMemo(() => {
    const q = cariAtlet.trim().toLowerCase()
    if (q) return atlet.filter(a => a.nama.toLowerCase().includes(q))
    if (terdaftar.size > 0 && !semuaAtlet) return atlet.filter(a => terdaftar.has(a.id))
    return atlet
  }, [atlet, cariAtlet, terdaftar, semuaAtlet])

  const bukaBaru = () => { setBuka({ id: null, isi: kosong() }); setGalat(''); setCariAtlet(''); setSemuaAtlet(false) }
  const bukaUbah = (p: PartaiSaya) => {
    const n = p.disiplin ? nomor.find(x => x.disiplin === p.disiplin && x.nama === p.nomor_resmi) ?? null : null
    setBuka({ id: p.id, isi: {
      tanggal: p.tanggal, jam: p.jam ?? '', nomorTeks: n ? n.label : p.nomor_teks, nomor: n, babak: p.babak ?? '', atlet: p.atlet_ids,
      lawan: p.lawan ?? '', venue: p.venue ?? '', keterangan: p.keterangan ?? '', status: p.status,
    } })
    setGalat(''); setCariAtlet(''); setSemuaAtlet(false)
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0)
  }

  async function kirim(metode: 'POST' | 'PATCH' | 'DELETE', isi?: any, id?: number): Promise<boolean> {
    setSibuk(true); setGalat('')
    try {
      const r = await fetch('/api/lapor/jadwal' + (metode === 'DELETE' ? `?id=${id}` : ''), {
        method: metode, headers: { 'content-type': 'application/json' }, body: metode === 'DELETE' ? undefined : JSON.stringify(isi),
      })
      const j = await r.json().catch(() => ({}))
      if (r.status === 401) { sesiHabis(j.error ?? 'Sesi habis.'); return false }
      if (!r.ok) { setGalat(j.error ?? 'Gagal menyimpan.'); return false }
      await muat()
      return true
    } catch { setGalat('Tidak ada sambungan. Jadwal BELUM tersimpan, coba lagi.'); return false } finally { setSibuk(false) }
  }

  const simpan = async () => {
    if (!buka) return
    const i = buka.isi
    if (!i.tanggal) return setGalat('Tanggal belum diisi.')
    if (!i.nomorTeks.trim()) return setGalat('Nomor pertandingan belum diisi.')
    const isi = {
      ...(buka.id ? { id: buka.id } : {}), tanggal: i.tanggal, jam: i.jam, nomor_teks: i.nomorTeks, babak: i.babak, atlet_ids: i.atlet,
      lawan: i.lawan, venue: i.venue, keterangan: i.keterangan, status: i.status,
      ...(i.nomor?.disiplin ? { disiplin: i.nomor.disiplin, nomor_resmi: i.nomor.nama } : {}),
    }
    if (await kirim(buka.id ? 'PATCH' : 'POST', isi)) {
      setBuka(null); setKabar(buka.id ? 'Jadwal diperbarui. Halaman publik ikut berubah.' : 'Jadwal tersimpan dan sudah tampil di halaman publik.')
      setTimeout(() => setKabar(''), 4000)
    }
  }
  const hapus = async () => {
    if (!buka?.id || !confirm('Hapus jadwal ini? Halaman publik tidak akan menampilkannya lagi.')) return
    if (await kirim('DELETE', undefined, buka.id)) { setBuka(null); setKabar('Jadwal dihapus.'); setTimeout(() => setKabar(''), 4000) }
  }
  const ubahStatus = async (p: PartaiSaya, status: StatusPartai) => {
    if (await kirim('PATCH', { id: p.id, status })) { setKabar(`Status: ${LABEL_STATUS_PARTAI[status]}.`); setTimeout(() => setKabar(''), 3000) }
  }

  const mendatang = partai.filter(p => p.tanggal >= hariIni)
  const lewat = partai.filter(p => p.tanggal < hariIni)
  const tampil = lihatLama ? partai : mendatang
  const perTanggal = Array.from(tampil.reduce((m, p) => m.set(p.tanggal, [...(m.get(p.tanggal) ?? []), p]), new Map<string, PartaiSaya[]>()).entries())

  return (
    <div className="mt-5">
      <div className="rounded-xl bg-sky-500/10 border border-sky-400/30 px-4 py-3 text-sm text-sky-100">
        Isi jadwal dari technical meeting atau undian panitia. Jadwal <b>langsung tampil</b> di halaman publik
        {DOMAIN_RESMI_KABBANDUNG}, termasuk nama atlet. Kalau jam berubah, cukup ubah di sini.
      </div>
      {kegiatan.length > 0 && (
        <p className="mt-2 text-xs text-slate-400">Jadwal KONI cabor ini: {kegiatan.map(k => `${k.nama}${k.mulai ? ` (${tglTampil(k.mulai)}${k.selesai && k.selesai !== k.mulai ? ` – ${tglTampil(k.selesai)}` : ''})` : ''}`).join(' · ')}</p>
      )}
      {kabar && <div role="status" className="mt-3 rounded-xl bg-emerald-500/15 border border-emerald-400/40 px-4 py-3 text-sm font-bold text-emerald-300">{kabar}</div>}

      {!buka ? (
        <button type="button" onClick={bukaBaru} className="mt-4 w-full rounded-xl bg-sky-500 py-4 text-base font-black text-slate-950">+ Tambah jadwal partai</button>
      ) : (
        <section className="mt-4 rounded-2xl border border-sky-400/40 bg-white/5 p-4 space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-base font-black text-white">{buka.id ? 'Ubah jadwal' : 'Jadwal baru'}</div>
            <button type="button" onClick={() => setBuka(null)} className="text-xs font-bold text-slate-400 border border-slate-700 rounded-lg px-3 py-1.5">Batal</button>
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3">
              <label htmlFor="j-tgl" className={judulIsian}>Tanggal</label>
              <input id="j-tgl" type="date" value={buka.isi.tanggal} onChange={e => ganti('tanggal', e.target.value)} className={kotak} />
            </div>
            <div className="col-span-2">
              <label htmlFor="j-jam" className={judulIsian}>Jam</label>
              <input id="j-jam" type="time" value={buka.isi.jam} onChange={e => ganti('jam', e.target.value)} className={kotak} />
            </div>
          </div>

          <div>
            <label htmlFor="j-nomor" className={judulIsian}>Nomor pertandingan</label>
            <input id="j-nomor" value={buka.isi.nomorTeks} autoComplete="off" placeholder="Ketik untuk mencari, atau tulis sendiri"
              onChange={e => setBuka(b => b ? { ...b, isi: { ...b.isi, nomorTeks: e.target.value, nomor: null } } : b)} className={kotak} />
            {buka.isi.nomor && <p className="text-xs text-emerald-300 mt-1.5">Dari daftar resmi pendaftaran.</p>}
            {saranNomor.length > 0 && (
              <div className="mt-2 rounded-xl border border-slate-700 divide-y divide-slate-800 max-h-64 overflow-y-auto">
                {saranNomor.map(n => (
                  <button key={n.kunci} type="button" className="w-full text-left px-4 py-3 bg-slate-900/70 text-sm text-white"
                    onClick={() => setBuka(b => b ? { ...b, isi: { ...b.isi, nomorTeks: n.label, nomor: n, atlet: n.atlet_ids.length === 1 ? [n.atlet_ids[0]] : b.isi.atlet } } : b)}>
                    {n.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="j-babak" className={judulIsian}>Babak</label>
              <input id="j-babak" list="j-babak-saran" value={buka.isi.babak} onChange={e => ganti('babak', e.target.value)} placeholder="Grup A, Semifinal…" className={kotak} />
              <datalist id="j-babak-saran">{SARAN_BABAK.map(b => <option key={b} value={b} />)}</datalist>
            </div>
            <div>
              <label htmlFor="j-lawan" className={judulIsian}>Lawan</label>
              <input id="j-lawan" value={buka.isi.lawan} onChange={e => ganti('lawan', e.target.value)} placeholder="Kota Bekasi" className={kotak} />
            </div>
          </div>

          <div>
            <label htmlFor="j-venue" className={judulIsian}>Venue / lapangan</label>
            <input id="j-venue" list="j-venue-saran" value={buka.isi.venue} onChange={e => ganti('venue', e.target.value)} placeholder="Nama venue, lapangan, atau arena" className={kotak} />
            <datalist id="j-venue-saran">{venueSaran.map(v => <option key={v} value={v} />)}</datalist>
          </div>

          <div>
            <div className={judulIsian}>Atlet {buka.isi.atlet.length > 0 && <span className="text-sky-300">({buka.isi.atlet.length} dipilih)</span>} <span className="normal-case font-normal text-slate-500">(boleh kosong)</span></div>
            {buka.isi.atlet.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {buka.isi.atlet.map(id => (
                  <button key={id} type="button" onClick={() => ganti('atlet', buka.isi.atlet.filter(x => x !== id))}
                    className="rounded-full bg-sky-500/20 border border-sky-400/50 px-3 py-1.5 text-sm text-sky-100">{namaAtlet.get(id) ?? `Atlet ${id}`} <span aria-hidden className="ml-1 text-sky-300">×</span></button>
                ))}
              </div>
            )}
            {terdaftar.size > 1 && (
              <button type="button" onClick={() => ganti('atlet', Array.from(terdaftar))} className="mb-2 rounded-lg border border-sky-400/50 px-3 py-1.5 text-xs font-bold text-sky-200">Pilih semua yang terdaftar ({terdaftar.size})</button>
            )}
            {atlet.length > 8 && (terdaftar.size === 0 || semuaAtlet) && (
              <input value={cariAtlet} onChange={e => setCariAtlet(e.target.value)} placeholder="Cari nama atlet" aria-label="Cari nama atlet" className={`${kotak} mb-2`} autoComplete="off" />
            )}
            <div className="rounded-xl border border-slate-700 divide-y divide-slate-800 max-h-60 overflow-y-auto">
              {atletTampil.map(a => {
                const aktif = buka.isi.atlet.includes(a.id)
                return (
                  <button key={a.id} type="button" aria-pressed={aktif}
                    onClick={() => ganti('atlet', aktif ? buka.isi.atlet.filter(x => x !== a.id) : [...buka.isi.atlet, a.id])}
                    className={`w-full flex items-center gap-3 text-left px-4 py-3 ${aktif ? 'bg-sky-500/15' : 'bg-slate-900/70'}`}>
                    <span className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center text-xs font-black ${aktif ? 'bg-sky-400 border-sky-400 text-slate-950' : 'border-slate-600'}`}>{aktif ? '✓' : ''}</span>
                    <span className="text-sm text-white">{a.nama}</span>
                  </button>
                )
              })}
              {atletTampil.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">Tidak ada atlet dengan nama itu.</p>}
            </div>
            {terdaftar.size > 0 && (
              <button type="button" onClick={() => { setSemuaAtlet(v => !v); setCariAtlet('') }} className="mt-2 text-sm font-bold text-sky-300 underline underline-offset-4">
                {semuaAtlet ? 'Tampilkan yang terdaftar saja' : `Tampilkan semua atlet cabor (${atlet.length})`}
              </button>
            )}
          </div>

          {buka.id && (
            <div>
              <div className={judulIsian}>Status</div>
              <div className="grid grid-cols-3 gap-2">
                {STATUS_PARTAI.map(st => (
                  <button key={st} type="button" onClick={() => ganti('status', st)} aria-pressed={buka.isi.status === st}
                    className="rounded-xl border-2 px-2 py-2.5 text-xs font-black"
                    style={{ borderColor: buka.isi.status === st ? WARNA_STATUS_PARTAI[st] : '#334155', color: buka.isi.status === st ? WARNA_STATUS_PARTAI[st] : '#cbd5e1', background: buka.isi.status === st ? WARNA_STATUS_PARTAI[st] + '22' : 'transparent' }}>
                    {LABEL_STATUS_PARTAI[st]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="j-ket" className={judulIsian}>Keterangan <span className="normal-case font-normal text-slate-500">(boleh kosong)</span></label>
            <textarea id="j-ket" rows={2} value={buka.isi.keterangan} onChange={e => ganti('keterangan', e.target.value)} placeholder="Mis. lapangan 2, partai ke-3, menunggu partai sebelumnya" className={kotak} />
          </div>

          {galat && <p role="alert" className="rounded-xl bg-red-500/15 border border-red-400/40 px-4 py-3 text-sm font-bold text-red-300">{galat}</p>}
          <button type="button" onClick={simpan} disabled={sibuk} className="w-full rounded-xl bg-sky-500 py-4 text-lg font-black text-slate-950 disabled:opacity-40">
            {sibuk ? 'Menyimpan…' : 'Simpan jadwal'}
          </button>
          {buka.id && <button type="button" onClick={hapus} disabled={sibuk} className="w-full text-sm font-bold text-red-300 py-2">Hapus jadwal ini</button>}
        </section>
      )}
      {!buka && galat && <p role="alert" className="mt-3 rounded-xl bg-red-500/15 border border-red-400/40 px-4 py-3 text-sm font-bold text-red-300">{galat}</p>}

      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Jadwal cabor ({tampil.length})</h2>
          {lewat.length > 0 && (
            <button type="button" onClick={() => setLihatLama(v => !v)} className="text-xs font-bold text-sky-300">{lihatLama ? 'Sembunyikan yang lewat' : `Tampilkan yang lewat (${lewat.length})`}</button>
          )}
        </div>
        {tampil.length === 0 && <p className="text-sm text-slate-500">Belum ada jadwal partai. Tekan “Tambah jadwal partai”.</p>}
        <div className="space-y-5">
          {perTanggal.map(([tgl, daftar]) => (
            <div key={tgl}>
              <div className="text-xs font-black text-sky-300 mb-2">{tglTampil(tgl)}{tgl === hariIni ? ' · HARI INI' : ''}</div>
              <div className="space-y-2">
                {daftar.map(p => (
                  <div key={p.id} className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="w-14 shrink-0 text-center">
                        <div className="text-lg font-black text-white">{p.jam ?? '--:--'}</div>
                        <div className="text-[10px] font-bold" style={{ color: WARNA_STATUS_PARTAI[p.status] }}>{LABEL_STATUS_PARTAI[p.status]}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white">{p.nomor_teks}</div>
                        <div className="text-xs text-slate-400">{[p.babak, p.lawan ? `vs ${p.lawan}` : null].filter(Boolean).join(' · ')}</div>
                        {p.venue && <div className="text-xs text-slate-400 mt-0.5">📍 {p.venue}</div>}
                        {p.atlet_ids.length > 0 && <div className="text-xs text-sky-200 mt-1">{p.atlet_ids.map(id => namaAtlet.get(id) ?? `Atlet ${id}`).join(', ')}</div>}
                        {p.sumber !== 'pic' && <div className="text-[10px] text-slate-500 mt-1">Diisi {p.sumber === 'konida' ? 'KONIDA' : 'dari matriks KONI'}{p.diubah_oleh ? ` · ${p.diubah_oleh}` : ''}</div>}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => bukaUbah(p)} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-bold text-slate-200">Ubah</button>
                      {(['berlangsung', 'ditunda', 'selesai'] as const).filter(st => st !== p.status).map(st => (
                        <button key={st} type="button" disabled={sibuk} onClick={() => ubahStatus(p, st)}
                          className="rounded-lg border px-3 py-1.5 text-xs font-bold" style={{ borderColor: WARNA_STATUS_PARTAI[st] + '80', color: WARNA_STATUS_PARTAI[st] }}>
                          {st === 'berlangsung' ? 'Sedang main' : LABEL_STATUS_PARTAI[st]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
