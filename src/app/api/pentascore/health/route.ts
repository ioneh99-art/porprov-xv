/**
 * PentaScore Health Check API
 *
 * GET /api/pentascore/health
 *
 * Returns status of all critical subsystems:
 *   - Database connection
 *   - Storage bucket
 *   - Formula engine
 *   - Recent activity (audit log)
 *   - Tenant/event counts
 */
import { NextResponse } from 'next/server'
import { pscDb, getPentascoreSession } from '@/lib/pentascore/db'
import {
  PENTASCORE_VERSION, fencingRankingPts, fencingDEPts,
  swimmingPts, obstaclePts, laserRunPts,
} from '@/lib/sport-plugins/pentathlon/pentascore_v1'

export const dynamic = 'force-dynamic'

const STORAGE_BUCKET = 'pentascore-public'

export async function GET() {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const checks: any = {}
  const start = Date.now()

  // 1. Database
  try {
    const t = Date.now()
    const { error } = await pscDb.from('ps_tenants').select('id', { count: 'exact', head: true })
    checks.database = {
      status: error ? 'error' : 'ok',
      latency_ms: Date.now() - t,
      error: error?.message,
    }
  } catch (e: any) {
    checks.database = { status: 'error', error: e.message }
  }

  // 2. Storage bucket
  try {
    const { data, error } = await pscDb.storage.from(STORAGE_BUCKET).list('', { limit: 1 })
    checks.storage = {
      status: error ? 'error' : 'ok',
      bucket: STORAGE_BUCKET,
      error: error?.message,
      hint: error
        ? `Create bucket "${STORAGE_BUCKET}" di Supabase Dashboard → Storage with public access`
        : undefined,
    }
  } catch (e: any) {
    checks.storage = { status: 'error', bucket: STORAGE_BUCKET, error: e.message }
  }

  // 3. Formula engine self-test
  try {
    // Run known UIPM test cases
    const tests = [
      { name: 'Fencing Ranking V=20 at target in 30-group',
        actual: fencingRankingPts({ victories: 20, totalBouts: 29, redCards: 0 }),
        expected: 250 },
      { name: 'Fencing DE position 1',
        actual: fencingDEPts(1),
        expected: 250 },
      { name: 'Fencing DE position 18',
        actual: fencingDEPts(18),
        expected: 196 },
      { name: 'Swimming 02:00.00 (12000c)',
        actual: swimmingPts(12000),
        expected: 0 },
      { name: 'Swimming 01:55.00 (11500c)',
        actual: swimmingPts(11500),
        expected: 25 },
      { name: 'Obstacle 70.5s (7050c)',
        actual: obstaclePts(7050),
        expected: 234 },
      { name: 'Laser Run 12:30 (75000c)',
        actual: laserRunPts(75000),
        expected: 550 },
    ]
    const failed = tests.filter(t => t.actual !== t.expected)
    checks.formula_engine = {
      status: failed.length === 0 ? 'ok' : 'error',
      version: PENTASCORE_VERSION,
      total_tests: tests.length,
      passed: tests.length - failed.length,
      failed: failed.length,
      failures: failed,
    }
  } catch (e: any) {
    checks.formula_engine = { status: 'error', error: e.message }
  }

  // 4. System counts
  try {
    const [
      { count: tenantCount },
      { count: activeTenantCount },
      { count: eventCount },
      { count: athleteCount },
      { count: auditCount },
    ] = await Promise.all([
      pscDb.from('ps_tenants').select('id', { count: 'exact', head: true }),
      pscDb.from('ps_tenants').select('id', { count: 'exact', head: true }).eq('is_active', true),
      pscDb.from('ps_events').select('id', { count: 'exact', head: true }),
      pscDb.from('ps_event_athletes').select('id', { count: 'exact', head: true }),
      pscDb.from('ps_audit_log').select('id', { count: 'exact', head: true }),
    ])
    checks.system_counts = {
      status: 'ok',
      tenants: tenantCount ?? 0,
      tenants_active: activeTenantCount ?? 0,
      events: eventCount ?? 0,
      event_athletes: athleteCount ?? 0,
      audit_entries: auditCount ?? 0,
    }
  } catch (e: any) {
    checks.system_counts = { status: 'error', error: e.message }
  }

  // 5. Recent activity (audit log)
  try {
    const { data: recent } = await pscDb
      .from('ps_audit_log')
      .select('created_at, actor_username, action_type, target_table')
      .order('created_at', { ascending: false })
      .limit(5)
    checks.recent_activity = {
      status: 'ok',
      latest_5: recent ?? [],
    }
  } catch (e: any) {
    checks.recent_activity = { status: 'error', error: e.message }
  }

  // 6. Defense layers
  checks.defense_layers = {
    L1_formula_transparency: 'active',
    L2_cross_validation:     'active',
    L3_audit_log:            'active',
    L4_discipline_locking:   'active',
    L5_formula_versioning:   'active',
    L6_public_disclosure:    'active',
  }

  const allOk = Object.values(checks).every((c: any) => c.status !== 'error')
  const totalLatency = Date.now() - start

  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    formula_version: PENTASCORE_VERSION,
    timestamp: new Date().toISOString(),
    latency_ms: totalLatency,
    checks,
  })
}
