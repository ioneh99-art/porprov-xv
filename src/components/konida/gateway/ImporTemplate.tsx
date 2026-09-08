'use client'
// src/components/konida/gateway/ImporTemplate.tsx
// Satu alur impor untuk semua template Data Gateway: identitas, perlengkapan,
// biomotorik. Menambah jenis keempat nanti cukup menambah definisi kolomnya —
// layar ini tidak perlu disentuh.
//
// Alur: unduh template → isi → unggah → PRATINJAU perubahan → konfirmasi → simpan.
// Yang membedakan dari impor biasa: operator melihat nilai LAMA dan BARU per
// kolom sebelum menyimpan, sehingga tidak ada data tertimpa tanpa disadari.

import { useState, useMemo } from 'react'
import {
  Download, Upload, Loader2, CheckCircle2, AlertTriangle,
  XCircle, Save, FileSpreadsheet, ChevronDown, ChevronRight,
} from 'lucide-react'

export type JenisTemplate = 'identitas' | 'perlengkapan' | 'biomotorik'

const JUDUL: Record<JenisTemplate, { nama: string; ket: string }> = {
  identitas:    { nama: 'Identitas Atlet',   ket: 'Tempat & tanggal lahir, kontak, alamat, bank & rekening' },
  perlengkapan: { nama: 'Perlengkapan',      ket: 'Ukuran kemeja, kaos, jaket, celana, sepatu, topi' },
  biomotorik:   { nama: 'Tes Biomotorik',    ket: 'Hasil tes berkala — tiap tahap jadi catatan baru' },
}

interface Perubahan { kolom: string; header: string; lama: any; baru: any; jenis: 'tambah'|'ubah'|'kosongkan'|'sama' }
interface Baris {
  baris_ke: number; nama: string; nik: string | null
  atlet_id: number | null; atlet_nama: string | null
  metode: string; skor: number | null
  kandidat: { atlet_id: number; nama: string; skor: number } | null
  saingan:  { atlet_id: number; nama: string; skor: number } | null
  galat: string[]; perubahan: Perubahan[]; baris_baru: boolean
}
interface Pratinjau {
  jenis: JenisTemplate; nama_file: string
  versi_cocok: boolean; versi_berkas: string | null; versi_diharapkan: string
  peringatan: string[]; baris: Baris[]
  ringkasan: { total: number; nik: number; nama_persis: number; nama_mirip: number; nama_ambigu: number; tidak_ketemu: number; bergalat: number }
  ringkas_perubahan: { tambah: number; ubah: number; kosongkan: number; sama: number }
  baris_baru: number
}

const WARNA = {
  tambah: '#34d399', ubah: '#fbbf24', kosongkan: '#f87171', sama: '#64748b',
} as const

