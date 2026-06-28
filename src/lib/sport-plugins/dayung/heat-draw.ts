// src/lib/sport-plugins/dayung/heat-draw.ts
// Heat draw: distribusi atlet ke heat × lane (snake seeding, FISA/ICF-style).
// Seed terbaik di lane tengah. Tanpa PB → pakai proxy (fitness/biomotor).

export interface SeedAtlet {
  atlet_id: number
  nama: string
  seed_value: number // makin tinggi = makin unggul
}

export interface HeatAssignment {
  atlet_id: number
  nama: string
  heat_number: number
  lane: number
}

// Lane prioritas: tengah dulu (air paling tenang / sight line terbaik)
const LANE_PRIORITY = [4, 3, 5, 2, 6, 1, 7, 8, 9]

/**
 * Bagi atlet ke heat (snake) lalu assign lane berdasar rank dalam heat.
 * @param atlets daftar atlet + seed_value
 * @param lanesPerHeat default 6 (Rowing) — Kayak/Canoe bisa 9
 */
export function drawHeats(atlets: SeedAtlet[], lanesPerHeat = 6): HeatAssignment[] {
  if (!atlets.length) return []
  const sorted = [...atlets].sort((a, b) => b.seed_value - a.seed_value)
  const numHeats = Math.max(1, Math.ceil(sorted.length / lanesPerHeat))
  const heats: SeedAtlet[][] = Array.from({ length: numHeats }, () => [])

  // Snake: seed teratas tersebar merata antar heat
  sorted.forEach((a, i) => {
    const round = Math.floor(i / numHeats)
    const pos = i % numHeats
    const heatIdx = round % 2 === 0 ? pos : numHeats - 1 - pos
    heats[heatIdx].push(a)
  })

  const out: HeatAssignment[] = []
  heats.forEach((heatAtlets, hi) => {
    heatAtlets.forEach((a, rankInHeat) => {
      out.push({
        atlet_id: a.atlet_id,
        nama: a.nama,
        heat_number: hi + 1,
        lane: LANE_PRIORITY[rankInHeat] ?? rankInHeat + 1,
      })
    })
  })
  return out
}
