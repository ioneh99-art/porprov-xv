import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ImportWizard } from '@/components/konida/performance/ImportWizard'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: cabors } = await supabase
    .from('cabor_performance_config')
    .select([
      'id', 'cabor_nama', 'sport_type', 'normalized_field',
      'lower_is_better', 'score_unit', 'has_weight_class',
      'has_multi_periode', 'excel_template_columns', 'operator_notes',
      'weight_classes', 'periode_options',
    ].join(','))
    .order('cabor_nama')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ImportWizard cabors={(cabors ?? []) as any} />
}
