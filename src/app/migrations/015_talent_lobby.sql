-- 015_talent_lobby.sql
-- KBAAS Fase 3.11 — Talent Lobby (SENSITIF). Identifikasi atlet Jabar berprestasi
-- nasional yang belum ter-link kontingen, sebagai kandidat scouting. Full audit trail.
-- ADAPTASI: flagged_by/performed_by = TEXT (custom cookie auth, bukan auth.users).

CREATE TABLE IF NOT EXISTS talent_lobby_candidates (
  id BIGSERIAL PRIMARY KEY,
  source_event_kejurnas_id BIGINT REFERENCES event_kejurnas_results(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  candidate_team TEXT NOT NULL,
  candidate_year_of_birth SMALLINT,
  candidate_gender VARCHAR(2),
  cabor_nama TEXT,
  nomor_pertandingan TEXT,
  best_result TEXT,
  medal TEXT,
  event_date DATE,
  flagged_for_recruitment BOOLEAN DEFAULT FALSE,
  flagged_at TIMESTAMPTZ,
  flagged_by TEXT,
  flagged_reason TEXT,
  contact_status TEXT DEFAULT 'NOT_CONTACTED',
  contact_notes TEXT,
  target_kontingen_id INT REFERENCES kontingen(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_event_kejurnas_id)
);
CREATE INDEX IF NOT EXISTS idx_tlc_target ON talent_lobby_candidates(target_kontingen_id, flagged_for_recruitment);

CREATE TABLE IF NOT EXISTS talent_lobby_audit_log (
  id BIGSERIAL PRIMARY KEY,
  candidate_id BIGINT REFERENCES talent_lobby_candidates(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_data JSONB,
  performed_by TEXT,
  performed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tlal_candidate ON talent_lobby_audit_log(candidate_id);

CREATE OR REPLACE VIEW v_talent_lobby_jabar AS
SELECT
  ekr.id AS event_id, ekr.athlete_name_raw AS candidate_name, ekr.team_name AS candidate_team,
  ekr.year_of_birth, (2026 - ekr.year_of_birth) AS umur_2026, ekr.gender,
  ekr.cabor_nama, ekr.nomor_pertandingan, ekr.kategori_umur, ekr.mark, ekr.medal, ekr.rank,
  ekr.event_date, ekr.event_name,
  tlc.id AS candidate_id, tlc.flagged_for_recruitment, tlc.contact_status,
  (ekr.team_name ILIKE '%jawa barat%' AND ekr.atlet_id IS NULL AND ekr.medal IS NOT NULL) AS is_eligible_candidate
FROM event_kejurnas_results ekr
LEFT JOIN talent_lobby_candidates tlc ON tlc.source_event_kejurnas_id = ekr.id
WHERE ekr.team_name ILIKE '%jawa barat%'
  AND ekr.atlet_id IS NULL
  AND ekr.event_date > NOW() - INTERVAL '12 months';

GRANT SELECT ON v_talent_lobby_jabar TO service_role;
