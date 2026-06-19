import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { generateExcelTemplate } from '@/lib/performance/excel-template'

export const dynamic = 'force-dynamic'

// GET /api/performance/template?cabor=Atletik
export async function GET(req: NextRequest) {
  const caborNama = req.nextUrl.searchParams.get('cabor')
  if (!caborNama) {
    return NextResponse.json({ error: 'Parameter cabor diperlukan' }, { status: 400 })
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  // List semua cabor
  if (caborNama === '__list') {
    const { data } = await supabase
      .from('cabor_performance_config')
      .select('id,cabor_nama,sport_type,normalized_field,lower_is_better,score_unit,has_weight_class,has_multi_periode,excel_template_columns,operator_notes,metrics_schema,weight_classes,periode_options')
      .order('cabor_nama')
    return NextResponse.json(data ?? [])
  }

  const { data: config, error } = await supabase
    .from('cabor_performance_config')
    .select('*')
    .eq('cabor_nama', caborNama)
    .single()

  if (error || !config) {
    return NextResponse.json({ error: 'Cabor tidak ditemukan' }, { status: 404 })
  }

  const buffer = generateExcelTemplate(config)
  const filename = `Template_Import_${caborNama.replace(/\s+/g, '_')}.xlsx`

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}
