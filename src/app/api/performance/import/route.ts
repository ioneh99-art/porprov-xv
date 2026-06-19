import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { parseImportBuffer } from '@/lib/performance/import-parser'

export const dynamic = 'force-dynamic'

// POST /api/performance/import
// FormData: file (xlsx), cabor_nama, action ('preview'|'import'), kontingen_id
export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file       = form.get('file')       as File | null
  const caborNama  = form.get('cabor_nama') as string | null
  const action     = (form.get('action') ?? 'preview') as 'preview' | 'import'
  const kontiId    = parseInt((form.get('kontingen_id') as string) ?? '4')

  if (!file || !caborNama) {
    return NextResponse.json({ error: 'file dan cabor_nama wajib diisi' }, { status: 400 })
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  // Fetch cabor config
  const { data: config, error: cfgErr } = await supabase
    .from('cabor_performance_config')
    .select('*')
    .eq('cabor_nama', caborNama)
    .single()

  if (cfgErr || !config) {
    return NextResponse.json({ error: 'Config cabor tidak ditemukan' }, { status: 404 })
  }

  // Parse Excel
  const buf = Buffer.from(await file.arrayBuffer())
  const { rows, errors, totalRows, skippedRows } = parseImportBuffer(buf, config)

  if (errors.length > 0) {
    return NextResponse.json({ errors, rows: [], totalRows: 0, skippedRows: 0 }, { status: 422 })
  }

  if (action === 'preview') {
    return NextResponse.json({ rows, errors, totalRows, skippedRows, config })
  }

  // ── IMPORT: save to DB ──────────────────────────────────────────────
  // Look up atlet_id by nama in kontingen
  const uniqueNames = rows.map(r => r.atlet_nama).filter((v, i, a) => a.indexOf(v) === i)
  const { data: atletData } = await supabase
    .from('atlet')
    .select('id, nama')
    .eq('kontingen_id', kontiId)

  const atletMap: Record<string, number> = {}
  atletData?.forEach(a => {
    atletMap[a.nama.trim().toLowerCase()] = a.id
  })

  // Mark old records as not-latest before inserting new batch
  // (only for same atlet + event combinations)
  const toInsert = rows.map(r => {
    const atlet_id = atletMap[r.atlet_nama.trim().toLowerCase()] ?? null
    return {
      atlet_id,
      cabor_id:          null,
      event_name:        r.event_name,
      weight_class:      r.weight_class ?? null,
      normalized_score:  r.normalized_score ?? null,
      lower_is_better:   config.lower_is_better,
      rekor_porprov:     r.rekor_porprov ?? null,
      target_kompetitor: r.target_kompetitor ?? null,
      gap_percentage:    r.gap_percentage ?? null,
      target_medali:     r.target_medali_pelatih ?? r.target_medali_calc ?? null,
      raw_metrics:       r.raw_metrics,
      periode:           r.periode,
      is_latest:         true,
      sumber_data:       file.name,
      imported_from:     'excel_upload',
      catatan:           r.catatan ?? null,
      kontingen_id:      kontiId,
    }
  })

  const { data: inserted, error: insErr } = await supabase
    .from('atlet_performance_data')
    .insert(toInsert)
    .select('id')

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  const notFound = rows
    .filter(r => !atletMap[r.atlet_nama.trim().toLowerCase()])
    .map(r => r.atlet_nama)
    .filter((v, i, a) => a.indexOf(v) === i)

  return NextResponse.json({
    success:  true,
    inserted: inserted?.length ?? 0,
    notFound,
  })
}
