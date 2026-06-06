// src/app/api/admin/tes-fisik-unmatched/route.ts
// Endpoint untuk admin KONI melihat & mendapat notifikasi unmatched tes fisik.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { emailDailyDigest } from '@/lib/email'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// GET — ringkasan unmatched per kontingen (untuk admin dashboard)
export async function GET(req: NextRequest) {
  const session = req.cookies.get('porprov_session')?.value
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = JSON.parse(session)
  if (!['superadmin', 'koni_jabar', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const kontingenId = searchParams.get('kontingen_id')

  let query = sb
    .from('atlet_tes_fisik_unmatched')
    .select('id, nama_raw, cabor_raw, kontingen_id, tahap, status_review, created_at, kontingen(nama)')
    .eq('status_review', 'pending')
    .order('created_at', { ascending: false })

  if (kontingenId) query = query.eq('kontingen_id', parseInt(kontingenId)) as typeof query

  const { data, error, count } = await (query as any).select(
    'id, nama_raw, cabor_raw, kontingen_id, tahap, status_review, created_at, kontingen(nama)',
    { count: 'exact' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Agregasi per kontingen
  const perKontingen: Record<number, { nama: string; jumlah: number }> = {}
  ;(data ?? []).forEach((r: any) => {
    const kid = r.kontingen_id
    if (!perKontingen[kid]) {
      perKontingen[kid] = { nama: r.kontingen?.nama ?? `Kontingen ${kid}`, jumlah: 0 }
    }
    perKontingen[kid].jumlah++
  })

  return NextResponse.json({
    total: count ?? 0,
    per_kontingen: Object.entries(perKontingen).map(([id, v]) => ({
      kontingen_id: parseInt(id), ...v,
    })).sort((a, b) => b.jumlah - a.jumlah),
    records: data ?? [],
  })
}

// POST — kirim email digest unmatched ke admin (bisa dijadwalkan via cron)
export async function POST(req: NextRequest) {
  const session = req.cookies.get('porprov_session')?.value
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = JSON.parse(session)
  if (!['superadmin', 'koni_jabar'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const toEmail: string = body.email ?? user.email
  if (!toEmail) return NextResponse.json({ error: 'Email tujuan tidak ditemukan' }, { status: 400 })

  // Ambil data unmatched
  const { data: unmatched, count: totalUnmatched } = await sb
    .from('atlet_tes_fisik_unmatched')
    .select('kontingen_id, kontingen(nama)', { count: 'exact' })
    .eq('status_review', 'pending')

  // Ambil stats atlet untuk digest
  const { data: atletStats } = await sb
    .from('atlet')
    .select('status_registrasi')

  const totalPending  = atletStats?.filter(a => a.status_registrasi === 'Menunggu Admin').length ?? 0
  const totalVerified = atletStats?.filter(a => a.status_registrasi === 'Verified').length ?? 0
  const totalPosted   = atletStats?.filter(a => a.status_registrasi === 'Posted').length ?? 0

  // Top kontingen dengan unmatched terbanyak
  const agg: Record<number, { nama: string; pending: number }> = {}
  ;(unmatched ?? []).forEach((r: any) => {
    const kid = r.kontingen_id
    if (!agg[kid]) agg[kid] = { nama: r.kontingen?.nama ?? `Kontingen ${kid}`, pending: 0 }
    agg[kid].pending++
  })
  const topUnmatched = Object.values(agg).sort((a, b) => b.pending - a.pending).slice(0, 5)

  try {
    await emailDailyDigest({
      to: toEmail,
      totalPending,
      totalVerified,
      totalPosted,
      topKontingen: topUnmatched,
    })

    return NextResponse.json({
      ok: true,
      message: `Digest dikirim ke ${toEmail}`,
      unmatched_total: totalUnmatched ?? 0,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
