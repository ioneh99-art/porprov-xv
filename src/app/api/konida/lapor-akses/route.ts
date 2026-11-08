// src/app/api/konida/lapor-akses/route.ts
// Kode lapor PIC cabor. Pencocokan kode memakai sidiknya (kode_hash). Sejak 8 Nov 2026
// kode juga disimpan tersandi (kode_sandi, lib/kode-sandi.ts) supaya admin bisa melihat &
// menyalinnya lagi — tiap kali dibuka tercatat di audit. Kode lama (sebelum 8 Nov) hanya
// bisa dipulihkan dengan menempelkan kodenya; server mencocokkannya ke sidik dulu.

import { NextRequest, NextResponse } from 'next/server'
import { bakukanKode, buatKode, kodeDalamTeks, kodePicKembar, pesanKodeKembar, tampilKode } from '@/lib/lapor'
import { bukaSandiKode, sandikanKode } from '@/lib/kode-sandi'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { ambilSemua, dbLapor, sidikKode } from '@/lib/lapor-sesi'
import { writeAudit, reqMeta } from '@/lib/audit'
import { judulDisiplin } from '@/lib/pengisi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Kode PIC aktif lain di cabor ini — satu cabor/disiplin hanya boleh satu kode aktif. */
async function kodeBentrok(db: ReturnType<typeof dbLapor>, kontingen_id: number, cabor_id: number, disiplin: string | null, kecualiId?: number) {
  const { data } = await db.from('lapor_akses').select('id,cabor_id,disiplin,aktif,nama_pic,kode_ujung')
    .eq('kontingen_id', kontingen_id).eq('cabor_id', cabor_id).eq('jalur', 'pic').eq('aktif', true)
  const k = kodePicKembar(data ?? [], cabor_id, disiplin, kecualiId)
  if (!k) return null
  const { data: c } = await db.from('cabang_olahraga').select('nama').eq('id', cabor_id).maybeSingle()
  return pesanKodeKembar(k, `${c?.nama ?? `Cabor ${cabor_id}`}${disiplin ? ` · ${judulDisiplin(disiplin)}` : ''}`)
}

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const db = dbLapor()

  const [{ data: akses }, atlet] = await Promise.all([
    db.from('lapor_akses').select('id,cabor_id,disiplin,kode_ujung,nama_pic,no_wa,aktif,created_at,terakhir_dipakai,kode_sandi')
      .eq('kontingen_id', a.kontingen_id).eq('jalur', 'pic').order('created_at', { ascending: false }),
    ambilSemua<{ cabor_id: number }>((dari, sampai) =>
      db.from('atlet').select('cabor_id').eq('kontingen_id', a.kontingen_id).not('cabor_id', 'is', null).order('id').range(dari, sampai)),
  ])
  const jumlah: Record<number, number> = {}
  for (const r of atlet) jumlah[r.cabor_id] = (jumlah[r.cabor_id] ?? 0) + 1
  const idCabor = Object.keys(jumlah).map(Number)
  const { data: cabor } = idCabor.length
    ? await db.from('cabang_olahraga').select('id,nama').in('id', idCabor).order('nama')
    : { data: [] as any[] }
  const nama = new Map((cabor ?? []).map((c: any) => [c.id, c.nama]))

  // Jumlah laporan per kode: cabor sebuah kode hanya boleh diganti selagi belum dipakai melapor.
  const dipakai = await ambilSemua<{ akses_id: number | null }>((dari, sampai) =>
    db.from('laporan_hasil').select('akses_id').eq('kontingen_id', a.kontingen_id).not('akses_id', 'is', null).order('id').range(dari, sampai))
  const jumlahLaporan: Record<number, number> = {}
  for (const r of dipakai) if (r.akses_id != null) jumlahLaporan[r.akses_id] = (jumlahLaporan[r.akses_id] ?? 0) + 1

  // Disiplin per cabor dari daftar resmi — untuk kode PIC per disiplin (mis. Akuatik · Polo Air).
  const daftarDisiplin = await ambilSemua<{ cabor_id: number; disiplin: string }>((dari, sampai) =>
    db.from('pendaftaran_nomor').select('cabor_id,disiplin').eq('kontingen_id', a.kontingen_id).order('id').range(dari, sampai))
  const disiplin: Record<number, string[]> = {}
  for (const r of daftarDisiplin) if (r.disiplin && !(disiplin[r.cabor_id] ?? []).includes(r.disiplin)) disiplin[r.cabor_id] = [...(disiplin[r.cabor_id] ?? []), r.disiplin].sort()

  return NextResponse.json({
    disiplin,
    cabor: (cabor ?? []).map((c: any) => ({ id: c.id, nama: c.nama, atlet: jumlah[c.id] ?? 0 })),
    // Kodenya sendiri tidak ikut daftar — hanya tanda tersimpan atau belum (dibuka lewat aksi 'lihat').
    akses: (akses ?? []).map(({ kode_sandi, ...x }: any) => ({ ...x, kode_tersimpan: !!kode_sandi, cabor: nama.get(x.cabor_id) ?? `Cabor ${x.cabor_id}`, jumlah_laporan: jumlahLaporan[x.id] ?? 0 })),
  })
}

