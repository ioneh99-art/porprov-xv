-- ============================================================
-- PORPROV XV — Migration 008: Dayung Brief Cache (Phase 3)
--   Cache Strategic Brief (di-generate harian via Vercel cron daily-brief)
--   agar page brief tampil instan tanpa panggil AI tiap buka.
-- ============================================================

CREATE TABLE IF NOT EXISTS dayung_brief_cache (
  id BIGSERIAL PRIMARY KEY,
  cache_key VARCHAR(120) NOT NULL UNIQUE,   -- mis. 'strategic_4'
  kontingen_id INTEGER,
  content_markdown TEXT NOT NULL,
  stats JSONB,
  model_used VARCHAR(50),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

ALTER TABLE dayung_brief_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dayung_brief_cache_select_anon ON dayung_brief_cache;
DROP POLICY IF EXISTS dayung_brief_cache_select_auth ON dayung_brief_cache;
CREATE POLICY dayung_brief_cache_select_anon ON dayung_brief_cache FOR SELECT TO anon          USING (true);
CREATE POLICY dayung_brief_cache_select_auth ON dayung_brief_cache FOR SELECT TO authenticated USING (true);
-- INSERT/UPDATE lewat service key (cron / API), bypass RLS.

-- ROLLBACK: DROP TABLE dayung_brief_cache;
