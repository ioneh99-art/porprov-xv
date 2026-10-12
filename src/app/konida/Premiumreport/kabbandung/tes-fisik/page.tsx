// src/app/konida/Premiumreport/kabbandung/tes-fisik/page.tsx
// Premium Report > Tes Biomotorik untuk Kab. Bandung (kontingen_id=4)

import TesFisikDetailReport from '@/components/konida/TesFisikDetailReport'
import { KEMBALI_DARI_PREMIUM_KABBANDUNG } from '@/lib/saklar-menu'

export default function TesFisikKabBandungPage() {
  return (
    <TesFisikDetailReport
      kontingenId={4}
      tenantName="Kab. Bandung"
      tenantSlug="kabbandung"
      primary="#075985"
      backHref={KEMBALI_DARI_PREMIUM_KABBANDUNG}
    />
  )
}
