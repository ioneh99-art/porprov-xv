// src/app/api/konida/klasemen-resmi/route.ts
// Klasemen resmi 27 kontingen dari panitia, diketik tim KONIDA (mis. tiap malam).
// Satu-satunya sumber angka kontingen LAIN di War Room; angka Kab. Bandung tetap
// ditimpa laporan lapangan yang disahkan (lihat timpaKlasemen) begitu ada.
// Hanya KONIDA Kab. Bandung + superadmin. Tiap simpan tercatat lengkap (sebelum/sesudah).

import { NextRequest, NextResponse } from 'next/server'
import { ambilPengelolaJadwal } from '@/lib/jadwal-kelola'
import { dbLapor } from '@/lib/lapor-sesi'
import { writeAudit, reqMeta } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const angka = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n >= 0 && n <= 999 ? n : null }

export async function GET() {
  const a = await ambilPengelolaJadwal()
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const db = dbLapor()
  const [{ data: kontingen }, { data: klas }] = await Promise.all([
    db.from('kontingen').select('id,nama').order('nama'),
    db.from('klasemen_medali').select('kontingen_id,emas,perak,perunggu,total,updated_at'),
  ])
  const peta = new Map((klas ?? []).map((r: any) => [r.kontingen_id, r]))
  return NextResponse.json({
    baris: (kontingen ?? []).filter((x: any) => peta.has(x.id)).map((x: any) => {
      const r: any = peta.get(x.id)
      return { kontingen_id: x.id, nama: x.nama, emas: r.emas ?? 0, perak: r.perak ?? 0, perunggu: r.perunggu ?? 0, updated_at: r.updated_at }
    }),
  })
}

export async function POST(req: NextRequest) {
  const a = await ambilPengelolaJadwal()
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const b = await req.json().catch(() => ({}))
  const masuk: any[] = Array.isArray(b?.baris) ? b.baris : []
  if (!masuk.length || masuk.length > 40) return NextResponse.json({ error: 'Tidak ada baris yang dikirim.' }, { status: 422 })

  const baru: { kontingen_id: number; emas: number; perak: number; perunggu: number }[] = []
  for (const r of masuk) {
    const id = Number(r?.kontingen_id), e = angka(r?.emas), p = angka(r?.perak), g = angka(r?.perunggu)
    if (!Number.isInteger(id) || id <= 0 || e == null || p == null || g == null)
      return NextResponse.json({ error: 'Angka medali harus bilangan bulat 0–999.' }, { status: 422 })
    baru.push({ kontingen_id: id, emas: e, perak: p, perunggu: g })
  }

  const db = dbLapor()
  const { data: lama } = await db.from('klasemen_medali').select('kontingen_id,emas,perak,perunggu').in('kontingen_id', baru.map(x => x.kontingen_id))
  const petaLama = new Map((lama ?? []).map((r: any) => [r.kontingen_id, r]))
  const berubah = baru.filter(x => {
    const l: any = petaLama.get(x.kontingen_id)
    return !l || l.emas !== x.emas || l.perak !== x.perak || l.perunggu !== x.perunggu
  })
  if (berubah.some(x => !petaLama.has(x.kontingen_id))) return NextResponse.json({ error: 'Ada kontingen yang tidak dikenal.' }, { status: 422 })

  const kini = new Date().toISOString()
  for (const x of berubah) {
    const { error } = await db.from('klasemen_medali')
      .update({ emas: x.emas, perak: x.perak, perunggu: x.perunggu, total: x.emas + x.perak + x.perunggu, updated_at: kini })
      .eq('kontingen_id', x.kontingen_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (berubah.length) await writeAudit({
    action: 'KLASEMEN_RESMI_UBAH', resource: 'klasemen_medali',
    actor_id: a.sesi.id != null ? String(a.sesi.id) : null, actor_email: a.sesi.username ?? a.nama,
    actor_role: a.sesi.role ?? a.sesi.level ?? null, kontingen_id: 4,
    payload: { sebelum: berubah.map(x => ({ kontingen_id: x.kontingen_id, ...(petaLama.get(x.kontingen_id) as any) })), sesudah: berubah },
    ...reqMeta(req),
  })
  return NextResponse.json({ ok: true, diubah: berubah.length })
}
