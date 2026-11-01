// src/app/api/konida/command-center/route.ts
// Pengaturan 3 layar command center: Mode Kunjungan (tampilan tamu/Bupati) + teks
// ucapan. Layar membaca GET tiap beberapa detik, jadi satu tombol dari HP mengubah
// ketiga monitor sekaligus. Hanya KONIDA kontingen itu (atau admin pusat).

import { NextRequest, NextResponse } from 'next/server'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { dbLapor } from '@/lib/lapor-sesi'
import { writeAudit, reqMeta } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SAMBUTAN_BAWAAN = 'Selamat datang di Command Center KONI Kabupaten Bandung'

async function baca(k: number) {
  const { data } = await dbLapor().from('command_center').select('mode_kunjungan,sambutan,diubah_oleh,updated_at').eq('kontingen_id', k).maybeSingle()
  return {
    mode_kunjungan: !!data?.mode_kunjungan,
    sambutan: data?.sambutan || SAMBUTAN_BAWAAN,
    diubah_oleh: data?.diubah_oleh ?? null,
    updated_at: data?.updated_at ?? null,
  }
}

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  return NextResponse.json(await baca(a.kontingen_id))
}

export async function POST(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const b = await req.json().catch(() => ({}))
  if (typeof b?.mode_kunjungan !== 'boolean') return NextResponse.json({ error: 'Mode tidak dikenali.' }, { status: 400 })
  const sambutan = typeof b?.sambutan === 'string' ? b.sambutan.replace(/\s+/g, ' ').trim().slice(0, 120) : undefined
  const isi: Record<string, any> = { kontingen_id: a.kontingen_id, mode_kunjungan: b.mode_kunjungan, diubah_oleh: a.nama, updated_at: new Date().toISOString() }
  if (sambutan !== undefined) isi.sambutan = sambutan || null
  const { error } = await dbLapor().from('command_center').upsert(isi, { onConflict: 'kontingen_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAudit({
    action: 'COMMAND_CENTER_UBAH', resource: 'command_center', resource_id: a.kontingen_id, kontingen_id: a.kontingen_id,
    actor_id: a.sesi.id != null ? String(a.sesi.id) : null, actor_email: a.sesi.username ?? a.nama, actor_role: a.sesi.role ?? null,
    payload: { mode_kunjungan: b.mode_kunjungan, sambutan }, ...reqMeta(req),
  })
  return NextResponse.json(await baca(a.kontingen_id))
}
