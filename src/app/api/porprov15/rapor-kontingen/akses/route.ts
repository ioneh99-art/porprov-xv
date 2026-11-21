// src/app/api/porprov15/rapor-kontingen/akses/route.ts
// Status saklar fitur Rapor Kontingen untuk KONI Kab. Bandung.
//   GET  → { terbuka, boleh, bisaUbah, diubah_oleh, diubah_at }   (semua yang login)
//   POST { terbuka: boolean, catatan? } → buka/kunci — HANYA Superadministrator; tercatat di audit_logs.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/guard'
import { dbLapor } from '@/lib/lapor-sesi'
import { writeAudit, reqMeta } from '@/lib/audit'
import { FITUR_RAPOR, KONTINGEN_RAPOR_BERSAKLAR, adminPusat, akunKonidaBersaklar, statusFitur, superadmin } from '@/lib/rapor-kontingen-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const st = await statusFitur(KONTINGEN_RAPOR_BERSAKLAR)
  return NextResponse.json({
    ...st,
    boleh: adminPusat(s) || (akunKonidaBersaklar(s) && st.terbuka),
    bisaUbah: superadmin(s),
  })
}

export async function POST(req: NextRequest) {
  const s = await getServerSession()
  if (!superadmin(s)) return NextResponse.json({ error: 'Hanya Superadministrator yang bisa membuka/mengunci fitur ini.' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  if (typeof body?.terbuka !== 'boolean') return NextResponse.json({ error: 'terbuka harus true/false' }, { status: 400 })
  const sebelum = await statusFitur(KONTINGEN_RAPOR_BERSAKLAR)
  const { error } = await dbLapor().from('fitur_kontingen').upsert({
    kontingen_id: KONTINGEN_RAPOR_BERSAKLAR, fitur: FITUR_RAPOR, terbuka: body.terbuka,
    catatan: typeof body.catatan === 'string' ? body.catatan.slice(0, 300) : null,
    diubah_oleh: 'Superadministrator', diubah_at: new Date().toISOString(),
  }, { onConflict: 'kontingen_id,fitur' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAudit({
    action: body.terbuka ? 'fitur.buka' : 'fitur.kunci', resource: 'fitur_kontingen', resource_id: `${KONTINGEN_RAPOR_BERSAKLAR}:${FITUR_RAPOR}`,
    actor_id: s?.id ?? null, actor_email: 'Superadministrator', actor_role: 'superadmin', kontingen_id: KONTINGEN_RAPOR_BERSAKLAR,
    payload: { fitur: FITUR_RAPOR, sebelum: sebelum.terbuka, sesudah: body.terbuka }, ...reqMeta(req),
  })
  return NextResponse.json({ ...(await statusFitur(KONTINGEN_RAPOR_BERSAKLAR)), boleh: true, bisaUbah: true })
}