export async function POST(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const b = await req.json().catch(() => ({}))
  const db = dbLapor()
  const aksi = String(b?.aksi ?? 'buat')

  if (aksi === 'buat') {
    const cabor_id = Number(b?.cabor_id)
    const nama_pic = typeof b?.nama_pic === 'string' ? b.nama_pic.replace(/\s+/g, ' ').trim().slice(0, 80) : ''
    const no_wa = typeof b?.no_wa === 'string' ? b.no_wa.replace(/[^0-9+]/g, '').slice(0, 20) : ''
    if (!Number.isInteger(cabor_id) || cabor_id <= 0) return NextResponse.json({ error: 'Pilih cabornya.' }, { status: 422 })
    if (!nama_pic) return NextResponse.json({ error: 'Isi nama PIC.' }, { status: 422 })

    // Kode hanya boleh untuk cabor yang memang punya atlet di kontingen ini.
    const { count } = await db.from('atlet').select('id', { count: 'exact', head: true })
      .eq('kontingen_id', a.kontingen_id).eq('cabor_id', cabor_id)
    if (!count) return NextResponse.json({ error: 'Kontingen ini tidak punya atlet di cabor tersebut.' }, { status: 422 })

    // Kode per disiplin (boleh kosong = semua disiplin cabor itu).
    const disiplin = typeof b?.disiplin === 'string' && b.disiplin.trim() ? b.disiplin.trim() : null
    if (disiplin) {
      const { count: ada } = await db.from('pendaftaran_nomor').select('id', { count: 'exact', head: true })
        .eq('kontingen_id', a.kontingen_id).eq('cabor_id', cabor_id).eq('disiplin', disiplin)
      if (!ada) return NextResponse.json({ error: 'Disiplin itu tidak ada di daftar resmi cabor ini.' }, { status: 422 })
    }

    const bentrok = await kodeBentrok(db, a.kontingen_id, cabor_id, disiplin)
    if (bentrok) return NextResponse.json({ error: bentrok }, { status: 409 })

    const kode = buatKode()
    const baku = bakukanKode(kode)
    const { data, error } = await db.from('lapor_akses').insert({
      kontingen_id: a.kontingen_id, cabor_id, disiplin, nama_pic, no_wa: no_wa || null,
      kode_hash: await sidikKode(baku), kode_sandi: await sandikanKode(kode), kode_ujung: baku.slice(-4), dibuat_oleh: a.nama,
    }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await writeAudit({
      action: 'LAPOR_AKSES_BUAT', resource: 'lapor_akses', resource_id: data.id,
      actor_id: a.sesi.id != null ? String(a.sesi.id) : null, actor_email: a.sesi.username ?? null,
      actor_role: a.sesi.role ?? a.sesi.level ?? null, kontingen_id: a.kontingen_id,
      payload: { cabor_id, disiplin, nama_pic }, ...reqMeta(req),
    })
    return NextResponse.json({ ok: true, id: data.id, kode })
  }

  if (aksi === 'aktifkan' || aksi === 'matikan') {
    const id = Number(b?.id)
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Kode tidak dikenali.' }, { status: 400 })
    if (aksi === 'aktifkan') {
      // Menghidupkan kode lama tidak boleh membuat cabor/disiplin itu punya dua kode aktif.
      const { data: k } = await db.from('lapor_akses').select('cabor_id,disiplin').eq('id', id).eq('kontingen_id', a.kontingen_id).eq('jalur', 'pic').maybeSingle()
      if (!k) return NextResponse.json({ error: 'Kode tidak ditemukan.' }, { status: 404 })
      const bentrok = await kodeBentrok(db, a.kontingen_id, k.cabor_id, k.disiplin ?? null, id)
      if (bentrok) return NextResponse.json({ error: bentrok }, { status: 409 })
    }
    const { data, error } = await db.from('lapor_akses').update({ aktif: aksi === 'aktifkan' })
      .eq('id', id).eq('kontingen_id', a.kontingen_id).eq('jalur', 'pic').select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.length) return NextResponse.json({ error: 'Kode tidak ditemukan.' }, { status: 404 })
    await writeAudit({
      action: `LAPOR_AKSES_${aksi.toUpperCase()}`, resource: 'lapor_akses', resource_id: id,
      actor_id: a.sesi.id != null ? String(a.sesi.id) : null, actor_email: a.sesi.username ?? null,
      actor_role: a.sesi.role ?? a.sesi.level ?? null, kontingen_id: a.kontingen_id, ...reqMeta(req),
    })
    return NextResponse.json({ ok: true })
  }

  if (aksi === 'ubah') {
    // Membetulkan nama, nomor WA, atau cabor PIC. Kodenya sendiri tidak berubah,
    // jadi PIC yang sudah menerima kode tidak perlu dikirimi ulang.
    const id = Number(b?.id)
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Kode tidak dikenali.' }, { status: 400 })
    const nama_pic = typeof b?.nama_pic === 'string' ? b.nama_pic.replace(/\s+/g, ' ').trim().slice(0, 80) : ''
    const no_wa = typeof b?.no_wa === 'string' ? b.no_wa.replace(/[^0-9+]/g, '').slice(0, 20) : ''
    if (!nama_pic) return NextResponse.json({ error: 'Nama PIC tidak boleh kosong.' }, { status: 422 })

    const { data: lama } = await db.from('lapor_akses').select('id,nama_pic,no_wa,cabor_id,disiplin,aktif').eq('id', id).eq('kontingen_id', a.kontingen_id).eq('jalur', 'pic').maybeSingle()
    if (!lama) return NextResponse.json({ error: 'Kode tidak ditemukan.' }, { status: 404 })

    const ubah: Record<string, any> = { nama_pic, no_wa: no_wa || null }
    if (b?.cabor_id != null && b.cabor_id !== '' && Number(b.cabor_id) !== lama.cabor_id) {
      const cabor_id = Number(b.cabor_id)
      if (!Number.isInteger(cabor_id) || cabor_id <= 0) return NextResponse.json({ error: 'Cabor tidak dikenali.' }, { status: 422 })
      // Laporan menyimpan cabornya sendiri. Kalau kode yang sudah dipakai melapor
      // dipindah cabor, daftar "Laporan saya" di HP PIC memuat atlet yang bukan cabornya lagi.
      const { count: sudahLapor } = await db.from('laporan_hasil').select('id', { count: 'exact', head: true }).eq('akses_id', id)
      if (sudahLapor) return NextResponse.json({ error: 'Kode ini sudah dipakai melapor, jadi cabornya tidak bisa diganti. Matikan kode ini lalu buat kode baru untuk cabor yang benar.' }, { status: 409 })
      const { count: adaAtlet } = await db.from('atlet').select('id', { count: 'exact', head: true })
        .eq('kontingen_id', a.kontingen_id).eq('cabor_id', cabor_id)
      if (!adaAtlet) return NextResponse.json({ error: 'Kontingen ini tidak punya atlet di cabor tersebut.' }, { status: 422 })
      // Disiplin milik cabor lama tidak berlaku di cabor baru.
      if (lama.disiplin) return NextResponse.json({ error: 'Kode per disiplin tidak bisa dipindah cabor. Matikan kode ini lalu buat kode baru untuk cabor yang benar.' }, { status: 409 })
      if (lama.aktif) {
        const bentrok = await kodeBentrok(db, a.kontingen_id, cabor_id, null, id)
        if (bentrok) return NextResponse.json({ error: bentrok }, { status: 409 })
      }
      ubah.cabor_id = cabor_id
    }

    const { error } = await db.from('lapor_akses').update(ubah).eq('id', id).eq('kontingen_id', a.kontingen_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await writeAudit({
      action: 'LAPOR_AKSES_UBAH', resource: 'lapor_akses', resource_id: id,
      actor_id: a.sesi.id != null ? String(a.sesi.id) : null, actor_email: a.sesi.username ?? null,
      actor_role: a.sesi.role ?? a.sesi.level ?? null, kontingen_id: a.kontingen_id,
      payload: { sebelum: { nama_pic: lama.nama_pic, no_wa: lama.no_wa, cabor_id: lama.cabor_id }, sesudah: { cabor_id: lama.cabor_id, ...ubah } }, ...reqMeta(req),
    })
    return NextResponse.json({ ok: true })
  }

  const aktor = {
    actor_id: a.sesi.id != null ? String(a.sesi.id) : null, actor_email: a.sesi.username ?? null,
    actor_role: a.sesi.role ?? a.sesi.level ?? null, kontingen_id: a.kontingen_id,
  }

  if (aksi === 'lihat') {
    const id = Number(b?.id)
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Kode tidak dikenali.' }, { status: 400 })
    const { data: k } = await db.from('lapor_akses').select('id,kode_sandi').eq('id', id).eq('kontingen_id', a.kontingen_id).eq('jalur', 'pic').maybeSingle()
    if (!k) return NextResponse.json({ error: 'Kode tidak ditemukan.' }, { status: 404 })
    if (!k.kode_sandi) return NextResponse.json({ error: 'Kode ini dibuat sebelum fitur simpan kode, jadi belum tersimpan. Tempel kodenya sekali di kotak "Pulihkan kode lama" — setelah itu bisa dilihat & disalin.' }, { status: 404 })
    const kode = await bukaSandiKode(k.kode_sandi)
    if (!kode) return NextResponse.json({ error: 'Kode tersimpan tidak bisa dibuka. Tempel ulang kodenya di "Pulihkan kode lama".' }, { status: 500 })
    await writeAudit({ action: 'LAPOR_AKSES_LIHAT', resource: 'lapor_akses', resource_id: id, ...aktor, ...reqMeta(req) })
    return NextResponse.json({ ok: true, kode })
  }

  if (aksi === 'pulihkan') {
    // Admin menempelkan kode lama (atau seluruh isi berkas daftar kode / pesan WA).
    // Hanya kode yang sidiknya cocok dengan kode PIC kontingen ini yang disimpan.
    const calon = kodeDalamTeks(b?.teks)
    if (!calon.length) return NextResponse.json({ error: 'Tidak ada kode berbentuk XXXX-XXXX di teks itu.' }, { status: 422 })
    const { data: baris } = await db.from('lapor_akses').select('id,kode_hash,kode_sandi')
      .eq('kontingen_id', a.kontingen_id).eq('jalur', 'pic')
    const perSidik = new Map((baris ?? []).map((r: any) => [r.kode_hash, r]))
    const pulih: number[] = []
    let sudahAda = 0
    for (const baku of calon) {
      const r: any = perSidik.get(await sidikKode(baku))
      if (!r) continue
      if (r.kode_sandi) { sudahAda++; continue }
      const { error } = await db.from('lapor_akses').update({ kode_sandi: await sandikanKode(tampilKode(baku)) }).eq('id', r.id).is('kode_sandi', null)
      if (!error) { pulih.push(r.id); r.kode_sandi = 'baru' }
    }
    if (pulih.length) await writeAudit({ action: 'LAPOR_AKSES_PULIHKAN', resource: 'lapor_akses', resource_id: null, ...aktor, payload: { akses_id: pulih }, ...reqMeta(req) })
    return NextResponse.json({ ok: true, dicoba: calon.length, pulih: pulih.length, sudah_ada: sudahAda, tak_cocok: calon.length - pulih.length - sudahAda })
  }

  return NextResponse.json({ error: 'Aksi tidak dikenali.' }, { status: 400 })
}
