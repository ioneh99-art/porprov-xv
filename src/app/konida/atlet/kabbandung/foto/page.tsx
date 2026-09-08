'use client'
// src/app/konida/atlet/kabbandung/foto/page.tsx
// Tarik pasfoto atlet dari folder hasil unduhan Google Drive.
//
// Alur: pilih folder → peramban membaca nama berkas & nama foldernya →
// cocokkan per cabor → pratinjau → operator konfirmasi → kecilkan → simpan.
//
// Pengecilan sengaja dilakukan di peramban: berkas asli ~1,4 MB per foto,
// sedangkan rute server hanya menerima ~4,5 MB sekali kirim. Setelah dikecilkan
// jadi ~60 KB, satu kelompok berisi 20 foto masih jauh di bawah batas.

import { useState, useMemo, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import {
  FolderOpen, Loader2, CheckCircle2, AlertTriangle, XCircle,
  ArrowLeft, Save, Users, ImageOff, Search,
} from 'lucide-react'
import { cocokkanNama, caborDariJalur } from '@/lib/pencocokan'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
const KONTINGEN_ID = 4
const ACCENT = '#38bdf8'
const LEBAR_MAKS = 600          // cukup untuk kartu 102 mm
const MUTU_JPEG = 0.82
const PER_KIRIM = 20

type Status = 'persis' | 'mirip' | 'ambigu' | 'tidak_ketemu' | 'bukan_atlet'

interface Baris {
  key: string
  file: File
  jalur: string
  folderCabor: string
  caborDb: string | null
  namaBerkas: string
  status: Status
  atletId: number | null
  atletNama: string | null
  skor: number | null
  kandidat: { id: number; nama: string; skor: number } | null
  saingan: { id: number; nama: string; skor: number } | null
  sudahPunyaFoto: boolean
  dipilih: boolean
}

interface AtletRingkas { id: number; nama_lengkap: string; cabor_nama_raw: string | null; foto_url: string | null }

const GAMBAR = /\.(jpe?g|png|webp)$/i
const BUKAN_ATLET = /(PELATIH|OFFICIAL|MEKANIK|MANAGER|CONTOH)/i

/** Kecilkan gambar di peramban, keluarkan JPEG base64. */
function kecilkan(file: File): Promise<{ mime: string; data: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const skala = Math.min(1, LEBAR_MAKS / img.width)
      const w = Math.max(1, Math.round(img.width * skala))
      const h = Math.max(1, Math.round(img.height * skala))
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) return reject(new Error('Peramban tidak mendukung pengecilan gambar'))
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h)   // latar putih untuk PNG transparan
      ctx.drawImage(img, 0, 0, w, h)
      resolve({ mime: 'image/jpeg', data: c.toDataURL('image/jpeg', MUTU_JPEG).split(',')[1] })
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gambar tidak terbaca')) }
    img.src = url
  })
}

