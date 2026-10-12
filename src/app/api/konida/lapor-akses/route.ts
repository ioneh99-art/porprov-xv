// src/app/api/konida/lapor-akses/route.ts
// Kode lapor PIC cabor. Kode hanya tampil SEKALI saat dibuat — yang disimpan
// cuma sidiknya, jadi kebocoran tabel ini tidak membuka pintu lapor.

import { NextRequest, NextResponse } from 'next/server'
import { bakukanKode, buatKode } from '@/lib/lapor'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { ambilSemua, dbLapor, sidikKode } from '@/lib/lapor-sesi'
import { writeAudit, reqMeta } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const db = dbLapor()

  const [{ data: akses }, atlet] = await Promise.all([
    db.from('lapor_akses').select('id,cabor_id,kode_ujung,nama_pic,no_wa,aktif,created_at,terakhir_dipakai')
      .eq('kontingen_id', a.kontingen_id).order('created_at', { ascending: false }),
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

  return NextResponse.json({
    cabor: (cabor ?? []).map((c: any) => ({ id: c.id, nama: c.nama, atlet: jumlah[c.id] ?? 0 })),
    akses: (akses ?? []).map((x: any) => ({ ...x, cabor: nama.get(x.cabor_id) ?? `Cabor ${x.cabor_id}` })),
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

    const kode = buatKode()
    const baku = bakukanKode(kode)
    const { data, error } = await db.from('lapor_akses').insert({
      kontingen_id: a.kontingen_id, cabor_id, nama_pic, no_wa: no_wa || null,
      kode_hash: await sidikKode(baku), kode_ujung: baku.slice(-4), dibuat_oleh: a.nama,
    }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await writeAudit({
      action: 'LAPOR_AKSES_BUAT', resource: 'lapor_akses', resource_id: data.id,
      actor_id: a.sesi.id != null ? String(a.sesi.id) : null, actor_email: a.sesi.username ?? null,
      actor_role: a.sesi.role ?? a.sesi.level ?? null, kontingen_id: a.kontingen_id,
      payload: { cabor_id, nama_pic }, ...reqMeta(req),
    })
    return NextResponse.json({ ok: true, id: data.id, kode })
  }

  if (aksi === 'aktifkan' || aksi === 'matikan') {
    const id = Number(b?.id)
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Kode tidak dikenali.' }, { status: 400 })
    const { data, error } = await db.from('lapor_akses').update({ aktif: aksi === 'aktifkan' })
      .eq('id', id).eq('kontingen_id', a.kontingen_id).select('id')
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
    // Membetulkan nama atau nomor WA PIC. Kodenya sendiri tidak berubah, jadi
    // PIC yang sudah menerima kode tidak perlu dikirimi ulang.
    const id = Number(b?.id)
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Kode tidak dikenali.' }, { status: 400 })
    const nama_pic = typeof b?.nama_pic === 'string' ? b.nama_pic.replace(/\s+/g, ' ').trim().slice(0, 80) : ''
    const no_wa = typeof b?.no_wa === 'string' ? b.no_wa.replace(/[^0-9+]/g, '').slice(0, 20) : ''
    if (!nama_pic) return NextResponse.json({ error: 'Nama PIC tidak boleh kosong.' }, { status: 422 })

    const { data: lama } = await db.from('lapor_akses').select('id,nama_pic,no_wa').eq('id', id).eq('kontingen_id', a.kontingen_id).maybeSingle()
    if (!lama) return NextResponse.json({ error: 'Kode tidak ditemukan.' }, { status: 404 })
    const { error } = await db.from('lapor_akses').update({ nama_pic, no_wa: no_wa || null }).eq('id', id).eq('kontingen_id', a.kontingen_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await writeAudit({
      action: 'LAPOR_AKSES_UBAH', resource: 'lapor_akses', resource_id: id,
      actor_id: a.sesi.id != null ? String(a.sesi.id) : null, actor_email: a.sesi.username ?? null,
      actor_role: a.sesi.role ?? a.sesi.level ?? null, kontingen_id: a.kontingen_id,
      payload: { sebelum: { nama_pic: lama.nama_pic, no_wa: lama.no_wa }, sesudah: { nama_pic, no_wa: no_wa || null } }, ...reqMeta(req),
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Aksi tidak dikenali.' }, { status: 400 })
}
