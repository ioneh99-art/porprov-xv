// src/lib/lawan-sinkron.ts
// Menarik bahan Head-to-Head dari situs panitia: peserta per cabor (hanya cabor
// yang punya target emas Kab. Bandung) dan bagan nomor-nomor target.
// Sopan terhadap situs panitia: jeda antarhalaman, batas waktu per jalan (sisanya
// dilanjutkan pada jalan berikutnya), daftar peserta paling sering tiap 6 jam,
// bagan paling sering tiap 15 menit (kecuali "Tarik sekarang").

import { SITUS_KONIJABAR, cocokCabor } from './konijabar'
import { ambilHalaman } from './konijabar-sinkron'
import { ambilSemua, dbLapor } from './lapor-sesi'
import { writeAudit } from './audit'
import { bacaBagan, bacaDaftarAtlet, bacaDaftarBagan, bacaPilihanCabor, cocokBagan } from './lawan-luar'

export const SEGAR_PESERTA_MS = 6 * 3_600_000
export const SEGAR_BAGAN_MS = 15 * 60_000
const ANGGARAN_MS = 40_000          // satu jalan berhenti sebelum batas 60 dtk fungsi server
const JEDA_HALAMAN_MS = 300
const SUMBER_LOG = 'konijabar_lawan'

const tidur = (ms: number) => new Promise(r => setTimeout(r, ms))

export interface RingkasLawan {
  terakhir: string; cabor_dibaca: string[]; atlet_disimpan: number; cabor_tersisa: number
  bagan_dibaca: number; target_berbagan: number; galat: string[]; dilewati?: boolean
}

/** Target emas kontingen + nama cabornya di kita. */
async function targetEmas(kontingenId: number) {
  const db = dbLapor()
  const proyeksi = await ambilSemua<{ urutan: number; tanggal: string; cabor_id: number | null; cabor_teks: string; nomor_teks: string | null }>((d, s) =>
    db.from('proyeksi_medali').select('urutan,tanggal,cabor_id,cabor_teks,nomor_teks').eq('kontingen_id', kontingenId).eq('medali', 'emas').order('urutan').range(d, s))
  const { data: cabor } = await db.from('cabang_olahraga').select('id,nama')
  return { proyeksi, cabor: (cabor ?? []) as { id: number; nama: string }[] }
}

