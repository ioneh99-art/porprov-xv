/**
 * PentaScore Supabase client + auth/session helpers
 * ==================================================
 * Reuses existing porprov-xv Supabase project but with ps_* table scope.
 */

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Shared Supabase client (server-side, uses service key)
export const pscDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ════════════════════════════════════════════════════════════════════
// SESSION
// ════════════════════════════════════════════════════════════════════

export type PentascoreSession = {
  username: string
  nama: string
  role: 'superadmin' | 'tenant_admin' | 'operator' | 'viewer'
  active_tenant_id?: string
  active_tenant_slug?: string
}

/**
 * Read PentaScore session from cookie.
 *
 * Phase 1: Falls back to existing porprov_session cookie if no
 * dedicated pentascore_session cookie exists. This allows operators
 * who are already logged into PORPROV XV to access PentaScore.
 *
 * Phase 2 (Sprint 5+): dedicated /pentascore login + cookie.
 */
export async function getPentascoreSession(): Promise<PentascoreSession | null> {
  const c = await cookies()

  // Try pentascore-specific cookie first
  const psc = c.get('pentascore_session')
  if (psc?.value) {
    try {
      return JSON.parse(psc.value) as PentascoreSession
    } catch {
      // fall through
    }
  }

  // Fallback: piggyback on existing porprov session
  const pp = c.get('porprov_session')
  if (pp?.value) {
    try {
      const parsed = JSON.parse(pp.value) as {
        nama?: string
        username?: string
        role?: string
      }
      return {
        username: parsed.username ?? 'unknown',
        nama: parsed.nama ?? parsed.username ?? 'Operator',
        role: parsed.role === 'admin' ? 'tenant_admin' : 'operator',
      }
    } catch {
      return null
    }
  }

  return null
}

/** Strict version — throws if no session. Use in API routes. */
export async function requirePentascoreSession(): Promise<PentascoreSession> {
  const s = await getPentascoreSession()
  if (!s) {
    throw new Error('Unauthorized: PentaScore session required')
  }
  return s
}

// ════════════════════════════════════════════════════════════════════
// AUDIT HELPER
// ════════════════════════════════════════════════════════════════════

export type AuditAction =
  | 'create' | 'update' | 'delete'
  | 'lock' | 'unlock' | 'compute' | 'import'
  | 'login' | 'logout'

export async function writeAudit(args: {
  tenantId?: string | null
  eventId?: string | null
  phaseId?: string | null
  actorUsername: string
  actorRole?: string
  actionType: AuditAction
  targetTable: string
  targetId?: string | null
  oldValues?: any
  newValues?: any
  reason?: string
}) {
  try {
    await pscDb.from('ps_audit_log').insert({
      tenant_id:      args.tenantId ?? null,
      event_id:       args.eventId ?? null,
      phase_id:       args.phaseId ?? null,
      actor_username: args.actorUsername,
      actor_role:     args.actorRole ?? null,
      action_type:    args.actionType,
      target_table:   args.targetTable,
      target_id:      args.targetId ?? null,
      old_values:     args.oldValues ?? null,
      new_values:     args.newValues ?? null,
      reason:         args.reason ?? null,
    })
  } catch (e) {
    // Audit logging must never break the main operation
    console.error('[PentaScore Audit] Failed to write audit log:', e)
  }
}
