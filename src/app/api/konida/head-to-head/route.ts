// src/app/api/konida/head-to-head/route.ts
// Head-to-Head target emas KONI: lawan pasti (bagan situs panitia), pesaing utama
// (File B KONI), dan calon lawan (peserta situs panitia di cabor & putra/putri sama).
// GET              → ringkasan semua target (ringan, untuk daftar & kalender)
// GET ?urutan=N    → rincian satu target (termasuk calon lawan per kontingen + foto)
// POST {paksa?}    → tarik data dari situs panitia sekarang (bertahap, lihat lawan-sinkron)

import { NextRequest, NextResponse } from 'next/server'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { ambilSemua, dbLapor } from '@/lib/lapor-sesi'
import { cariAtletProyeksi, pecahNamaProyeksi, type AtletCalon } from '@/lib/warroom'
import { cocokBagan, genderNomor, kontingenDisebut, urlBagan, type BaganLuar } from '@/lib/lawan-luar'
import { calonLawan, grupKita, lawanDariBagan, type AtletLuarBaris } from '@/lib/head-to-head'
import { sinkronLawan } from '@/lib/lawan-sinkron'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const k = a.kontingen_id
  const db = dbLapor()
  const minta = Number(new URL(req.url).searchParams.get('urutan')) || null

  try {
    const [proyeksi, daftar, atletKita, intel, luar, bagan, { data: log }] = await Promise.all([
      ambilSemua<any>((d, s) => db.from('proyeksi_medali').select('urutan,tanggal,cabor_id,cabor_teks,nomor_teks,atlet_teks,kota').eq('kontingen_id', k).eq('medali', 'emas').order('urutan').range(d, s)),
      ambilSemua<{ cabor_id: number; atlet_id: number | null }>((d, s) => db.from('pendaftaran_nomor').select('cabor_id,atlet_id').eq('kontingen_id', k).order('id').range(d, s)),
      ambilSemua<any>((d, s) => db.from('atlet').select('id,nama_lengkap,foto_url,gender').eq('kontingen_id', k).order('id').range(d, s)),
      ambilSemua<any>((d, s) => db.from('intel_target_atlet').select('atlet_id,target_medali,pesaing,analisis').eq('kontingen_id', k).order('id').range(d, s)),
      ambilSemua<AtletLuarBaris & { cabor_situs: string }>((d, s) => db.from('atlet_luar').select('ref,slug,nama,kontingen,cabor_id,cabor_situs,gender,foto').eq('sumber', 'konijabar').order('ref').range(d, s)),
      ambilSemua<{ ref: number; nama: string; data: BaganLuar; dibaca_at: string }>((d, s) => db.from('bagan_luar').select('ref,nama,data,dibaca_at').eq('sumber', 'konijabar').order('ref').range(d, s)),
      db.from('sinkron_luar').select('terakhir,ringkas').eq('sumber', 'konijabar_lawan').eq('kontingen_id', k).maybeSingle(),
    ])

    // Atlet kita per target (sama dengan Perburuan Emas): dicari di atlet terdaftar cabornya.
    const peta = new Map<number, AtletCalon>(atletKita.map((x: any) => [x.id, { id: x.id, nama: x.nama_lengkap, foto: x.foto_url ?? null }]))
    const genderKita = new Map<number, string | null>(atletKita.map((x: any) => [x.id, x.gender ?? null]))
    const semuaKita = Array.from(peta.values())
    const kolamKita = new Map<number, AtletCalon[]>()
    for (const d of daftar) {
      const x = d.atlet_id != null ? peta.get(d.atlet_id) : undefined
      if (!x) continue
      const l = kolamKita.get(d.cabor_id) ?? []
      if (!l.some(y => y.id === x.id)) l.push(x)
      kolamKita.set(d.cabor_id, l)
    }
    const intelPer = new Map<number, any[]>()
    for (const r of intel) if (r.atlet_id != null) intelPer.set(r.atlet_id, [...(intelPer.get(r.atlet_id) ?? []), r])

    // Nama cabor di situs untuk cabor kita (dari data peserta yang sudah dibaca) → cocokkan bagan.
    const namaCaborSitus = new Map<number, string>()
    for (const r of luar) if (r.cabor_id != null && !namaCaborSitus.has(r.cabor_id)) namaCaborSitus.set(r.cabor_id, r.cabor_situs)
    const daftarBagan = bagan.map(b => ({ ref: b.ref, nama: b.nama }))
    const baganPer = new Map(bagan.map(b => [b.ref, b]))
    const fotoRef = new Map(luar.map(r => [r.ref, r.foto]))
    const kontingenSemua = Array.from(new Set(luar.map(r => r.kontingen)))

    const target = proyeksi.filter((p: any) => !minta || p.urutan === minta).map((p: any) => {
      const pool = p.cabor_id != null ? (kolamKita.get(p.cabor_id) ?? []) : []
      const wajah = pecahNamaProyeksi(p.atlet_teks).map(n => {
        const x = cariAtletProyeksi(n, pool, semuaKita)
        return { nama: x?.nama ?? n, foto: x?.foto ?? null, atlet_id: x?.id ?? null }
      })
      // File B: pesaing & analisis atlet kita (target emas didahulukan).
      const fileB = wajah.flatMap(w => w.atlet_id != null ? intelPer.get(w.atlet_id) ?? [] : [])
        .sort((x, y) => Number(y.target_medali === 'emas') - Number(x.target_medali === 'emas'))
      const pesaing = Array.from(new Set(fileB.map(r => (r.pesaing ?? '').trim()).filter(Boolean))).join(' · ')
      const analisis = Array.from(new Set(fileB.map(r => (r.analisis ?? '').trim()).filter(Boolean)))
      const caborSitusNama = p.cabor_id != null ? namaCaborSitus.get(p.cabor_id) : undefined
      // Nomor tanpa putra/putri: jenis kelamin dari atlet kita (bila semuanya sama).
      const gAtlet = Array.from(new Set(wajah.map(w => w.atlet_id != null ? genderKita.get(w.atlet_id) : null).filter(Boolean)))
      const gTarget = genderNomor(p.nomor_teks) ?? (gAtlet.length === 1 ? gAtlet[0] as 'L' | 'P' : null)
      const cocok = caborSitusNama ? cocokBagan(caborSitusNama, p.nomor_teks, daftarBagan, { gender: gTarget, caborTeks: p.cabor_teks }) : null
      const b = cocok ? baganPer.get(cocok.ref) ?? null : null
      const lawan = lawanDariBagan(b?.data ?? null, fotoRef)
      const calon = calonLawan(gTarget === 'L' ? `${p.nomor_teks ?? ''} Putra` : gTarget === 'P' ? `${p.nomor_teks ?? ''} Putri` : p.nomor_teks, p.cabor_id, luar, pesaing, kontingenSemua, minta ? 24 : 0)
      return {
        urutan: p.urutan, tanggal: p.tanggal, cabor: p.cabor_teks, cabor_id: p.cabor_id, nomor: p.nomor_teks, kota: p.kota,
        gender: gTarget, wajah,
        bagan: b ? { ref: b.ref, nama: b.nama, url: urlBagan(b.ref), dibaca_at: b.dibaca_at } : null,
        lawan_pasti: lawan, grup: grupKita(b?.data ?? null),
        pesaing: pesaing || null, analisis, kontingen_disebut: kontingenDisebut(pesaing, kontingenSemua).filter(x => x !== 'Kab. Bandung'),
        calon_jumlah: calon.reduce((n, c) => n + c.jumlah, 0), calon_kontingen: calon.length,
        calon: minta ? calon : calon.slice(0, 4).map(c => ({ ...c, atlet: [] })),
      }
    })
    return NextResponse.json({ sinkron: { terakhir: log?.terakhir ?? null, ringkas: log?.ringkas ?? null, peserta: luar.length, bagan: bagan.length }, target })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Gagal memuat.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const b = await req.json().catch(() => ({}))
  try {
    return NextResponse.json(await sinkronLawan(a.kontingen_id, { paksa: b?.paksa === true, oleh: a.nama }))
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Gagal menarik data.' }, { status: 500 })
  }
}