export async function sinkronLawan(kontingenId: number, opsi: { paksa?: boolean; oleh?: string } = {}): Promise<RingkasLawan> {
  const mulai = Date.now()
  const db = dbLapor()
  const r: RingkasLawan = { terakhir: new Date().toISOString(), cabor_dibaca: [], atlet_disimpan: 0, cabor_tersisa: 0, bagan_dibaca: 0, target_berbagan: 0, galat: [] }
  const { proyeksi, cabor } = await targetEmas(kontingenId)
  const caborTarget = new Set(proyeksi.map(p => p.cabor_id).filter((x): x is number => x != null))

  // 1) Peserta per cabor — cabor yang datanya paling lama dibaca lebih dulu.
  let pilihan: { id: number; nama: string }[] = []
  try { pilihan = bacaPilihanCabor(await ambilHalaman(`${SITUS_KONIJABAR}/atlet`)) } catch (e: any) { r.galat.push(`Daftar cabor: ${e?.message ?? e}`) }
  const pasangan = pilihan.map(p => ({ situs: p, kita: cocokCabor(p.nama, cabor) }))
    .filter((x): x is { situs: { id: number; nama: string }; kita: number } => x.kita != null && caborTarget.has(x.kita))
  const terakhirPerCabor = new Map<number, number>()
  await Promise.all(pasangan.map(async p => {
    const { data } = await db.from('atlet_luar').select('dibaca_at').eq('sumber', 'konijabar').eq('cabor_id', p.kita).order('dibaca_at', { ascending: false }).limit(1)
    terakhirPerCabor.set(p.kita, data?.[0] ? Date.parse((data[0] as any).dibaca_at) : 0)
  }))
  const antre = pasangan
    .filter(p => opsi.paksa || Date.now() - (terakhirPerCabor.get(p.kita) ?? 0) > SEGAR_PESERTA_MS)
    .sort((a, b) => (terakhirPerCabor.get(a.kita) ?? 0) - (terakhirPerCabor.get(b.kita) ?? 0))

  for (const p of antre) {
    if (Date.now() - mulai > ANGGARAN_MS) { r.cabor_tersisa++; continue }
    try {
      const kini = new Date().toISOString()
      const semua: any[] = []
      for (let hal = 1, total = 1; hal <= total && hal <= 60; hal++) {
        const d = bacaDaftarAtlet(await ambilHalaman(`${SITUS_KONIJABAR}/atlet?cabor=${p.situs.id}&hal=${hal}`))
        total = d.totalHalaman
        semua.push(...d.atlet.map(a => ({ sumber: 'konijabar', ref: a.ref, slug: a.slug, nama: a.nama, kontingen: a.kontingen, cabor_situs: a.cabor || p.situs.nama, cabor_id: p.kita, gender: a.gender, foto: a.foto, dibaca_at: kini })))
        await tidur(JEDA_HALAMAN_MS)
      }
      for (let i = 0; i < semua.length; i += 500) {
        const { error } = await db.from('atlet_luar').upsert(semua.slice(i, i + 500), { onConflict: 'sumber,ref' })
        if (error) throw new Error(error.message)
      }
      // Peserta yang sudah tidak ada di situs untuk cabor ini dibuang (seluruh halaman terbaca).
      if (semua.length) await db.from('atlet_luar').delete().eq('sumber', 'konijabar').eq('cabor_id', p.kita).lt('dibaca_at', kini)
      r.cabor_dibaca.push(p.situs.nama); r.atlet_disimpan += semua.length
    } catch (e: any) { r.galat.push(`Peserta ${p.situs.nama}: ${e?.message ?? e}`) }
  }

  // 2) Bagan nomor-nomor target.
  const { data: log } = await db.from('sinkron_luar').select('ringkas').eq('sumber', SUMBER_LOG).eq('kontingen_id', kontingenId).maybeSingle()
  const baganTerakhir = Date.parse((log?.ringkas as any)?.bagan_at ?? '') || 0
  let baganAt = (log?.ringkas as any)?.bagan_at ?? null
  if (opsi.paksa || Date.now() - baganTerakhir > SEGAR_BAGAN_MS) {
    try {
      const daftar = bacaDaftarBagan(await ambilHalaman(`${SITUS_KONIJABAR}/bagan`))
      const namaSitus = new Map(pasangan.map(p => [p.kita, p.situs.nama]))
      const refs = new Set<number>()
      for (const t of proyeksi) {
        const c = t.cabor_id != null ? namaSitus.get(t.cabor_id) : null
        if (!c) continue
        // Nomor tanpa putra/putri: ambil kandidat kedua jenis kelamin; rute API memilih sesuai atlet kita.
        const pilih = [null, 'L', 'P'].map(g => cocokBagan(c, t.nomor_teks, daftar, { gender: g as 'L' | 'P' | null, caborTeks: t.cabor_teks })).filter(Boolean) as { ref: number }[]
        if (pilih.length) r.target_berbagan++
        for (const b of pilih) refs.add(b.ref)
      }
      for (const ref of Array.from(refs)) {
        if (Date.now() - mulai > ANGGARAN_MS + 15_000) break
        await tidur(JEDA_HALAMAN_MS)
        try {
          const data = bacaBagan(await ambilHalaman(`${SITUS_KONIJABAR}/bagan?nomor=${ref}`))
          const nama = daftar.find(d => d.ref === ref)?.nama ?? `Nomor ${ref}`
          const { error } = await db.from('bagan_luar').upsert({ sumber: 'konijabar', ref, nama, data, dibaca_at: new Date().toISOString() }, { onConflict: 'sumber,ref' })
          if (error) throw new Error(error.message)
          r.bagan_dibaca++
        } catch (e: any) { r.galat.push(`Bagan ${ref}: ${e?.message ?? e}`) }
      }
      baganAt = new Date().toISOString()
    } catch (e: any) { r.galat.push(`Daftar bagan: ${e?.message ?? e}`) }
  } else r.dilewati = !antre.length

  await db.from('sinkron_luar').upsert({ sumber: SUMBER_LOG, kontingen_id: kontingenId, terakhir: r.terakhir, ringkas: { ...r, bagan_at: baganAt } })
  if (r.atlet_disimpan || r.bagan_dibaca || r.galat.length) {
    await writeAudit({ action: 'KONIJABAR_LAWAN_SINKRON', resource: 'atlet_luar', kontingen_id: kontingenId, actor_email: opsi.oleh ?? 'otomatis',
      payload: r, severity: r.galat.length ? 'warning' : 'info' })
  }
  return r
}
