// src/app/konida/Premiumreport/kabbogor/tes-fisik/page.tsx
// Premium Report > Tes Biomotorik untuk Kab. Bogor (kontingen_id=1)

import TesFisikDetailReport from '@/components/konida/TesFisikDetailReport'

export default function TesFisikKabBogorPage() {
  return (
    <TesFisikDetailReport
      kontingenId={1}
      tenantName="Kab. Bogor"
      tenantSlug="kabbogor"
      primary="#065f46"
      backHref="/konida/Premiumreport/kabbogor"
    />
  )
}
