// src/lib/lapor-admin.ts
// Siapa yang boleh mengesahkan laporan dan mengelola kode PIC, dan untuk kontingen mana.

import { NextRequest } from 'next/server'
import { getServerSession } from './guard'

const adminPusat = (s: any) =>
  ['superadmin', 'koni_jabar'].includes(s.role) || ['superadmin', 'koni_jabar'].includes(s.level)

export interface AdminLapor { sesi: any; kontingen_id: number; nama: string }

/**
 * KONIDA hanya untuk kontingennya sendiri (dari sesi, bukan dari alamat).
 * Admin pusat wajib menyebut kontingen_id. Operator cabor tidak boleh mengesahkan.
 */
export async function ambilAdminLapor(req: NextRequest): Promise<AdminLapor | { status: number; error: string }> {
  const s = await getServerSession()
  if (!s) return { status: 401, error: 'Silakan login dulu.' }
  const nama = s.nama || s.username || 'admin'
  if (adminPusat(s)) {
    const k = Number(new URL(req.url).searchParams.get('kontingen_id'))
    if (!Number.isInteger(k) || k <= 0) return { status: 400, error: 'kontingen_id wajib disebut.' }
    return { sesi: s, kontingen_id: k, nama }
  }
  if (s.role !== 'konida' || s.kontingen_id == null) return { status: 403, error: 'Hanya admin KONIDA yang boleh membuka ini.' }
  return { sesi: s, kontingen_id: Number(s.kontingen_id), nama }
}
