// src/app/api/konida/atlet/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(req: NextRequest) {
  const kontingenId = req.nextUrl.searchParams.get('kontingen_id')
  if (!kontingenId) return NextResponse.json({ error: 'kontingen_id required' }, { status:400 })

  const kid = Number(kontingenId)

  const [
    { count: total_atlet },
    { count: verified },
    { count: pending },
    { count: ditolak },
    { count: lolos_kual },
  ] = await Promise.all([
    sb.from('atlet').select('*', {count:'exact',head:true}).eq('kontingen_id', kid),
    sb.from('atlet').select('*', {count:'exact',head:true}).eq('kontingen_id', kid).eq('status','verified'),
    sb.from('atlet').select('*', {count:'exact',head:true}).eq('kontingen_id', kid).eq('status','pending'),
    sb.from('atlet').select('*', {count:'exact',head:true}).eq('kontingen_id', kid).eq('status','ditolak'),
    sb.from('atlet').select('*', {count:'exact',head:true}).eq('kontingen_id', kid).eq('status_kualifikasi','lolos'),
  ])

  // Medali dari klasemen
  const { data: medali } = await sb
    .from('klasemen_medali')
    .select('emas, perak, perunggu')
    .eq('kontingen_id', kid)
    .single()

  return NextResponse.json({
    total_atlet:    total_atlet ?? 0,
    verified:       verified ?? 0,
    pending:        pending ?? 0,
    ditolak:        ditolak ?? 0,
    lolos_kual:     lolos_kual ?? 0,
    total_emas:     medali?.emas ?? 0,
    total_perak:    medali?.perak ?? 0,
    total_perunggu: medali?.perunggu ?? 0,
  })
}