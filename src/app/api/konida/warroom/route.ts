// src/app/api/konida/warroom/route.ts
// Bahan War Room & Mode Layar dalam satu kali muat: Misi Emas Hari Ini,
// Arena (sedang main & berikutnya), Kalender Panas, Peta Perjuangan, dan
// Kesehatan Operasi. Semua dari data asli — proyeksi KONI, laporan yang
// disahkan, jadwal partai, jadwal kegiatan cabor, kode PIC, catatan lapangan.

import { NextRequest, NextResponse } from 'next/server'
import { hariPorprov, tanggalWIB } from '@/lib/lapor'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { ambilSemua, dbLapor } from '@/lib/lapor-sesi'
import { KOLOM_PARTAI } from '@/lib/partai-server'
import { jadwalPada } from '@/lib/layar'
import type { BarisJadwal } from '@/lib/matriks'
import { keadaanPic } from '@/lib/jalur-lapor'
import { kalenderPanas, koordinatKota, lagaLive, partaiBerikut, statusMisi, type PartaiWR, type ProyeksiBaris } from '@/lib/warroom'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const norm = (s: string | null | undefined) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()
const jamWIB = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false })

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const k = a.kontingen_id
  const db = dbLapor()
  const hariIni = tanggalWIB(), jamKini = jamWIB()

  let proyeksiMentah: any[], laporan: any[], daftar: { cabor_id: number }[]
  try {
    ;[proyeksiMentah, laporan, daftar] = await Promise.all([
      ambilSemua((d, s) => db.from('proyeksi_medali').select('urutan,tanggal,cabor_id,cabor_teks,nomor_teks,atlet_teks,kota')
        .eq('kontingen_id', k).eq('medali', 'emas').order('urutan').range(d, s)),
      ambilSemua((d, s) => db.from('laporan_hasil').select('id,cabor_id,tanggal,hasil,nomor_teks,status')
        .eq('kontingen_id', k).neq('status', 'ditolak').order('id').range(d, s)),
      ambilSemua<{ cabor_id: number }>((d, s) => db.from('pendaftaran_nomor').select('cabor_id').eq('kontingen_id', k).order('id').range(d, s)),
    ])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  const [{ data: partaiMentah }, { data: jadwal }, { data: akses }, { data: catatan }, { data: klas }] = await Promise.all([
    db.from('jadwal_partai').select(KOLOM_PARTAI).eq('kontingen_id', k).neq('status', 'batal').limit(3000),
    db.from('jadwal_cabor').select('cabor_disiplin,cabor_nama_raw,jenis,wilayah,tuan_rumah,mulai,selesai,venue'),
    db.from('lapor_akses').select('cabor_id,aktif,terakhir_dipakai,nama_pic').eq('kontingen_id', k).eq('jalur', 'pic'),
    db.from('catatan_lapangan').select('status,mendesak').eq('kontingen_id', k).eq('status', 'baru'),
    db.from('klasemen_medali').select('updated_at').order('updated_at', { ascending: false }).limit(1),
  ])

  const idCabor = Array.from(new Set([...daftar.map(d => d.cabor_id), ...(partaiMentah ?? []).map((p: any) => p.cabor_id), ...laporan.map(l => l.cabor_id)]))
  const { data: caborData } = idCabor.length ? await db.from('cabang_olahraga').select('id,nama').in('id', idCabor) : { data: [] as any[] }
  const namaCabor = new Map<number, string>((caborData ?? []).map((c: any) => [c.id, c.nama]))
  const idPerNama = new Map<string, number>((caborData ?? []).map((c: any) => [norm(c.nama), c.id]))
  const caborKita = Array.from(new Set(daftar.map(d => d.cabor_id))).map(id => namaCabor.get(id)).filter((x): x is string => !!x)

  // ── Arena ──
  const partai = (partaiMentah ?? []) as any[]
  const idAtlet = Array.from(new Set(partai.flatMap(p => p.atlet_ids as number[])))
  const namaAtlet = new Map<number, string>()
  for (let i = 0; i < idAtlet.length; i += 500) {
    const { data } = await db.from('atlet').select('id,nama_lengkap').eq('kontingen_id', k).in('id', idAtlet.slice(i, i + 500))
    for (const r of (data ?? [])) namaAtlet.set(r.id, r.nama_lengkap)
  }
  const isiPartai = (p: PartaiWR & { menit?: number | null }) => {
    const asli = partai.find(x => x.id === p.id)
    return { id: p.id, tanggal: p.tanggal, jam: p.jam, menit: p.menit ?? null, cabor: namaCabor.get(p.cabor_id) ?? 'Cabor', nomor: p.nomor_teks,
      babak: asli?.babak ?? null, lawan: p.lawan, venue: p.venue, status: p.status,
      atlet: ((asli?.atlet_ids ?? []) as number[]).map(id => namaAtlet.get(id)).filter(Boolean) }
  }
  const live = lagaLive(partai as PartaiWR[], hariIni)
  const caborLive = new Set(live.map(p => p.cabor_id))

  // ── Misi emas: hari ini; bila hari ini tidak ada proyeksi, tanggal proyeksi terdekat berikutnya ──
  const proyeksi: ProyeksiBaris[] = proyeksiMentah.map(p => ({
    urutan: p.urutan, tanggal: p.tanggal, cabor_id: p.cabor_id, cabor: p.cabor_id != null ? (namaCabor.get(p.cabor_id) ?? p.cabor_teks) : p.cabor_teks,
    nomor: p.nomor_teks, atlet: p.atlet_teks, kota: p.kota,
  }))
  const sah = laporan.filter(l => l.status === 'disahkan')
  const tglMisi = proyeksi.some(p => p.tanggal === hariIni) ? hariIni : (proyeksi.map(p => p.tanggal).filter(t => t > hariIni).sort()[0] ?? null)
  const misi = tglMisi ? statusMisi(proyeksi.filter(p => p.tanggal === tglMisi), sah, tglMisi === hariIni ? caborLive : new Set()) : []
  const besok = new Date(Date.parse(hariIni + 'T00:00:00Z') + 86_400_000).toISOString().slice(0, 10)

  // ── Kegiatan cabor kita (jadwal KONI) ──
  const kegiatanKita = ((jadwal ?? []) as BarisJadwal[]).filter(j => j.jenis === 'pertandingan' && caborKita.some(c => norm(c) === norm(j.cabor_nama_raw)))
  const semuaTgl = [...kegiatanKita.flatMap(j => [j.mulai, j.selesai]), ...proyeksi.map(p => p.tanggal)].filter((x): x is string => !!x).sort()
  const kalender = semuaTgl.length
    ? kalenderPanas(proyeksi.map(p => p.tanggal), sah.filter(l => l.hasil === 'emas').map(l => l.tanggal), kegiatanKita, semuaTgl[0], semuaTgl[semuaTgl.length - 1])
    : []

  // ── Peta perjuangan: kota tempat cabor kita bertanding hari ini (atau hari terdekat) ──
  let tglPeta = hariIni
  let kegiatanPeta = jadwalPada((jadwal ?? []) as BarisJadwal[], caborKita, hariIni)
  if (!kegiatanPeta.length) {
    const depan = kegiatanKita.map(j => j.mulai as string).filter(t => t && t > hariIni).sort()[0]
    if (depan) { tglPeta = depan; kegiatanPeta = jadwalPada((jadwal ?? []) as BarisJadwal[], caborKita, depan) }
  }
  const perKota = new Map<string, { kota: string; label: string; lat: number; lng: number; kegiatan: { cabor: string; venue: string | null }[]; live: number }>()
  for (const j of kegiatanPeta) {
    const g = koordinatKota(j.tuan_rumah)
    if (!g) continue
    const b = perKota.get(g.label) ?? { kota: j.tuan_rumah ?? g.label, label: g.label, lat: g.lat, lng: g.lng, kegiatan: [], live: 0 }
    b.kegiatan.push({ cabor: j.cabor_disiplin, venue: j.venue })
    const id = idPerNama.get(norm(j.cabor_nama_raw))
    if (tglPeta === hariIni && id != null && caborLive.has(id)) b.live++
    perKota.set(g.label, b)
  }

  // ── Kesehatan operasi ──
  const kegiatanHariIni = jadwalPada((jadwal ?? []) as BarisJadwal[], caborKita, hariIni)
  const caborHariIni = Array.from(new Set(kegiatanHariIni.map(j => idPerNama.get(norm(j.cabor_nama_raw))).filter((x): x is number => x != null)))
  const aksesRingkas = (akses ?? []) as any[]
  const operasi = {
    menunggu: laporan.filter(l => l.status === 'menunggu').length,
    catatan_baru: (catatan ?? []).length,
    catatan_mendesak: (catatan ?? []).filter((c: any) => c.mendesak).length,
    cabor_hari_ini: caborHariIni.map(id => ({
      cabor_id: id, cabor: namaCabor.get(id) ?? 'Cabor', pic: keadaanPic(aksesRingkas, id).keadaan,
      laporan_hari_ini: laporan.filter(l => l.cabor_id === id && l.tanggal === hariIni).length,
      live: caborLive.has(id),
    })).sort((x, y) => x.laporan_hari_ini - y.laporan_hari_ini || x.cabor.localeCompare(y.cabor, 'id')),
  }

  return NextResponse.json({
    hari_ini: hariIni, jam_kini: jamKini, hari_ke: hariPorprov(hariIni), diperbarui: new Date().toISOString(),
    misi: { tanggal: tglMisi, hari_ini: tglMisi === hariIni, daftar: misi, besok: proyeksi.filter(p => p.tanggal === besok).length },
    arena: { live: live.map(isiPartai), berikut: partaiBerikut(partai as PartaiWR[], hariIni, jamKini).map(isiPartai) },
    kalender,
    peta: { tanggal: tglPeta, hari_ini: tglPeta === hariIni, kota: Array.from(perKota.values()).sort((x, y) => y.kegiatan.length - x.kegiatan.length) },
    operasi,
    klasemen_diperbarui: (klas ?? [])[0]?.updated_at ?? null,
  })
}
