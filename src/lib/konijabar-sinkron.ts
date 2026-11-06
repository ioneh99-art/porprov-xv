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
import { genderNomor } from './lawan-luar'

/** Putra/putri dua tulisan nomor tidak bertentangan (salah satu tanpa keterangan = boleh). */
const genderSejalan = (a: string | null | undefined, b: string | null | undefined) => { const x = genderNomor(a), y = genderNomor(b); return !x || !y || x === y }
import { writeAudit } from './audit'
import { babakGrup, bacaGrupMurni, medaliGrup, refGrup, urlBaganGrup } from './grup-medali'
import { ALASAN_KEMBAR } from './lapor-kembar'
import { MEDALI, MESIN_EMAS, rencanaMesinEmas, type LaporMesin, type TargetEmas } from './mesin-emas'
import { segarkanPublik } from './partai-server'
import {
  MULAI_LAGA, NAMA_KONTINGEN_SITUS, PELAPOR_KONIJABAR, SITUS_KONIJABAR, baku, bacaJadwalHarian, bacaKlasemen, bacaLaga,
  cariAlarm, cocokCabor, cocokPartai, keteranganLaporan, lagaKita, lawanSama, pilihNomorResmi, skorTeks, tebakHasil, urlLaga,
  type AlarmBeda, type HasilLuarBanding, type LaporanBanding,
} from './konijabar'

export const JEDA_MS = 15 * 60_000
const HARI_KE_BELAKANG = 3
/** Laga kemarin & hari ini dibaca ulang (paling sering sekali per jam) untuk menangkap koreksi panitia. */
const BACA_ULANG_MS = 60 * 60_000
const AGEN = 'KONI-Kab-Bandung-Report/1.0 (+https://www.konikab-bdg.com)'

export interface RingkasSinkron {
  terakhir: string; dilewati?: boolean; alasan?: string
  hari: number; laga_kita: number; dibaca: number; laporan_baru: number; sudah_dilaporkan: number; tak_terbaca: number
  /** Skor di situs berubah dibanding pembacaan sebelumnya. */
  berubah?: number
  /** Klasemen resmi: jumlah kontingen yang angkanya diperbarui + jam pembaruan menurut situs. */
  klasemen?: { diubah: number; kontingen: number; situs: string | null }
  /**
   * Bagan nomor sistem grup yang diikuti kita (kunci = ref bagan): laporan dasar kita di nomor itu
   * dan apakah sudah tuntas diperiksa. Dibawa dari sinkron ke sinkron sampai grupnya selesai.
   */
  grup?: Record<string, { laporan: number; tuntas: boolean }>
  /** Laporan medali baru dari klasemen grup murni (setengah kompetisi). */
  medali_grup?: number
  /** Mesin Emas: target emas yang hasilnya disahkan otomatis / ditahan untuk KONIDA. */
  mesin_emas?: { disahkan: { id: number; urutan: number; hasil: string; nomor: string | null; atlet: string | null }[]; ditahan: { urutan: number; laporan: number; alasan: string; nomor: string | null; atlet: string | null }[] }
  galat: string[]
}

const hariIniWIB = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10)
const geserHari = (iso: string, n: number) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86_400_000).toISOString().slice(0, 10)
const tidur = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * Klasemen medali resmi (terverifikasi panitia) → klasemen_medali untuk 26 kontingen LAIN.
 * Angka Kab. Bandung tidak ditimpa: War Room/layar menghitungnya dari laporan yang disahkan KONIDA.
 * Menggantikan pengetikan manual "Perbarui klasemen" (tombol itu tetap ada sebagai cadangan).
 */
