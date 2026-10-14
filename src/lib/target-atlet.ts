// src/lib/target-atlet.ts
// Target medali per atlet dari berkas analisis (intel_target_atlet, batch terakhir).
// Dipakai jurnal format KONI dan laporan cabor untuk kolom "Status Target".

import type { SupabaseClient } from '@supabase/supabase-js'
import { petaCabang } from './lapor'
import { ambilSemua } from './lapor-sesi'

export type TargetMedali = 'emas' | 'perak' | 'perunggu'
export const URUTAN_TARGET: Record<string, number> = { emas: 1, perak: 2, perunggu: 3 }

/**
 * atlet_id → target tertinggi. Tautan ke atlet di cabor lain diabaikan: itu sisa
 * salah-taut nama di berkas analisis, bukan target atlet tersebut.
 */
export async function targetAtlet(db: SupabaseClient, kontingenId: number): Promise<Record<number, TargetMedali>> {
  const target: Record<number, TargetMedali> = {}
  const { data: akhir } = await db.from('intel_target_atlet').select('batch_id').eq('kontingen_id', kontingenId)
    .order('batch_id', { ascending: false }).limit(1).maybeSingle()
  if (!akhir) return target

  const semuaTarget = await ambilSemua<any>((d, s) => db.from('intel_target_atlet').select('atlet_id,cabang_file,target_medali')
    .eq('batch_id', akhir.batch_id).not('atlet_id', 'is', null).order('id').range(d, s)).catch(() => [])
  const idTarget = Array.from(new Set(semuaTarget.map(t => t.atlet_id as number)))
  const caborAtlet: Record<number, number | null> = {}
  for (let i = 0; i < idTarget.length; i += 500) {
    const { data } = await db.from('atlet').select('id,cabor_id').in('id', idTarget.slice(i, i + 500))
    for (const r of (data ?? [])) caborAtlet[r.id] = r.cabor_id
  }
  const peta = petaCabang(semuaTarget.map(t => ({ cabang: t.cabang_file, cabor_id: caborAtlet[t.atlet_id] ?? null })))
  for (const t of semuaTarget) {
    if (!URUTAN_TARGET[t.target_medali] || peta.get(t.cabang_file) !== caborAtlet[t.atlet_id]) continue
    if (!target[t.atlet_id] || URUTAN_TARGET[t.target_medali] < URUTAN_TARGET[target[t.atlet_id]]) target[t.atlet_id] = t.target_medali
  }
  return target
}

/** Untuk beregu, target tim = target tertinggi di antara anggotanya. */
export function targetTim(atletIds: number[], target: Record<number, TargetMedali>): TargetMedali | null {
  return atletIds.map(id => target[id]).filter(Boolean).sort((x, y) => URUTAN_TARGET[x] - URUTAN_TARGET[y])[0] ?? null
}