export default function TarikFotoPage() {
  const [baris, setBaris] = useState<Baris[]>([])
  const [sibuk, setSibuk] = useState('')
  const [galat, setGalat] = useState('')
  const [hasil, setHasil] = useState<{ tersimpan: number; gagal: string[] } | null>(null)
  const [cari, setCari] = useState('')
  const [tapis, setTapis] = useState<Status | 'semua'>('semua')
  const inputRef = useRef<HTMLInputElement>(null)

  const onPilihFolder = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setSibuk('Membaca folder…'); setGalat(''); setHasil(null); setBaris([])
    try {
      // Ambil kolam atlet — paginasi 1000.
      let atlet: AtletRingkas[] = []
      for (let p = 0; ; p++) {
        const { data, error } = await sb.from('atlet')
          .select('id,nama_lengkap,cabor_nama_raw,foto_url')
          .eq('kontingen_id', KONTINGEN_ID)
          .range(p * 1000, (p + 1) * 1000 - 1)
        if (error) throw new Error(error.message)
        if (!data || !data.length) break
        atlet = atlet.concat(data as AtletRingkas[])
        if (data.length < 1000) break
      }
      const caborDb = Array.from(new Set(atlet.map(a => a.cabor_nama_raw).filter(Boolean))) as string[]
      const perCabor = new Map<string, AtletRingkas[]>()
      atlet.forEach(a => {
        if (!a.cabor_nama_raw) return
        const arr = perCabor.get(a.cabor_nama_raw) ?? []
        arr.push(a); perCabor.set(a.cabor_nama_raw, arr)
      })

      setSibuk('Mencocokkan nama…')
      const hasilBaris: Baris[] = []
      for (const f of files) {
        const jalur = (f as any).webkitRelativePath || f.name
        if (!GAMBAR.test(f.name)) continue
        // Cabor dicari dengan menelusuri SEMUA segmen jalur, bukan indeks tetap —
        // supaya operator boleh memilih folder induk ATAU satu folder cabor saja.
        const caborDbNama = caborDariJalur(jalur, caborDb)
        const bagian = jalur.split('/')
        const folderCabor = caborDbNama
          ?? (bagian.length >= 2 ? bagian[bagian.length - 2] : '')
        const namaBerkas = f.name.replace(/\.[^.]+$/, '')
        const bukanAtlet = BUKAN_ATLET.test(jalur)

        const dasar = {
          key: jalur, file: f, jalur, folderCabor, caborDb: caborDbNama, namaBerkas,
          atletId: null as number | null, atletNama: null as string | null,
          skor: null as number | null, kandidat: null as any, saingan: null as any,
          sudahPunyaFoto: false, dipilih: false,
        }
        if (bukanAtlet || !caborDbNama) {
          hasilBaris.push({ ...dasar, status: bukanAtlet ? 'bukan_atlet' : 'tidak_ketemu' })
          continue
        }
        const kolam = (perCabor.get(caborDbNama) ?? []).map(a => ({ id: a.id, nama_lengkap: a.nama_lengkap }))
        const c = cocokkanNama(namaBerkas, kolam, { bersihkan: true })
        const idTerpakai = c.metode === 'persis' ? c.id : null
        const punyaFoto = idTerpakai
          ? !!(perCabor.get(caborDbNama) ?? []).find(a => a.id === idTerpakai)?.foto_url
          : false
        hasilBaris.push({
          ...dasar,
          status: c.metode === 'persis' ? 'persis' : c.metode === 'mirip' ? 'mirip'
                : c.metode === 'ambigu' ? 'ambigu' : 'tidak_ketemu',
          atletId: idTerpakai, atletNama: c.nama, skor: c.skor,
          kandidat: c.kandidat, saingan: c.saingan,
          sudahPunyaFoto: punyaFoto,
          dipilih: c.metode === 'persis',
        })
      }
      setBaris(hasilBaris)
    } catch (err: any) {
      setGalat(err.message ?? 'Gagal membaca folder')
    } finally {
      setSibuk('')
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [])

  const ringkas = useMemo(() => {
    const r = { persis: 0, mirip: 0, ambigu: 0, tidak_ketemu: 0, bukan_atlet: 0 }
    baris.forEach(b => { r[b.status]++ })
    return r
  }, [baris])

  const terpilih = useMemo(() => baris.filter(b => b.dipilih && b.atletId), [baris])

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return baris.filter(b =>
      (tapis === 'semua' || b.status === tapis) &&
      (!q || b.namaBerkas.toLowerCase().includes(q) || b.folderCabor.toLowerCase().includes(q)),
    )
  }, [baris, cari, tapis])

  function setuju(key: string) {
    setBaris(prev => prev.map(b => b.key !== key ? b : (
      b.kandidat ? { ...b, atletId: b.kandidat.id, atletNama: b.kandidat.nama, dipilih: true } : b
    )))
  }
  function tolak(key: string) {
    setBaris(prev => prev.map(b => b.key !== key ? b : { ...b, atletId: null, atletNama: null, dipilih: false }))
  }
  function setujuSemua(minSkor: number) {
    setBaris(prev => prev.map(b =>
      b.status === 'mirip' && b.kandidat && b.kandidat.skor >= minSkor
        ? { ...b, atletId: b.kandidat.id, atletNama: b.kandidat.nama, dipilih: true }
        : b))
  }

  async function simpan() {
    if (!terpilih.length) return
    setSibuk(`Menyiapkan ${terpilih.length} foto…`); setGalat(''); setHasil(null)
    let tersimpan = 0
    const gagal: string[] = []
    try {
      for (let i = 0; i < terpilih.length; i += PER_KIRIM) {
        const kelompok = terpilih.slice(i, i + PER_KIRIM)
        setSibuk(`Mengirim ${i + 1}–${Math.min(i + PER_KIRIM, terpilih.length)} dari ${terpilih.length}…`)
        const muatan: any[] = []
        for (const b of kelompok) {
          try {
            const { mime, data } = await kecilkan(b.file)
            muatan.push({ atlet_id: b.atletId, nama_berkas: b.namaBerkas, mime, data })
          } catch (e: any) { gagal.push(`${b.namaBerkas}: ${e.message}`) }
        }
        if (!muatan.length) continue
        const r = await fetch('/api/gateway/foto', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foto: muatan }),
        })
        const j = await r.json()
        if (!r.ok) throw new Error(j?.error ?? 'Gagal menyimpan')
        tersimpan += j.tersimpan ?? 0
        if (Array.isArray(j.gagal)) gagal.push(...j.gagal)
      }
      setHasil({ tersimpan, gagal })
      setBaris(prev => prev.map(b => (b.dipilih && b.atletId) ? { ...b, dipilih: false, sudahPunyaFoto: true } : b))
    } catch (e: any) {
      setGalat(e.message ?? 'Gagal menyimpan')
    } finally { setSibuk('') }
  }

  const warna: Record<Status, string> = {
    persis: '#34d399', mirip: '#38bdf8', ambigu: '#fbbf24',
    tidak_ketemu: '#f87171', bukan_atlet: '#64748b',
  }
  const label: Record<Status, string> = {
    persis: 'Cocok persis', mirip: 'Perlu dicek', ambigu: 'Ambigu',
    tidak_ketemu: 'Tidak ketemu', bukan_atlet: 'Bukan atlet',
  }

  return (
    <div className="min-h-screen text-zinc-300 font-sans"
      style={{ background: 'linear-gradient(135deg,#020a14 0%,#03101c 100%)' }}>
      <div className="max-w-6xl mx-auto p-5 md:p-8">

        <div className="flex items-center gap-3 mb-6">
          <Link href="/konida/atlet/kabbandung"
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10">
            <ArrowLeft size={16} />
          </Link>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: `${ACCENT}20`, color: ACCENT }}>
            <FolderOpen size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Tarik Pasfoto dari Folder</h1>
            <p className="text-xs text-slate-500">Unduh folder dari Drive, lalu pilih di sini · Kab. Bandung</p>
          </div>
        </div>

        {/* langkah */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-5">
          <ol className="text-sm text-slate-400 space-y-1.5 mb-4 list-decimal list-inside">
            <li>Di Google Drive, klik kanan folder <b className="text-slate-200">PENGUMPULAN FOTO</b> (atau satu folder cabor) → <b className="text-slate-200">Unduh</b>.</li>
            <li>Buka berkas ZIP hasil unduhan supaya menjadi folder biasa.</li>
            <li>Tekan tombol di bawah, lalu pilih folder itu.</li>
          </ol>
          <input ref={inputRef} type="file" multiple accept="image/*"
            // @ts-expect-error atribut khusus peramban untuk memilih folder
            webkitdirectory="" directory=""
            onChange={onPilihFolder} className="hidden" id="pilih-folder" />
          <label htmlFor="pilih-folder"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm cursor-pointer text-slate-900"
            style={{ background: ACCENT }}>
            <FolderOpen size={16} /> Pilih Folder
          </label>
          <p className="text-[11px] text-slate-600 mt-2">
            Foto diperkecil di komputer Anda sebelum dikirim. Berkas asli tidak diubah.
          </p>
        </div>

        {sibuk && (
          <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 mb-4 flex items-center gap-2 text-sm text-sky-300">
            <Loader2 size={15} className="animate-spin" /> {sibuk}
          </div>
        )}
        {galat && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 mb-4 text-sm text-red-300">{galat}</div>
        )}
        {hasil && (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 mb-4 text-sm text-emerald-300">
            <b>{hasil.tersimpan} foto tersimpan.</b>
            {hasil.gagal.length > 0 && (
              <div className="mt-1.5 text-amber-300 text-[12px]">
                {hasil.gagal.length} gagal: {hasil.gagal.slice(0, 5).join(' · ')}
                {hasil.gagal.length > 5 && ' …'}
              </div>
            )}
          </div>
        )}

        {baris.length > 0 && (
          <>
            {/* ringkasan */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mb-4">
              {(Object.keys(ringkas) as Status[]).map(k => (
                <button key={k} onClick={() => setTapis(tapis === k ? 'semua' : k)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    tapis === k ? 'bg-white/[0.07] border-white/25' : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05]'}`}>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label[k]}</div>
                  <div className="text-2xl font-bold" style={{ color: warna[k] }}>{ringkas[k]}</div>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari nama berkas / cabor…"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm outline-none focus:border-sky-500/50" />
              </div>
              {ringkas.mirip > 0 && (
                <>
                  <button onClick={() => setujuSemua(0.85)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] border border-white/10 hover:bg-white/10">
                    Setujui semua ≥ 0,85
                  </button>
                  <button onClick={() => setujuSemua(0.70)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] border border-white/10 hover:bg-white/10">
                    ≥ 0,70
                  </button>
                </>
              )}
              <button onClick={simpan} disabled={!terpilih.length || !!sibuk}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-900 disabled:opacity-40 inline-flex items-center gap-2"
                style={{ background: ACCENT }}>
                <Save size={15} /> Simpan {terpilih.length > 0 ? `(${terpilih.length})` : ''}
              </button>
            </div>

            {/* daftar */}
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              {tampil.slice(0, 300).map(b => (
                <div key={b.key} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] last:border-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: warna[b.status] }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-200 truncate">
                      {b.namaBerkas}
                      {b.sudahPunyaFoto && <span className="ml-2 text-[10px] text-amber-400">sudah ada foto</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {b.folderCabor}{b.caborDb && b.caborDb !== b.folderCabor ? ` → ${b.caborDb}` : ''}
                      {b.atletNama && <span className="text-emerald-400"> · {b.atletNama}</span>}
                      {!b.atletNama && b.kandidat && (
                        <span className="text-sky-400"> · usul: {b.kandidat.nama} ({b.kandidat.skor})</span>
                      )}
                      {b.saingan && <span className="text-amber-400"> vs {b.saingan.nama} ({b.saingan.skor})</span>}
                    </div>
                  </div>
                  {b.status === 'persis' && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
                  {(b.status === 'mirip' || b.status === 'ambigu') && !b.atletId && (
                    <button onClick={() => setuju(b.key)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30 shrink-0">
                      Setujui
                    </button>
                  )}
                  {b.atletId && b.status !== 'persis' && (
                    <button onClick={() => tolak(b.key)}
                      className="px-2.5 py-1 rounded-lg text-[11px] bg-white/5 text-slate-400 border border-white/10 shrink-0">
                      Batal
                    </button>
                  )}
                  {b.status === 'tidak_ketemu' && <XCircle size={16} className="text-red-400/70 shrink-0" />}
                  {b.status === 'bukan_atlet' && <ImageOff size={16} className="text-slate-600 shrink-0" />}
                </div>
              ))}
              {tampil.length > 300 && (
                <div className="px-4 py-2.5 text-[11px] text-slate-500">
                  Menampilkan 300 dari {tampil.length}. Pakai kotak cari atau tapis untuk mempersempit.
                </div>
              )}
            </div>
          </>
        )}

        {baris.length === 0 && !sibuk && (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
            <Users size={28} className="mx-auto text-slate-700 mb-3" />
            <p className="text-sm text-slate-500">Belum ada folder dipilih.</p>
          </div>
        )}

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 mt-5 flex gap-2.5">
          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[12px] text-slate-400">
            Sistem hanya menautkan sendiri bila nama berkas <b className="text-slate-200">persis sama</b> dengan nama atlet.
            Selebihnya menyodorkan usul untuk Anda putuskan. Baris bertanda <b className="text-amber-300">ambigu</b> cocok
            dengan lebih dari satu atlet — periksa keduanya sebelum menyetujui.
          </p>
        </div>

      </div>
    </div>
  )
}