async function sinkronKlasemen(kontingenId: number, oleh: string): Promise<RingkasSinkron['klasemen']> {
  const j = JSON.parse(await ambilHalaman(`${SITUS_KONIJABAR}/data/tally.json`))
  const baris = bacaKlasemen(String(j?.rows_html ?? ''))
  if (baris.length < 20) throw new Error(`klasemen situs hanya ${baris.length} baris — tidak dipakai`)
  const db = dbLapor()
  const [{ data: kontingen }, { data: lama }] = await Promise.all([
    db.from('kontingen').select('id,nama'),
    db.from('klasemen_medali').select('kontingen_id,emas,perak,perunggu'),
  ])
  const idNama = new Map((kontingen ?? []).map((k: any) => [baku(k.nama), k.id as number]))
  const petaLama = new Map((lama ?? []).map((r: any) => [r.kontingen_id, r]))
  const kini = new Date().toISOString()
  const diubah: any[] = []
  for (const b of baris) {
    const id = idNama.get(baku(b.nama))
    if (id == null || id === kontingenId) continue
    const l: any = petaLama.get(id)
    if (!l || (l.emas === b.emas && l.perak === b.perak && l.perunggu === b.perunggu)) continue
    const { error } = await db.from('klasemen_medali')
      .update({ emas: b.emas, perak: b.perak, perunggu: b.perunggu, total: b.emas + b.perak + b.perunggu, updated_at: kini }).eq('kontingen_id', id)
    if (error) throw new Error(error.message)
    diubah.push({ kontingen_id: id, sebelum: { emas: l.emas, perak: l.perak, perunggu: l.perunggu }, sesudah: { emas: b.emas, perak: b.perak, perunggu: b.perunggu } })
  }
  if (diubah.length) await writeAudit({ action: 'KLASEMEN_RESMI_OTOMATIS', resource: 'klasemen_medali', kontingen_id: kontingenId, actor_email: oleh, payload: { sumber: 'porprov.konijabar.or.id', diubah } })
  return { diubah: diubah.length, kontingen: baris.length, situs: typeof j?.updated === 'string' ? j.updated : null }
}

export async function ambilHalaman(url: string): Promise<string> {
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
    db.from('hasil_luar').select('id,ref,cabor_id,cabor_teks,disiplin_teks,nomor_teks,babak,kode,tanggal,jam,venue,lawan,skor_kita,skor_lawan,akhir,url,partai_id,laporan_id,catatan,dibaca_at,skor_sebelum,berubah_at,dicek_kunci,dicek_oleh,dicek_at')
      .eq('sumber', 'konijabar').eq('kontingen_id', kontingenId).order('tanggal', { ascending: false }).limit(500),
  ])
  return { terakhir: log?.terakhir ?? null, ringkas: log?.ringkas ?? null, hasil: hasil ?? [], alarm: await hitungAlarm(kontingenId, (hasil ?? []) as HasilLuarBanding[]) }
}

/** Bandingkan hasil situs dengan semua laporan kita untuk laga yang sama. */
async function hitungAlarm(kontingenId: number, hasil: HasilLuarBanding[]): Promise<AlarmBeda[]> {
  if (!hasil.length) return []
  const db = dbLapor()
  const [laporan, partai] = await Promise.all([
    ambilSemua<LaporanBanding>((d, s) => db.from('laporan_hasil').select('id,cabor_id,partai_id,tanggal,lawan,hasil,nilai_teks,status,pelapor_nama,ref_luar,nomor_teks')
      .eq('kontingen_id', kontingenId).gte('tanggal', MULAI_LAGA).neq('status', 'ditolak').order('id').range(d, s)),
    ambilSemua<{ id: number; lawan: string | null }>((d, s) => db.from('jadwal_partai').select('id,lawan').eq('kontingen_id', kontingenId).gte('tanggal', MULAI_LAGA).order('id').range(d, s)),
  ])
  return cariAlarm(hasil, laporan, new Map(partai.map(p => [p.id, p.lawan])))
}

