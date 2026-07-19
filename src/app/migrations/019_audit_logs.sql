-- 019_audit_logs.sql
-- Tahap 3 / 2.4 — audit trail terpusat (tabel sebelumnya tak pernah dibuat di live).
-- Baca HANYA via API service-key (/api/superadmin/logs, dijaga middleware superadmin). RLS deny-anon.

CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id    TEXT,
  actor_email TEXT,
  actor_role  TEXT,
  kontingen_id INTEGER REFERENCES kontingen(id),
  action      TEXT NOT NULL,
  resource    TEXT,
  resource_id TEXT,
  payload     JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  severity    TEXT NOT NULL DEFAULT 'info'
);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx      ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx     ON audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_severity_idx   ON audit_logs (severity);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- TANPA policy anon → service_role (API) saja yang bisa akses.
