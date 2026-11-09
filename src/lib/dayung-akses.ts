// src/lib/dayung-akses.ts — siapa boleh memakai API Dayung PODSI Jabar (server saja).
import { getServerSession } from '@/lib/guard'

/** Sesi admin/KONI Jabar atau operator cabor Dayung; selain itu null. */
export async function sesiDayung(): Promise<any | null> {
  const s: any = await getServerSession()
  if (!s) return null
  const admin = ['superadmin', 'admin', 'koni_jabar'].includes(s.role) || ['superadmin', 'koni_jabar'].includes(s.level)
  const opDayung = s.role === 'operator_cabor' && (/dayung/i.test(s.cabor_nama ?? '') || /dayung/i.test(s.username ?? '') || Number(s.cabor_id) === 147)
  return admin || opDayung ? s : null
}