/** KONIDA menandai satu perbandingan "sudah dicek" — alarmnya padam sampai salah satu sisi berubah lagi. */
export async function tandaiDicek(kontingenId: number, ref: string, kunci: string, oleh: string) {
  const db = dbLapor()
  const { data: h } = await db.from('hasil_luar').select('id,dicek_kunci').eq('sumber', 'konijabar').eq('kontingen_id', kontingenId).eq('ref', ref).maybeSingle()
  if (!h) return { error: 'Laga tidak ditemukan.' }
  if (!kunci.startsWith(`${ref}:`)) return { error: 'Tanda cek tidak cocok dengan laga ini.' }
  const kumpulan = Array.from(new Set([...(h.dicek_kunci ?? '').split('\n').filter(Boolean), kunci])).slice(-20)
  const { error } = await db.from('hasil_luar').update({ dicek_kunci: kumpulan.join('\n'), dicek_oleh: oleh, dicek_at: new Date().toISOString() }).eq('id', h.id)
  if (error) return { error: error.message }
  await writeAudit({ action: 'KONIJABAR_ALARM_DICEK', resource: 'hasil_luar', resource_id: h.id, kontingen_id: kontingenId, actor_email: oleh, payload: { ref, kunci } })
  return { ok: true }
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
  r.grup = { ...(((log?.ringkas as any)?.grup ?? {}) as NonNullable<RingkasSinkron['grup']>) }
  const hariIni = hariIniWIB()
  const { count } = await db.from('hasil_luar').select('id', { count: 'exact', head: true }).eq('sumber', 'konijabar').eq('kontingen_id', kontingenId)
  const awal = !count ? MULAI_LAGA : [MULAI_LAGA, geserHari(hariIni, -HARI_KE_BELAKANG)].sort()[1]
  const tanggal: string[] = []
  for (let t = awal; t <= hariIni; t = geserHari(t, 1)) tanggal.push(t)
  r.hari = tanggal.length

  // 0) Klasemen resmi panitia.
  try { r.klasemen = await sinkronKlasemen(kontingenId, opsi.oleh ?? 'otomatis') } catch (e: any) { r.galat.push(`Klasemen: ${e?.message ?? e}`) }

  // 1) Jadwal harian → laga kita yang sudah selesai.
  const target: { ref: string; tgl: string }[] = []
  for (const t of tanggal) {
    try {
      const baris = bacaJadwalHarian(await ambilHalaman(`${SITUS_KONIJABAR}/jadwal?tgl=${t}`))
      for (const b of baris) if (b.tim.some(n => baku(n) === baku(namaKita))) { r.laga_kita++; if (b.selesai) target.push({ ref: b.ref, tgl: t }) }
    } catch (e: any) { r.galat.push(`Jadwal ${t}: ${e?.message ?? e}`) }
    await tidur(250)
  }
  const { data: sudah } = await db.from('hasil_luar').select('ref,skor_kita,skor_lawan,akhir,dibaca_at,skor_sebelum,berubah_at')
    .eq('sumber', 'konijabar').eq('kontingen_id', kontingenId).in('ref', target.length ? target.map(x => x.ref) : ['-'])
  const lama = new Map((sudah ?? []).map((x: any) => [x.ref, x]))
  const kemarin = geserHari(hariIni, -1)
  // Laga baru selalu dibaca; laga kemarin/hari ini dibaca ulang tiap jam (koreksi panitia); "Tarik sekarang" membaca ulang semua.
  const baru = target.filter(x => {
    const l = lama.get(x.ref)
    return opsi.paksa || !l || (x.tgl >= kemarin && Date.now() - Date.parse(l.dibaca_at) > BACA_ULANG_MS)
  }).map(x => x.ref)

  if (baru.length) {
    // 2) Bahan pencocokan dari data kita.
    const [cabor, partaiMentah, laporan, atlet, daftar] = await Promise.all([
      ambilSemua<{ id: number; nama: string }>((d, s) => db.from('cabang_olahraga').select('id,nama').order('id').range(d, s)),
      ambilSemua<any>((d, s) => db.from('jadwal_partai').select('id,cabor_id,tanggal,jam,nomor_teks,disiplin,lawan,atlet_ids,status').eq('kontingen_id', kontingenId).gte('tanggal', MULAI_LAGA).order('id').range(d, s)),
      ambilSemua<any>((d, s) => db.from('laporan_hasil').select('id,cabor_id,partai_id,tanggal,lawan,status,ref_luar,hasil,nilai_teks,nomor_teks').eq('kontingen_id', kontingenId).gte('tanggal', MULAI_LAGA).order('id').range(d, s)),
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
          (p && l.partai_id === p.id) || (l.cabor_id === caborId && l.tanggal === laga!.tanggal && lawanSama(lk.lawan, l.lawan) && genderSejalan(laga!.nomor, l.nomor_teks))))
      const tebak = tebakHasil(laga.babak, laga.kode, lk.akhir)
      const daftarCabor = daftar.filter(d => d.cabor_id === caborId)
      const nomorResmi = p?.nomor_teks ?? pilihNomorResmi(laga, daftarCabor)
      const atletIds = Array.from(new Set(lk.atlet.map(n => idAtlet.get(baku(n))).filter((x): x is number => x != null)))

      // Koreksi panitia: skor/akhir berbeda dari pembacaan sebelumnya.
      const sblm = lama.get(ref)
      const berubah = !!sblm && (sblm.skor_kita !== lk.skorKita || sblm.skor_lawan !== lk.skorLawan || sblm.akhir !== lk.akhir)
      if (berubah) r.berubah = (r.berubah ?? 0) + 1

      let laporanId: number | null = ada?.id ?? null
      let catatan: string | null = null
      if (ada?.ref_luar && berubah && ada.status === 'menunggu') {
        // Laporan dari situs yang belum diputus ikut diperbarui; yang sudah disahkan TIDAK diubah — alarm yang memberi tahu.
        await db.from('laporan_hasil').update({ hasil: tebak.hasil, peringkat: tebak.peringkat, nilai_teks: skorTeks(lk), keterangan: keteranganLaporan(lk, tebak.catatan), updated_at: new Date().toISOString() })
          .eq('id', ada.id).eq('status', 'menunggu')
      }
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

      // Laga babak grup: ingat bagannya — kalau ternyata grup murni (tanpa final), medali dibaca dari klasemennya.
      if (laporanId != null && laga.bagan && babakGrup(laga.babak) && (tebak.hasil === 'menang' || tebak.hasil === 'kalah')) {
        const g = r.grup![String(laga.bagan)]
        if (!g) r.grup![String(laga.bagan)] = { laporan: laporanId, tuntas: false }
        else if (!g.tuntas) g.laporan = laporanId
      }

      const { error: eh } = await db.from('hasil_luar').upsert({
        sumber: 'konijabar', ref, kontingen_id: kontingenId, cabor_id: caborId,
        cabor_teks: laga.cabor, disiplin_teks: laga.disiplin, nomor_teks: laga.nomor, babak: laga.babak, kode: laga.kode,
        tanggal: laga.tanggal, jam: laga.jam, venue: laga.venue, status_luar: laga.status, selesai: laga.selesai,
        lawan: lk.lawan, skor_kita: lk.skorKita, skor_lawan: lk.skorLawan, akhir: lk.akhir, atlet_nama: lk.atlet,
        url: urlLaga(ref), partai_id: p?.id ?? null, laporan_id: laporanId, catatan, dibaca_at: new Date().toISOString(),
        ...(berubah ? { skor_sebelum: `${sblm.skor_kita ?? '–'}-${sblm.skor_lawan ?? '–'}`, berubah_at: new Date().toISOString() } : {}),
      }, { onConflict: 'sumber,ref,kontingen_id' })
      if (eh) r.galat.push(`Catat laga ${ref}: ${eh.message}`)
    }
  }

  // 4) Kelas sistem grup murni: medali dari klasemen grup yang sudah selesai.
  try { await periksaGrup(kontingenId, namaKita, r) } catch (e: any) { r.galat.push(`Klasemen grup: ${e?.message ?? e}`) }

  // 5) Mesin Emas: target emas yang hasilnya final di situs → disahkan otomatis.
  try { await jalankanMesinEmas(kontingenId, r) } catch (e: any) { r.galat.push(`Mesin Emas: ${e?.message ?? e}`) }

  await db.from('sinkron_luar').upsert({ sumber: 'konijabar', kontingen_id: kontingenId, terakhir: kini, ringkas: r })
  if (r.laporan_baru || r.berubah || r.galat.length || r.mesin_emas?.disahkan.length) {
    await writeAudit({
      action: 'KONIJABAR_SINKRON', resource: 'laporan_hasil', kontingen_id: kontingenId,
      actor_email: opsi.oleh ?? 'otomatis', payload: r, severity: r.galat.length ? 'warning' : 'info',
    })
  }
  return r
}

