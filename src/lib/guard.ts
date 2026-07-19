// src/lib/guard.ts
// Guard route API (Node runtime): verifikasi sesi bertanda tangan + cek role.
// Pakai di awal handler: `const g = await requireRole(); if (g instanceof NextResponse) return g`

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifySessionCookie } from './session'

export async function getServerSession(): Promise<any | null> {
  const c = cookies()
  return verifySessionCookie(c.get('porprov_session')?.value, c.get('porprov_sig')?.value)
}

/** Return payload bila OK, atau NextResponse (401/403) bila gagal. roles kosong = cukup login. */
export async function requireRole(roles?: string[]): Promise<any | NextResponse> {
  const payload = await getServerSession()
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (roles && roles.length) {
    const lvl = payload.level, rol = payload.role
    if (!roles.includes(lvl) && !roles.includes(rol)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }
  return payload
}
