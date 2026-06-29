// scripts/recalibrate_once.ts
// KBAAS Fase 2.5 — jalankan recalibration sekali (default kontingen 4).
// Usage: npx tsx scripts/recalibrate_once.ts [kontingen_id]

import { recalibrateAll } from '../src/lib/medal-prediction/recalibrate'

async function main() {
  const k = process.argv[2] ? parseInt(process.argv[2]) : 4
  console.log(`⚙️  Recalibrate kontingen ${k}…`)
  const res = await recalibrateAll(k)
  console.log(`✅ processed ${res.processed} · errors ${res.errors} · total ${res.total}`)
}
main().catch(e => { console.error(e); process.exit(1) })