/** Paling banyak sekian bagan grup dibuka per sinkron (situs panitia jangan dibanjiri). */
const BAGAN_GRUP_PER_SINKRON = 12
const kunciNomor = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Buka bagan nomor grup yang belum tuntas. Grup dengan babak gugur → tuntas (medalinya dari laga
 * Final/Perebutan juara 3, sudah dibaca di langkah 3). Grup murni yang semua laganya selesai →
 * kontingen kita peringkat 1/2/3 masuk Antrean sebagai laporan medali (status menunggu).
 * Tidak membuat laporan bila medali yang sama untuk nomor itu sudah ada (dari PIC/KONIDA/situs).
 */
async function periksaGrup(kontingenId: number, namaKita: string, r: RingkasSinkron) {
  const db = dbLapor()
  const terbuka = Object.entries(r.grup ?? {}).filter(([, g]) => !g.tuntas).slice(0, BAGAN_GRUP_PER_SINKRON)
  let atletKita: Map<string, number> | null = null
  for (const [bagan, g] of terbuka) {
    await tidur(300)
    const gm = bacaGrupMurni(await ambilHalaman(urlBaganGrup(bagan)))
    if (!gm.murni) { g.tuntas = true; continue }
    if (!gm.selesai) continue
    g.tuntas = true
    const medali = medaliGrup(gm, namaKita)
    if (!medali.length) continue

    const { data: dasar } = await db.from('laporan_hasil').select('cabor_id,nomor_teks,disiplin,atlet_ids,tanggal')
      .eq('id', g.laporan).eq('kontingen_id', kontingenId).maybeSingle()
    if (!dasar) { r.galat.push(`Klasemen grup ${bagan}: laporan dasar #${g.laporan} tidak ditemukan`); continue }
    const { data: sejenis } = await db.from('laporan_hasil').select('id,hasil,status,ref_luar,nomor_teks')
      .eq('kontingen_id', kontingenId).eq('cabor_id', dasar.cabor_id)

    for (const m of medali) {
      const ref = refGrup(Number(bagan), m.peserta.peringkat)
      if ((sejenis ?? []).some((l: any) => l.ref_luar === ref)) continue
      if ((sejenis ?? []).some((l: any) => l.status !== 'ditolak' && l.hasil === m.hasil && kunciNomor(l.nomor_teks) === kunciNomor(dasar.nomor_teks))) continue

      // Atlet: perorangan → cari nama di data kita; beregu/tak ketemu → atlet laporan dasar.
      let atlet_ids: number[] = dasar.atlet_ids ?? []
      if (m.peserta.kontingen && (medali.length > 1 || !atlet_ids.length)) {
        if (!atletKita) {
          const semua = await ambilSemua<{ id: number; nama_lengkap: string }>((d, s) => db.from('atlet').select('id,nama_lengkap').eq('kontingen_id', kontingenId).order('id').range(d, s))
          atletKita = new Map(semua.map(a => [baku(a.nama_lengkap), a.id]))
        }
        const id = atletKita.get(baku(m.peserta.nama))
        if (id != null) atlet_ids = [id]
      }

      const { error } = await db.from('laporan_hasil').insert({
        kontingen_id: kontingenId, cabor_id: dasar.cabor_id, partai_id: null,
        nomor_teks: dasar.nomor_teks, disiplin: dasar.disiplin, atlet_ids,
        hasil: m.hasil, peringkat: null,
        nilai_teks: `Peringkat ${m.peserta.peringkat} grup${m.peserta.poin != null ? ` · ${m.peserta.poin} poin` : ''}`,
        keterangan: `Situs KONI Jabar: sistem grup (setengah kompetisi), tanpa laga final — peringkat ${m.peserta.peringkat} dari ${m.jumlahPeserta} peserta, semua ${gm.laga?.total ?? '?'} laga selesai${m.jumlahPeserta < 4 ? '. PESERTA KURANG DARI 4 — cek aturan pembagian medali cabor ini sebelum mengesahkan' : ''} · ${urlBaganGrup(bagan)}`,
        tanggal: dasar.tanggal, jam: null, lawan: 'Seluruh peserta grup',
        pelapor_nama: PELAPOR_KONIJABAR, status: 'menunggu', sumber_luar: 'konijabar', ref_luar: ref,
      })
      if (error) { if (error.code !== '23505') r.galat.push(`Medali grup ${bagan}: ${error.message}`); continue }
      r.laporan_baru++; r.medali_grup = (r.medali_grup ?? 0) + 1
    }
  }
  // Catatan tidak membengkak: buang yang sudah tuntas bila terlalu banyak.
  const semua = Object.entries(r.grup ?? {})
  if (semua.length > 300) r.grup = Object.fromEntries(semua.filter(([, g]) => !g.tuntas))
}

