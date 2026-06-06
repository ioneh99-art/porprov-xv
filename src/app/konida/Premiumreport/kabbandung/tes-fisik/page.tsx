// src/app/konida/Premiumreport/kabbandung/tes-fisik/page.tsx
// Premium Report > Tes Biomotorik untuk Kab. Bandung (kontingen_id=4)

import TesFisikDetailReport from '@/components/konida/TesFisikDetailReport'

export default function TesFisikKabBandungPage() {
  return (
    <TesFisikDetailReport
      kontingenId={4}
      tenantName="Kab. Bandung"
      tenantSlug="kabbandung"
      primary="#0369a1"
      backHref="/konida/Premiumreport/kabbandung"
    />
  )
}
