// src/lib/audit.ts
// Tulis jejak audit ke audit_logs (service key, bypass RLS). Best-effort — jangan gagalkan
// operasi utama kalau audit gagal.

import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export interface AuditInput {
  action: string
  resource?: string
  resource_id?: string | number | null
  actor_id?: string | null
  actor_email?: string | null
  actor_role?: string | null
  kontingen_id?: number | null
  payload?: any
  severity?: 'info' | 'warning' | 'critical'
  ip?: string | null
  user_agent?: string | null
}

/** Ambil IP + user-agent dari request (untuk jejak). */
export function reqMeta(req: Request): { ip: string | null; user_agent: string | null } {
  return {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    user_agent: req.headers.get('user-agent') ?? null,
  }
}

export async function writeAudit(a: AuditInput): Promise<void> {
  try {
    await sb.from('audit_logs').insert({
      action:       a.action,
      resource:     a.resource ?? null,
      resource_id:  a.resource_id != null ? String(a.resource_id) : null,
      actor_id:     a.actor_id ?? null,
      actor_email:  a.actor_email ?? null,
      actor_role:   a.actor_role ?? null,
      kontingen_id: a.kontingen_id ?? null,
      payload:      a.payload ?? null,
      ip_address:   a.ip ?? null,
      user_agent:   a.user_agent ?? null,
      severity:     a.severity ?? 'info',
    })
  } catch { /* best-effort: abaikan error audit */ }
}