/** Aksi KONIDA yang membuat mesin tidak lagi menyentuh sebuah laporan. */
const AKSI_KOREKSI = ['LAPOR_HASIL_KEMBALIKAN', 'LAPOR_HASIL_TOLAK', 'LAPOR_HASIL_PERBAIKI']

/**
 * Mesin Emas (lib/mesin-emas.ts): target emas yang tanggalnya sudah tiba dan hasilnya sudah final
 * di situs → laporan disahkan atas nama MESIN_EMAS. Hanya laporan berstatus 'menunggu' yang diubah;
 * yang meragukan dicatat sebagai "ditahan" untuk KONIDA. Koreksi lewat tombol Koreksi di Antrean.
 */
export async function jalankanMesinEmas(kontingenId: number, r: RingkasSinkron) {
  const db = dbLapor()
  const hariIni = hariIniWIB()
  const [target, laporan] = await Promise.all([
    ambilSemua<any>((d, s) => db.from('proyeksi_medali').select('urutan,tanggal,cabor_id,nomor_teks,atlet_teks')
      .eq('kontingen_id', kontingenId).eq('medali', 'emas').lte('tanggal', hariIni).order('id').range(d, s)),
    ambilSemua<any>((d, s) => db.from('laporan_hasil').select('id,cabor_id,tanggal,lawan,partai_id,hasil,peringkat,status,ref_luar,pelapor_nama,nomor_teks,atlet_ids')
      .eq('kontingen_id', kontingenId).gte('tanggal', MULAI_LAGA).neq('status', 'ditolak').order('id').range(d, s)),
  ])
  r.mesin_emas = { disahkan: [], ditahan: [] }
  if (!target.length) return
  // Hanya laporan situs bermedali yang masih menunggu yang mungkin disentuh — cek riwayat koreksinya.
  const calon = laporan.filter(l => l.ref_luar && l.status === 'menunggu' && (MEDALI as readonly string[]).includes(l.hasil))
  if (!calon.length) return
  const { data: jejak, error: ej } = await db.from('audit_logs').select('resource_id')
    .eq('resource', 'laporan_hasil').in('action', AKSI_KOREKSI).in('resource_id', calon.map(l => String(l.id)))
  if (ej) throw new Error(ej.message)
  const dikoreksi = new Set((jejak ?? []).map((x: any) => Number(x.resource_id)))

  const idAtlet = Array.from(new Set(laporan.flatMap(l => (l.atlet_ids ?? []) as number[])))
  const nama = new Map<number, string>()
  for (let i = 0; i < idAtlet.length; i += 500) {
    const { data } = await db.from('atlet').select('id,nama_lengkap').in('id', idAtlet.slice(i, i + 500))
    for (const a of data ?? []) nama.set(a.id, a.nama_lengkap)
  }
  const lap: LaporMesin[] = laporan.map(l => ({
    ...l, atlet: ((l.atlet_ids ?? []) as number[]).map(id => nama.get(id)).filter((x): x is string => !!x), dikoreksi: dikoreksi.has(l.id),
  }))
  const tgt: TargetEmas[] = target.map(t => ({ urutan: t.urutan, tanggal: t.tanggal, cabor_id: t.cabor_id, nomor: t.nomor_teks, atlet: t.atlet_teks }))
  const rencana = rencanaMesinEmas(tgt, lap, hariIni)
  const info = new Map(target.map(t => [t.urutan, { nomor: t.nomor_teks as string | null, atlet: t.atlet_teks as string | null }]))
  const kini = new Date().toISOString()

  for (const s of rencana.sahkan) {
    if (s.sahkan != null) {
      const { data: ok, error } = await db.from('laporan_hasil').update({ status: 'disahkan', diputus_oleh: MESIN_EMAS, diputus_at: kini, alasan_tolak: null, updated_at: kini })
        .eq('id', s.sahkan).eq('kontingen_id', kontingenId).eq('status', 'menunggu').select('id')
      if (error) { r.galat.push(`Mesin Emas #${s.sahkan}: ${error.message}`); continue }
      if (!ok?.length) continue // keburu diputus KONIDA
      await writeAudit({ action: 'LAPOR_HASIL_SAHKAN_OTOMATIS', resource: 'laporan_hasil', resource_id: s.sahkan, kontingen_id: kontingenId, actor_email: MESIN_EMAS,
        payload: { target_urutan: s.urutan, ...info.get(s.urutan), hasil: s.hasil, data_situs: s.dari, sebelum: { status: 'menunggu' }, sesudah: { status: 'disahkan' } } })
    }
    if (s.tutup != null) {
      const idPic = s.sahkan ?? 0
      const { error } = await db.from('laporan_hasil').update({ status: 'ditolak', diputus_oleh: MESIN_EMAS, diputus_at: kini, alasan_tolak: ALASAN_KEMBAR(idPic), updated_at: kini })
        .eq('id', s.tutup).eq('kontingen_id', kontingenId).eq('status', 'menunggu').not('ref_luar', 'is', null)
      if (error) { r.galat.push(`Mesin Emas tutup #${s.tutup}: ${error.message}`); continue }
      await writeAudit({ action: 'LAPOR_HASIL_KEMBAR_DITUTUP', resource: 'laporan_hasil', resource_id: s.tutup, kontingen_id: kontingenId, actor_email: MESIN_EMAS, payload: { digantikan: idPic } })
    }
    r.mesin_emas.disahkan.push({ id: s.sahkan ?? s.dari, urutan: s.urutan, hasil: s.hasil, ...info.get(s.urutan)! })
  }
  r.mesin_emas.ditahan = rencana.tahan.map(t => ({ ...t, ...info.get(t.urutan)! }))
  if (r.mesin_emas.disahkan.length) segarkanPublik()
}
