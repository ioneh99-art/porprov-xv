// src/lib/konijabar-sinkron.ts
// Membaca situs panitia (porprov.konijabar.or.id) lalu memasukkan hasil laga
// kontingen kita ke antrean pengesahan sebagai laporan "Situs KONI Jabar".
// KONIDA tetap yang memilah: laporan ini berstatus 'menunggu', tidak dihitung
// medali dan tidak tampil publik sebelum disahkan.
//
// Supaya situs panitia tidak dibanjiri: paling sering sekali per JEDA_MS (kecuali
// "Tarik sekarang"), hanya halaman jadwal beberapa hari terakhir, dan halaman laga
// hanya dibuka untuk laga kita yang sudah selesai dan belum pernah dibaca.

import { ambilSemua, dbLapor } from './lapor-sesi'
import { writeAudit } from './audit'
import {
  MULAI_LAGA, NAMA_KONTINGEN_SITUS, PELAPOR_KONIJABAR, SITUS_KONIJABAR, baku, bacaJadwalHarian, bacaLaga,
  cocokCabor, cocokPartai, keteranganLaporan, lagaKita, lawanSama, pilihNomorResmi, skorTeks, tebakHasil, urlLaga,
} from './konijabar'

export const JEDA_MS = 15 * 60_000
const HARI_KE_BELAKANG = 3
const AGEN = 'KONI-Kab-Bandung-Report/1.0 (+https://www.konikab-bdg.com)'

export interface RingkasSinkron {
  terakhir: string; dilewati?: boolean; alasan?: string
  hari: number; laga_kita: number; dibaca: number; laporan_baru: number; sudah_dilaporkan: number; tak_terbaca: number
  galat: string[]
}

const hariIniWIB = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10)
const geserHari = (iso: string, n: number) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86_400_000).toISOString().slice(0, 10)
const tidur = (ms: number) => new Promise(r => setTimeout(r, ms))

async function ambilHalaman(url: string): Promise<string> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), 12_000)
  try {
    const r = await fetch(url, { headers: { 'user-agent': AGEN, accept: 'text/html' }, signal: ac.signal, cache: 'no-store' })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return await r.text()
  } finally { clearTimeout(t) }
}

export async function statusSinkron(kontingenId: number) {
  const db = dbLapor()
  const [{ data: log }, { data: hasil }] = await Promise.all([
    db.from('sinkron_luar').select('terakhir,ringkas').eq('sumber', 'konijabar').eq('kontingen_id', kontingenId).maybeSingle(),
    db.from('hasil_luar').select('id,ref,cabor_id,cabor_teks,disiplin_teks,nomor_teks,babak,kode,tanggal,jam,venue,lawan,skor_kita,skor_lawan,akhir,url,partai_id,laporan_id,catatan,dibaca_at')
      .eq('sumber', 'konijabar').eq('kontingen_id', kontingenId).order('tanggal', { ascending: false }).limit(500),
  ])
  return { terakhir: log?.terakhir ?? null, ringkas: log?.ringkas ?? null, hasil: hasil ?? [] }
}

