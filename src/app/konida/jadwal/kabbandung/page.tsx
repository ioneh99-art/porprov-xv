'use client'
// src/app/konida/jadwal/kabbandung/page.tsx
// Kelola Jadwal: sumber halaman publik jadwal (www.konikab-bdg.com tanpa
// login), War Room, Mode Layar, dan jurnal matriks. Ubah satu kegiatan, atau
// unggah berkas Matriks Jadwal Harian KONI → pratinjau → simpan.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Eye, EyeOff, ExternalLink, Pencil, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react'
import { rentangSingkat, statusKegiatan, LABEL_STATUS, type StatusKegiatan } from '@/lib/jadwal-publik'
import { tanggalWIB } from '@/lib/lapor'
import type { RencanaMatriks, RencanaPartai } from '@/lib/impor-matriks'
import KelolaPartai from './KelolaPartai'

interface Baris {
  id: number; jenis: 'pertandingan' | 'upacara'; wilayah: string | null; tuan_rumah: string | null
  cabor_disiplin: string; cabor_nama_raw: string | null; mulai: string | null; selesai: string | null
  venue: string | null; akomodasi: string | null; catatan: string | null; sumber: string | null
  tampil_publik: boolean; updated_at: string
}
type Isian = Omit<Baris, 'id' | 'sumber' | 'updated_at'>

const KOSONG: Isian = { jenis: 'pertandingan', wilayah: '', tuan_rumah: '', cabor_disiplin: '', cabor_nama_raw: '', mulai: '', selesai: '', venue: '', akomodasi: '', catatan: '', tampil_publik: true }
const WARNA: Record<StatusKegiatan, string> = { berlangsung: '#34d399', akan: '#38bdf8', selesai: '#64748b', tanpa_tanggal: '#f87171' }
const kotak = 'w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400'
const kartu = 'rounded-xl border border-slate-800 bg-slate-900/60'
const norm = (s: string | null | undefined) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()

