// src/app/operator/dayung/tes-biomotorik/page.tsx
// PREMIUM — Tes Biomotorik (konsep KONIDA Kab. Bandung), scope atlet Dayung saja.

import TesFisikDetailReport from '@/components/konida/TesFisikDetailReport'

export default function DayungTesBiomotorikPage() {
  return (
    <TesFisikDetailReport
      kontingenId={4}
      caborFilter="Dayung"
      tenantName="Dayung · Kab. Bandung"
      tenantSlug="kabbandung"
      primary="#38bdf8"
      backHref="/operator/dayung"
    />
  )
}