export async function sinkronKonijabar(kontingenId: number, opsi: { paksa?: boolean; oleh?: string } = {}): Promise<RingkasSinkron> {
  const kini = new Date().toISOString()
  const kosong = (alasan: string): RingkasSinkron => ({ terakhir: kini, dilewati: true, alasan, hari: 0, laga_kita: 0, dibaca: 0, laporan_baru: 0, sudah_dilaporkan: 0, tak_terbaca: 0, galat: [] })
  const namaKita = NAMA_KONTINGEN_SITUS[kontingenId]
  if (!namaKita) return kosong('Kontingen ini belum dipetakan ke situs KONI Jabar.')
  const db = dbLapor()

  const { data: log } = await db.from('sinkron_luar').select('terakhir,ringkas').eq('sumber', 'konijabar').eq('kontingen_id', kontingenId).maybeSingle()
  if (!opsi.paksa && log?.terakhir && Date.now() - Date.parse(log.terakhir) < JEDA_MS)
    return { ...(log.ringkas ?? kosong('')), terakhir: log.terakhir, dilewati: true }
  // Tandai dulu supaya dua pembukaan halaman bersamaan tidak membaca dua kali.
  await db.from('sinkron_luar').upsert({ sumber: 'konijabar', kontingen_id: kontingenId, terakhir: kini })

  const r: RingkasSinkron = { terakhir: kini, hari: 0, laga_kita: 0, dibaca: 0, laporan_baru: 0, sudah_dilaporkan: 0, tak_terbaca: 0, galat: [] }
  const hariIni = hariIniWIB()
  const { count } = await db.from('hasil_luar').select('id', { count: 'exact', head: true }).eq('sumber', 'konijabar').eq('kontingen_id', kontingenId)
  const awal = !count ? MULAI_LAGA : [MULAI_LAGA, geserHari(hariIni, -HARI_KE_BELAKANG)].sort()[1]
  const tanggal: string[] = []
  for (let t = awal; t <= hariIni; t = geserHari(t, 1)) tanggal.push(t)
  r.hari = tanggal.length

  // 1) Jadwal harian → laga kita yang sudah selesai.
  const target: string[] = []
  for (const t of tanggal) {
    try {
      const baris = bacaJadwalHarian(await ambilHalaman(`${SITUS_KONIJABAR}/jadwal?tgl=${t}`))
      for (const b of baris) if (b.tim.some(n => baku(n) === baku(namaKita))) { r.laga_kita++; if (b.selesai) target.push(b.ref) }
    } catch (e: any) { r.galat.push(`Jadwal ${t}: ${e?.message ?? e}`) }
    await tidur(250)
  }
  const { data: sudah } = await db.from('hasil_luar').select('ref').eq('sumber', 'konijabar').eq('kontingen_id', kontingenId).in('ref', target.length ? target : ['-'])
  const sudahRef = new Set((sudah ?? []).map((x: any) => x.ref))
  const baru = opsi.paksa ? target : target.filter(x => !sudahRef.has(x))

  if (baru.length) {
    // 2) Bahan pencocokan dari data kita.
    const [cabor, partaiMentah, laporan, atlet, daftar] = await Promise.all([
      ambilSemua<{ id: number; nama: string }>((d, s) => db.from('cabang_olahraga').select('id,nama').order('id').range(d, s)),
      ambilSemua<any>((d, s) => db.from('jadwal_partai').select('id,cabor_id,tanggal,jam,nomor_teks,disiplin,lawan,atlet_ids,status').eq('kontingen_id', kontingenId).gte('tanggal', MULAI_LAGA).order('id').range(d, s)),
      ambilSemua<any>((d, s) => db.from('laporan_hasil').select('id,cabor_id,partai_id,tanggal,lawan,status,ref_luar').eq('kontingen_id', kontingenId).gte('tanggal', MULAI_LAGA).order('id').range(d, s)),
      ambilSemua<{ id: number; nama_lengkap: string }>((d, s) => db.from('atlet').select('id,nama_lengkap').eq('kontingen_id', kontingenId).order('id').range(d, s)),
      ambilSemua<{ cabor_id: number; disiplin: string | null; nomor: string }>((d, s) => db.from('pendaftaran_nomor').select('cabor_id,disiplin,nomor').eq('kontingen_id', kontingenId).order('id').range(d, s)),
    ])
    const idAtlet = new Map<string, number>()
    for (const a of atlet) if (!idAtlet.has(baku(a.nama_lengkap))) idAtlet.set(baku(a.nama_lengkap), a.id)
    const namaAtlet = new Map(atlet.map(a => [a.id, a.nama_lengkap]))
    const partai = partaiMentah.filter(p => p.status !== 'batal')
      .map(p => ({ ...p, atlet_nama: (p.atlet_ids as number[]).map(id => namaAtlet.get(id)).filter(Boolean) as string[] }))

    // 3) Buka halaman laga satu per satu.
    for (const ref of baru) {
      await tidur(300)
      let laga
      try { laga = bacaLaga(await ambilHalaman(urlLaga(ref)), ref) } catch (e: any) { r.galat.push(`Laga ${ref}: ${e?.message ?? e}`); continue }
      const lk = laga ? lagaKita(laga, namaKita) : null
      if (!laga || !lk || !lk.akhir || !laga.tanggal) { r.tak_terbaca++; continue }
      r.dibaca++

      const caborId = cocokCabor(laga.cabor, cabor)
      const p = cocokPartai(lk, caborId, partai)
      const ada = laporan.find(l => l.ref_luar === ref)
        ?? laporan.find(l => l.status !== 'ditolak' && !l.ref_luar && (
          (p && l.partai_id === p.id) || (l.cabor_id === caborId && l.tanggal === laga!.tanggal && lawanSama(lk.lawan, l.lawan))))
      const tebak = tebakHasil(laga.babak, laga.kode, lk.akhir)
      const daftarCabor = daftar.filter(d => d.cabor_id === caborId)
      const nomorResmi = p?.nomor_teks ?? pilihNomorResmi(laga, daftarCabor)
      const atletIds = Array.from(new Set(lk.atlet.map(n => idAtlet.get(baku(n))).filter((x): x is number => x != null)))

      let laporanId: number | null = ada?.id ?? null
      let catatan: string | null = null
      if (ada && !ada.ref_luar) { r.sudah_dilaporkan++; catatan = `Sudah dilaporkan lewat jalur PIC/KONIDA (laporan #${ada.id}).` }
      else if (!ada && caborId == null) { catatan = `Cabor "${laga.cabor}" belum dikenali — tidak masuk antrean.` }
      else if (!ada && !(p?.atlet_ids?.length || atletIds.length)) { catatan = 'Nama atlet di situs tidak dikenali dan laga tidak bertaut ke jadwal — tidak masuk antrean.' }
      else if (!ada) {
        const { data: lap, error } = await db.from('laporan_hasil').insert({
          kontingen_id: kontingenId, cabor_id: caborId, partai_id: p?.id ?? null,
          nomor_teks: nomorResmi ?? [laga.disiplin, laga.nomor].filter(Boolean).join(' · '),
          disiplin: p?.disiplin ?? daftarCabor.find(d => d.nomor === nomorResmi)?.disiplin ?? laga.disiplin?.toUpperCase() ?? null,
          // Bertaut ke jadwal → atlet jadwal kita (sama dengan alur PIC); tidak bertaut → nama dari situs yang dikenali.
          atlet_ids: p?.atlet_ids?.length ? p.atlet_ids : atletIds,
          hasil: tebak.hasil, peringkat: tebak.peringkat, nilai_teks: skorTeks(lk),
          keterangan: keteranganLaporan(lk, tebak.catatan), tanggal: laga.tanggal, jam: laga.jam, lawan: lk.lawan,
          pelapor_nama: PELAPOR_KONIJABAR, status: 'menunggu', sumber_luar: 'konijabar', ref_luar: ref,
        }).select('id').single()
        if (error) { if (error.code !== '23505') r.galat.push(`Simpan laga ${ref}: ${error.message}`) }
        else { laporanId = lap.id; r.laporan_baru++; laporan.push({ id: lap.id, cabor_id: caborId, partai_id: p?.id ?? null, tanggal: laga.tanggal, lawan: lk.lawan, status: 'menunggu', ref_luar: ref }) }
      }

      const { error: eh } = await db.from('hasil_luar').upsert({
        sumber: 'konijabar', ref, kontingen_id: kontingenId, cabor_id: caborId,
        cabor_teks: laga.cabor, disiplin_teks: laga.disiplin, nomor_teks: laga.nomor, babak: laga.babak, kode: laga.kode,
        tanggal: laga.tanggal, jam: laga.jam, venue: laga.venue, status_luar: laga.status, selesai: laga.selesai,
        lawan: lk.lawan, skor_kita: lk.skorKita, skor_lawan: lk.skorLawan, akhir: lk.akhir, atlet_nama: lk.atlet,
        url: urlLaga(ref), partai_id: p?.id ?? null, laporan_id: laporanId, catatan, dibaca_at: new Date().toISOString(),
      }, { onConflict: 'sumber,ref,kontingen_id' })
      if (eh) r.galat.push(`Catat laga ${ref}: ${eh.message}`)
    }
  }

  await db.from('sinkron_luar').upsert({ sumber: 'konijabar', kontingen_id: kontingenId, terakhir: kini, ringkas: r })
  if (r.laporan_baru || r.galat.length) {
    await writeAudit({
      action: 'KONIJABAR_SINKRON', resource: 'laporan_hasil', kontingen_id: kontingenId,
      actor_email: opsi.oleh ?? 'otomatis', payload: r, severity: r.galat.length ? 'warning' : 'info',
    })
  }
  return r
}