export default function ImporTemplate({ jenis, accent = '#38bdf8' }: { jenis: JenisTemplate; accent?: string }) {
  const [pv, setPv]       = useState<Pratinjau | null>(null)
  const [baris, setBaris] = useState<Baris[]>([])
  const [sibuk, setSibuk] = useState('')
  const [galat, setGalat] = useState('')
  const [hasil, setHasil] = useState<any>(null)
  const [buka, setBuka]   = useState<Set<number>>(new Set())

  const j = JUDUL[jenis]

  async function onBerkas(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setSibuk('Membaca berkas…'); setGalat(''); setPv(null); setHasil(null); setBaris([])
    try {
      const fd = new FormData(); fd.append('file', f); fd.append('jenis', jenis)
      const r = await fetch('/api/gateway/preview', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error ?? 'Gagal membaca berkas')
      setPv(d); setBaris(d.baris)
    } catch (err: any) { setGalat(err.message) }
    finally { setSibuk(''); e.target.value = '' }
  }

  const siap = useMemo(() => baris.filter(b => b.atlet_id != null && !b.galat.length), [baris])
  const perluKonfirmasi = useMemo(
    () => baris.filter(b => b.atlet_id == null && b.kandidat && !b.galat.length), [baris])
  const adaGalat = useMemo(() => baris.filter(b => b.galat.length), [baris])

  // Ringkasan perubahan dihitung ulang dari baris yang BENAR-BENAR akan disimpan.
  const rekap = useMemo(() => {
    const r = { tambah: 0, ubah: 0, kosongkan: 0, sama: 0 }
    siap.forEach(b => b.perubahan?.forEach(p => { r[p.jenis]++ }))
    return r
  }, [siap])

  function setuju(no: number) {
    setBaris(prev => prev.map(b => b.baris_ke !== no ? b
      : b.kandidat ? { ...b, atlet_id: b.kandidat.atlet_id, atlet_nama: b.kandidat.nama } : b))
  }
  function batal(no: number) {
    setBaris(prev => prev.map(b => b.baris_ke !== no ? b : { ...b, atlet_id: null, atlet_nama: null }))
  }
  function toggle(no: number) {
    setBuka(prev => { const s = new Set(prev); s.has(no) ? s.delete(no) : s.add(no); return s })
  }

  async function simpan() {
    if (!siap.length) return
    setSibuk(`Menyimpan ${siap.length} baris…`); setGalat('')
    try {
      const r = await fetch('/api/gateway/commit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jenis, baris: siap, nama_file: pv?.nama_file }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error ?? 'Gagal menyimpan')
      setHasil(d); setPv(null); setBaris([])
    } catch (err: any) { setGalat(err.message) }
    finally { setSibuk('') }
  }

  return (
    <div className="space-y-4">

      {/* langkah 1 — unduh */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-start gap-3 mb-3">
          <FileSpreadsheet size={18} style={{ color: accent }} className="mt-0.5 shrink-0" />
          <div>
            <h3 className="text-white font-bold text-sm">{j.nama}</h3>
            <p className="text-[12px] text-slate-500">{j.ket}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/gateway/template?jenis=${jenis}`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-white/10 bg-white/[0.05] hover:bg-white/10 text-slate-200">
            <Download size={14} /> Unduh Template
          </a>
          <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer text-slate-900"
            style={{ background: accent }}>
            <Upload size={14} /> Unggah Berkas Terisi
            <input type="file" accept=".xlsx,.xls" onChange={onBerkas} className="hidden" />
          </label>
        </div>
        <p className="text-[11px] text-slate-600 mt-2.5">
          Sel yang dikosongkan tidak akan mengubah data yang sudah ada. Untuk mengosongkan sebuah data, tulis tanda&nbsp;<b className="text-slate-400">-</b>
        </p>
      </div>

      {sibuk && (
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 flex items-center gap-2 text-sm text-sky-300">
          <Loader2 size={15} className="animate-spin" /> {sibuk}
        </div>
      )}
      {galat && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">{galat}</div>
      )}
      {hasil && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <b>{hasil.tersimpan} baris tersimpan.</b>
          {hasil.dilewati > 0 && <span className="text-slate-400"> · {hasil.dilewati} dilewati karena tidak ada perubahan</span>}
          {hasil.rekap_perubahan && (
            <div className="text-[12px] text-slate-400 mt-1">
              {hasil.rekap_perubahan.tambah} data bertambah · {hasil.rekap_perubahan.ubah} data berubah
            </div>
          )}
          {hasil.gagal?.length > 0 && (
            <div className="text-[12px] text-amber-300 mt-1">{hasil.gagal.length} gagal: {hasil.gagal.slice(0,3).join(' · ')}</div>
          )}
        </div>
      )}

      {pv && (
        <>
          {!pv.versi_cocok && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-300 flex gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>Versi template berkas <b>{pv.versi_berkas ?? 'tidak terbaca'}</b>, diharapkan <b>{pv.versi_diharapkan}</b>. Unduh template terbaru bila kolomnya sudah berubah.</span>
            </div>
          )}
          {pv.peringatan?.map((w, i) => (
            <div key={i} className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-2.5 text-[12px] text-amber-200/90">{w}</div>
          ))}

          {/* PAPAN PERUBAHAN — inti kepercayaan operator */}
          <div className="rounded-2xl border p-5"
            style={{ borderColor: rekap.ubah > 0 ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.1)',
                     background: rekap.ubah > 0 ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.03)' }}>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">Yang akan terjadi bila disimpan</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Angka label="Data bertambah" nilai={rekap.tambah} warna={WARNA.tambah} ket="kolom tadinya kosong" />
              <Angka label="Data BERUBAH"   nilai={rekap.ubah}   warna={WARNA.ubah}   ket="isi lama ditimpa" tebal />
              <Angka label="Dikosongkan"    nilai={rekap.kosongkan} warna={WARNA.kosongkan} ket="lewat tanda -" />
              <Angka label="Tidak berubah"  nilai={rekap.sama}   warna={WARNA.sama}   ket="tidak ditulis" />
            </div>
            {rekap.ubah > 0 && (
              <p className="text-[12px] text-amber-300/90 mt-3 flex gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span><b>{rekap.ubah} data yang sudah terisi akan ditimpa.</b> Buka barisnya untuk melihat nilai lama dan barunya sebelum menyimpan.</span>
              </p>
            )}
          </div>

          {/* ringkasan pencocokan */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
            <Kotak label="Siap disimpan"   n={siap.length}            warna="#34d399" />
            <Kotak label="Perlu konfirmasi" n={perluKonfirmasi.length} warna="#38bdf8" />
            <Kotak label="Bermasalah"       n={adaGalat.length}        warna="#f87171" />
            <Kotak label="Lewat NIK"        n={pv.ringkasan.nik}       warna="#a78bfa" />
            <Kotak label="Total baris"      n={pv.ringkasan.total}     warna="#64748b" />
          </div>

          <div className="flex flex-wrap gap-2">
            {perluKonfirmasi.length > 0 && (
              <button onClick={() => perluKonfirmasi.forEach(b => setuju(b.baris_ke))}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] border border-white/10 hover:bg-white/10 text-slate-200">
                Setujui semua usulan ({perluKonfirmasi.length})
              </button>
            )}
            <button onClick={simpan} disabled={!siap.length || !!sibuk || adaGalat.length > 0}
              className="px-4 py-2 rounded-xl text-sm font-bold text-slate-900 disabled:opacity-40 inline-flex items-center gap-2"
              style={{ background: accent }}>
              <Save size={15} /> Simpan {siap.length > 0 ? `(${siap.length})` : ''}
            </button>
            {adaGalat.length > 0 && (
              <span className="text-[12px] text-red-300 self-center">
                Perbaiki {adaGalat.length} baris bermasalah di berkas Excel dulu.
              </span>
            )}
          </div>

          {/* daftar baris */}
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            {baris.slice(0, 400).map(b => {
              const ubahAda = b.perubahan?.some(p => p.jenis === 'ubah')
              return (
                <div key={b.baris_ke} className="border-b border-white/[0.06] last:border-0">
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    {b.galat.length ? <XCircle size={15} className="text-red-400 shrink-0" />
                      : b.atlet_id ? <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                      : <AlertTriangle size={15} className="text-sky-400 shrink-0" />}
                    <button onClick={() => toggle(b.baris_ke)} className="min-w-0 flex-1 text-left">
                      <div className="text-sm text-slate-200 truncate flex items-center gap-2">
                        {b.nama || `Baris ${b.baris_ke}`}
                        {ubahAda && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">ADA YANG DITIMPA</span>}
                        {b.baris_baru && jenis === 'biomotorik' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">tahap baru</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        baris {b.baris_ke}
                        {b.atlet_nama && <span className="text-emerald-400"> · {b.atlet_nama}</span>}
                        {!b.atlet_nama && b.kandidat && <span className="text-sky-400"> · usul: {b.kandidat.nama} ({b.kandidat.skor})</span>}
                        {b.saingan && <span className="text-amber-400"> vs {b.saingan.nama} ({b.saingan.skor})</span>}
                        {b.galat.length > 0 && <span className="text-red-400"> · {b.galat[0]}</span>}
                      </div>
                    </button>
                    {b.perubahan?.length > 0 && (
                      <button onClick={() => toggle(b.baris_ke)} className="text-slate-500 shrink-0">
                        {buka.has(b.baris_ke) ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </button>
                    )}
                    {!b.atlet_id && b.kandidat && !b.galat.length && (
                      <button onClick={() => setuju(b.baris_ke)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30 shrink-0">
                        Setujui
                      </button>
                    )}
                    {b.atlet_id && b.metode !== 'nik' && b.metode !== 'nama_persis' && (
                      <button onClick={() => batal(b.baris_ke)}
                        className="px-2.5 py-1 rounded-lg text-[11px] bg-white/5 text-slate-400 border border-white/10 shrink-0">
                        Batal
                      </button>
                    )}
                  </div>

                  {buka.has(b.baris_ke) && b.perubahan?.length > 0 && (
                    <div className="px-4 pb-3 pt-1 space-y-1">
                      {b.perubahan.map(p => (
                        <div key={p.kolom} className="grid grid-cols-[132px_1fr] gap-2 text-[12px] items-start">
                          <span className="text-slate-500 truncate">{p.header}</span>
                          <span className="min-w-0">
                            <span className="text-slate-500 line-through break-words">{fmt(p.lama)}</span>
                            <span className="text-slate-600"> → </span>
                            <span style={{ color: WARNA[p.jenis] }} className="font-semibold break-words">{fmt(p.baru)}</span>
                            <span className="ml-2 text-[10px] uppercase tracking-wider" style={{ color: WARNA[p.jenis] }}>
                              {p.jenis === 'ubah' ? 'ditimpa' : p.jenis === 'tambah' ? 'baru' : p.jenis === 'kosongkan' ? 'dikosongkan' : 'sama'}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {baris.length > 400 && (
              <div className="px-4 py-2.5 text-[11px] text-slate-500">Menampilkan 400 dari {baris.length} baris.</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function fmt(v: any) {
  if (v == null || v === '') return '(kosong)'
  return String(v)
}

function Angka({ label, nilai, warna, ket, tebal }: { label: string; nilai: number; warna: string; ket: string; tebal?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className={`${tebal ? 'text-3xl' : 'text-2xl'} font-bold`} style={{ color: warna }}>{nilai}</div>
      <div className="text-[10px] text-slate-600 mt-0.5">{ket}</div>
    </div>
  )
}

function Kotak({ label, n, warna }: { label: string; n: number; warna: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className="text-xl font-bold" style={{ color: warna }}>{n}</div>
    </div>
  )
}