export default function KelolaJadwal() {
  const [jadwal, setJadwal] = useState<Baris[]>([])
  const [caborKita, setCaborKita] = useState<string[]>([])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [pesan, setPesan] = useState('')
  const [cari, setCari] = useState('')
  const [lihat, setLihat] = useState<'publik' | 'tersembunyi' | 'semua'>('publik')
  const [ubah, setUbah] = useState<{ id: number | null; isi: Isian } | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [berkas, setBerkas] = useState<File | null>(null)
  const [rencana, setRencana] = useState<(RencanaMatriks & { rencana_partai?: RencanaPartai }) | null>(null)
  const [bagian, setBagian] = useState<'kegiatan' | 'partai'>('kegiatan')
  const inputBerkas = useRef<HTMLInputElement>(null)
  const hariIni = tanggalWIB()

  const muat = useCallback(async () => {
    setMemuat(true); setGalat('')
    try {
      const r = await fetch('/api/konida/jadwal-kelola', { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Gagal memuat jadwal.')
      setJadwal(d.jadwal); setCaborKita(d.cabor_kontingen ?? [])
    } catch (e: any) { setGalat(e.message) } finally { setMemuat(false) }
  }, [])
  useEffect(() => { muat() }, [muat])

  const kabar = (t: string) => { setPesan(t); setTimeout(() => setPesan(''), 4000) }

  const tampil = useMemo(() => {
    const kata = norm(cari).split(' ').filter(Boolean)
    return jadwal.filter(b =>
      (lihat === 'semua' || (lihat === 'publik' ? b.tampil_publik : !b.tampil_publik)) &&
      kata.every(k => norm([b.cabor_disiplin, b.cabor_nama_raw, b.tuan_rumah, b.venue].join(' ')).includes(k)))
  }, [jadwal, cari, lihat])
  const jumlahTersembunyi = jadwal.filter(b => !b.tampil_publik).length
  const kita = useMemo(() => new Set(caborKita.map(norm)), [caborKita])

  async function kirim(metode: 'POST' | 'PATCH' | 'DELETE', isi?: any, id?: number) {
    setSibuk(true); setGalat('')
    try {
      const r = await fetch('/api/konida/jadwal-kelola' + (metode === 'DELETE' ? `?id=${id}` : ''), {
        method: metode, headers: { 'Content-Type': 'application/json' }, body: metode === 'DELETE' ? undefined : JSON.stringify(isi),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Gagal menyimpan.')
      return true
    } catch (e: any) { setGalat(e.message); return false } finally { setSibuk(false) }
  }

  async function simpanUbah() {
    if (!ubah) return
    const isi = { ...ubah.isi, selesai: ubah.isi.selesai || ubah.isi.mulai }
    const ok = ubah.id ? await kirim('PATCH', { id: ubah.id, ...isi }) : await kirim('POST', isi)
    if (ok) { setUbah(null); kabar(ubah.id ? 'Perubahan tersimpan. Halaman publik ikut berubah.' : 'Kegiatan ditambahkan.'); muat() }
  }
  async function hapus() {
    if (!ubah?.id) return
    if (!confirm(`Hapus "${ubah.isi.cabor_disiplin}" dari jadwal? Halaman publik, War Room, dan jurnal tidak akan menampilkannya lagi.`)) return
    if (await kirim('DELETE', undefined, ubah.id)) { setUbah(null); kabar('Kegiatan dihapus (isinya tersimpan di jejak audit).'); muat() }
  }
  async function alihPublik(b: Baris) {
    if (await kirim('PATCH', { id: b.id, tampil_publik: !b.tampil_publik })) {
      setJadwal(j => j.map(x => x.id === b.id ? { ...x, tampil_publik: !b.tampil_publik } : x))
      kabar(b.tampil_publik ? `"${b.cabor_disiplin}" disembunyikan dari publik.` : `"${b.cabor_disiplin}" tampil di publik.`)
    }
  }

  async function prosesMatriks(f: File, simpan: boolean) {
    setSibuk(true); setGalat('')
    try {
      const fd = new FormData(); fd.append('berkas', f); if (simpan) fd.append('simpan', '1')
      const r = await fetch('/api/konida/jadwal-kelola/matriks', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Berkas gagal diproses.')
      if (simpan) {
        setBerkas(null); setRencana(null)
        kabar(`Matriks tersimpan: ${d.rencana.ubah.length} kegiatan diperbarui, ${d.rencana.tambah.length} ditambah, ${(d.partai?.tambah.length ?? 0) + (d.partai?.lengkapi.length ?? 0)} jadwal partai.`)
        muat()
      } else { setBerkas(f); setRencana({ ...d.rencana, rencana_partai: d.partai }) }
    } catch (e: any) { setGalat(e.message) } finally {
      setSibuk(false); if (inputBerkas.current) inputBerkas.current.value = ''
    }
  }

  const jumlahUbah = rencana ? rencana.ubah.length + rencana.tambah.length + (rencana.rencana_partai?.tambah.length ?? 0) + (rencana.rencana_partai?.lengkapi.length ?? 0) : 0
  const ganti = (k: keyof Isian, v: any) => setUbah(u => u ? { ...u, isi: { ...u.isi, [k]: v } } : u)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 text-white text-xl font-bold"><CalendarDays size={20} className="text-sky-400" /> Kelola Jadwal Pertandingan</div>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Jadwal ini yang tampil di halaman publik (tanpa login), War Room, Mode Layar, dan jurnal format KONI.
            Perubahan langsung terlihat di halaman publik.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/publik/kabbandung" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:border-sky-400">
            <ExternalLink size={14} /> Lihat halaman publik
          </a>
          <button onClick={() => inputBerkas.current?.click()} disabled={sibuk} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/50 bg-sky-500/10 px-3 py-2 text-sm text-sky-300 hover:bg-sky-500/20 disabled:opacity-50">
            <Upload size={14} /> Unggah Matriks KONI
          </button>
          <button onClick={() => setUbah({ id: null, isi: { ...KOSONG } })} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500">
            <Plus size={14} /> Tambah kegiatan
          </button>
          <input ref={inputBerkas} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) prosesMatriks(f, false) }} />
        </div>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-900 border border-slate-800 p-1 mb-5 max-w-md">
        {([['kegiatan', 'Kegiatan per cabor'], ['partai', 'Jadwal partai']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setBagian(k)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${bagian === k ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}>{l}</button>
        ))}
      </div>

      {bagian === 'partai' ? <KelolaPartai /> : <>
      {galat && <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{galat}</div>}
      {pesan && <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">{pesan}</div>}

      {/* ── Pratinjau matriks ── */}
      {rencana && berkas && (
        <div className={`${kartu} p-4 mb-5 border-sky-500/40`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <div className="text-white font-semibold">Pratinjau: {berkas.name}</div>
              <div className="text-slate-400 text-xs">{rencana.baris_harian} baris harian · {rencana.kegiatan} kegiatan · {rencana.sama} tidak berubah</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRencana(null); setBerkas(null) }} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm">Batal</button>
              <button onClick={() => prosesMatriks(berkas, true)} disabled={sibuk || (jumlahUbah === 0)}
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
                {sibuk ? 'Menyimpan…' : `Simpan ${jumlahUbah} perubahan`}
              </button>
            </div>
          </div>
          {jumlahUbah === 0 && <div className="text-sm text-emerald-300">Jadwal sudah sama dengan berkas ini — tidak ada yang perlu diubah.</div>}
          {rencana.ubah.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1.5">Diperbarui ({rencana.ubah.length})</div>
              <div className="space-y-1">
                {rencana.ubah.map(u => (
                  <div key={u.id} className="text-sm"><span className="text-white font-medium">{u.nama}</span> <span className="text-slate-400">— {u.ket.join('; ')}</span></div>
                ))}
              </div>
            </div>
          )}
          {rencana.tambah.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-1.5">Ditambah ({rencana.tambah.length})</div>
              {rencana.tambah.map(t => (
                <div key={t.cabor_disiplin} className="text-sm"><span className="text-white font-medium">{t.cabor_disiplin}</span> <span className="text-slate-400">— {rentangSingkat(t.mulai, t.selesai)} · {t.tuan_rumah ?? '-'} · {t.venue ?? '-'}{t.cabor_nama_raw ? '' : ' · (cabor belum tertaut)'}</span></div>
              ))}
            </div>
          )}
          {rencana.rencana_partai && (rencana.rencana_partai.tambah.length + rencana.rencana_partai.lengkapi.length + rencana.rencana_partai.tak_tertaut.length) > 0 && (
            <div className="mb-3">
              <div className="text-xs font-bold text-sky-300 uppercase tracking-wider mb-1.5">
                Jadwal partai: {rencana.rencana_partai.tambah.length} baru · {rencana.rencana_partai.lengkapi.length} dilengkapi
              </div>
              {rencana.rencana_partai.tambah.map((t, i) => (
                <div key={i} className="text-sm"><span className="text-white font-medium">{t.nomor_teks}</span> <span className="text-slate-400">— {rentangSingkat(t.tanggal, t.tanggal)}{t.jam ? ` ${t.jam}` : ''}{t.lawan ? ` vs ${t.lawan}` : ''}</span></div>
              ))}
              {rencana.rencana_partai.lengkapi.map(l => <div key={l.id} className="text-sm text-slate-400">{l.ket}</div>)}
              {rencana.rencana_partai.tak_tertaut.length > 0 && (
                <div className="text-xs text-amber-300 mt-1">Tidak tertaut ke cabor (dilewati): {rencana.rencana_partai.tak_tertaut.map(t => t.kegiatan).join(', ')}</div>
              )}
              <div className="text-[11px] text-slate-500 mt-1">Partai yang sudah diisi PIC hanya dilengkapi bagian yang masih kosong — jam dari PIC tidak ditimpa.</div>
            </div>
          )}
          {rencana.tak_di_matriks.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ada di sistem, tidak ada di berkas — dibiarkan ({rencana.tak_di_matriks.length})</div>
              <div className="text-sm text-slate-400">{rencana.tak_di_matriks.map(t => t.nama).join(' · ')}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Saringan ── */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari kegiatan, cabor, kota, venue" className={`${kotak} max-w-xs`} />
        {([['publik', 'Tampil di publik'], ['tersembunyi', `Disembunyikan (${jumlahTersembunyi})`], ['semua', 'Semua']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setLihat(k)} className={`rounded-full px-3 py-1 text-xs font-semibold border ${lihat === k ? 'bg-sky-600 border-sky-500 text-white' : 'border-slate-700 text-slate-400'}`}>{l}</button>
        ))}
        <button onClick={muat} className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"><RefreshCw size={12} className={memuat ? 'animate-spin' : ''} /> Muat ulang</button>
      </div>

      {/* ── Tabel ── */}
      <div className={`${kartu} overflow-x-auto`}>
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <th className="px-3 py-2.5">Kegiatan</th><th className="px-3 py-2.5">Tanggal</th><th className="px-3 py-2.5">Kota</th>
              <th className="px-3 py-2.5">Venue</th><th className="px-3 py-2.5 text-center">Publik</th><th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {memuat && !jadwal.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Memuat…</td></tr>}
            {!memuat && !tampil.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Tidak ada kegiatan.</td></tr>}
            {tampil.map(b => {
              const st = statusKegiatan(b, hariIni)
              const bukanKita = b.jenis === 'pertandingan' && !!b.cabor_nama_raw && kita.size > 0 && !kita.has(norm(b.cabor_nama_raw))
              return (
                <tr key={b.id} className={`border-b border-slate-800/70 ${b.tampil_publik ? '' : 'opacity-60'}`}>
                  <td className="px-3 py-2.5">
                    <div className="text-white font-medium">{b.cabor_disiplin}{b.jenis === 'upacara' && <span className="ml-1.5 text-[10px] text-amber-300">UPACARA</span>}</div>
                    <div className="text-xs text-slate-500">
                      {b.cabor_nama_raw ?? <span className="text-amber-400">cabor belum tertaut</span>}
                      {bukanKita && <span className="text-amber-400"> · kontingen tidak terdaftar di cabor ini</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="text-white">{rentangSingkat(b.mulai, b.selesai)}</div>
                    <div className="text-[11px]" style={{ color: WARNA[st] }}>{LABEL_STATUS[st]}</div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300">{b.tuan_rumah ?? '-'}</td>
                  <td className="px-3 py-2.5 text-slate-300 max-w-[260px]"><div className="line-clamp-2">{b.venue ?? '-'}</div></td>
                  <td className="px-3 py-2.5 text-center">
                    <button onClick={() => alihPublik(b)} disabled={sibuk} title={b.tampil_publik ? 'Sembunyikan dari publik' : 'Tampilkan di publik'}
                      className={`inline-flex rounded-lg p-1.5 ${b.tampil_publik ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-slate-800'}`}>
                      {b.tampil_publik ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => setUbah({ id: b.id, isi: {
                      jenis: b.jenis, wilayah: b.wilayah ?? '', tuan_rumah: b.tuan_rumah ?? '', cabor_disiplin: b.cabor_disiplin, cabor_nama_raw: b.cabor_nama_raw ?? '',
                      mulai: b.mulai ?? '', selesai: b.selesai ?? '', venue: b.venue ?? '', akomodasi: b.akomodasi ?? '', catatan: b.catatan ?? '', tampil_publik: b.tampil_publik,
                    } })} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-xs hover:border-sky-400">
                      <Pencil size={12} /> Ubah
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      </>}

      {/* ── Formulir ubah/tambah ── */}
      {ubah && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !sibuk && setUbah(null)}>
          <div className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-950 p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-white font-semibold">{ubah.id ? 'Ubah kegiatan' : 'Tambah kegiatan'}</div>
              <button onClick={() => setUbah(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 text-xs text-slate-400">Nama kegiatan (seperti di jadwal KONI)
                <input className={`${kotak} mt-1`} value={ubah.isi.cabor_disiplin} onChange={e => ganti('cabor_disiplin', e.target.value)} placeholder="mis. Canoeing Sprint & SUP" />
              </label>
              <label className="text-xs text-slate-400">Cabor di sistem
                <input className={`${kotak} mt-1`} list="daftar-cabor" value={ubah.isi.cabor_nama_raw ?? ''} onChange={e => ganti('cabor_nama_raw', e.target.value)} placeholder="mis. Dayung" />
                <datalist id="daftar-cabor">{caborKita.map(c => <option key={c} value={c} />)}</datalist>
              </label>
              <label className="text-xs text-slate-400">Jenis
                <select className={`${kotak} mt-1`} value={ubah.isi.jenis} onChange={e => ganti('jenis', e.target.value)}>
                  <option value="pertandingan">Pertandingan</option><option value="upacara">Upacara</option>
                </select>
              </label>
              <label className="text-xs text-slate-400">Tanggal mulai
                <input type="date" className={`${kotak} mt-1`} value={ubah.isi.mulai ?? ''} onChange={e => ganti('mulai', e.target.value)} />
              </label>
              <label className="text-xs text-slate-400">Tanggal selesai <span className="text-slate-600">(kosong = satu hari)</span>
                <input type="date" className={`${kotak} mt-1`} value={ubah.isi.selesai ?? ''} onChange={e => ganti('selesai', e.target.value)} />
              </label>
              <label className="text-xs text-slate-400">Kota tuan rumah
                <input className={`${kotak} mt-1`} value={ubah.isi.tuan_rumah ?? ''} onChange={e => ganti('tuan_rumah', e.target.value)} placeholder="mis. KARAWANG" />
              </label>
              <label className="text-xs text-slate-400">Wilayah
                <select className={`${kotak} mt-1`} value={ubah.isi.wilayah ?? ''} onChange={e => ganti('wilayah', e.target.value)}>
                  <option value="">—</option><option>WILAYAH I</option><option>WILAYAH II</option><option>WILAYAH III</option>
                </select>
              </label>
              <label className="col-span-2 text-xs text-slate-400">Venue
                <input className={`${kotak} mt-1`} value={ubah.isi.venue ?? ''} onChange={e => ganti('venue', e.target.value)} />
              </label>
              <label className="text-xs text-slate-400">Kota menginap <span className="text-slate-600">(internal)</span>
                <input className={`${kotak} mt-1`} value={ubah.isi.akomodasi ?? ''} onChange={e => ganti('akomodasi', e.target.value)} />
              </label>
              <label className="text-xs text-slate-400 flex items-end gap-2 pb-2">
                <input type="checkbox" checked={ubah.isi.tampil_publik} onChange={e => ganti('tampil_publik', e.target.checked)} className="w-4 h-4 accent-sky-500" />
                Tampil di halaman publik
              </label>
              <label className="col-span-2 text-xs text-slate-400">Catatan <span className="text-slate-600">(internal, tidak tampil di publik)</span>
                <textarea className={`${kotak} mt-1`} rows={2} value={ubah.isi.catatan ?? ''} onChange={e => ganti('catatan', e.target.value)} />
              </label>
            </div>
            <div className="flex items-center justify-between gap-2 mt-5">
              {ubah.id
                ? <button onClick={hapus} disabled={sibuk} className="inline-flex items-center gap-1 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"><Trash2 size={14} /> Hapus</button>
                : <span />}
              <div className="flex gap-2">
                <button onClick={() => setUbah(null)} disabled={sibuk} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Batal</button>
                <button onClick={simpanUbah} disabled={sibuk} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{sibuk ? 'Menyimpan…' : 'Simpan'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
