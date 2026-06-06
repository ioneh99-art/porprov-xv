-- ============================================================
-- Migration 003: Audit Log Table
-- Diperlukan oleh: /superadmin/logs
-- Jalankan di: Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id    TEXT,                        -- user id atau 'system'
  actor_email TEXT,
  actor_role  TEXT,
  kontingen_id INTEGER REFERENCES kontingen(id),
  action      TEXT NOT NULL,              -- 'UPDATE_ATLET', 'APPROVE', 'LOGIN', dll
  resource    TEXT,                        -- 'atlet', 'dokumen', 'subscription', dll
  resource_id TEXT,                        -- UUID atau ID entitas
  payload     JSONB,                       -- data sebelum/sesudah
  ip_address  TEXT,
  user_agent  TEXT,
  severity    TEXT NOT NULL DEFAULT 'info'  -- 'info' | 'warning' | 'critical'
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx   ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx     ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_kontingen_id_idx ON audit_logs (kontingen_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx       ON audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_severity_idx     ON audit_logs (severity);

-- RLS: hanya superadmin yang bisa baca
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin read audit" ON audit_logs
  FOR SELECT USING (true);   -- sesuaikan dengan auth check superadmin

CREATE POLICY "insert audit" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ─── Seed data (demo) ────────────────────────────────────────
-- Uncomment untuk test UI sebelum log real masuk
/*
INSERT INTO audit_logs (actor_email, actor_role, action, resource, resource_id, severity) VALUES
  ('admin@kabbogor.go.id',  'level2', 'UPDATE_ATLET',     'atlet',        'uuid-001', 'info'),
  ('admin@kabbogor.go.id',  'level2', 'APPROVE_ATLET',    'atlet',        'uuid-002', 'info'),
  ('admin@bekasi.go.id',    'level2', 'REJECT_DOKUMEN',   'atlet_dokumen','uuid-003', 'warning'),
  ('superadmin@porprov.id', 'superadmin','UPDATE_TENANT',  'tenants',      'tenant-01','info'),
  ('superadmin@porprov.id', 'superadmin','DELETE_USER',    'users',        'user-042', 'critical');
*/
