-- 009_pipeline_watch.sql
-- KBAAS Fase 0 — Pipeline Watch foundation (tenant: kontingen_id=4 Kab. Bandung).
-- ADAPTASI dari BRIEF_PIPELINE_WATCH.md ke struktur repo:
--   • cabor_id -> cabang_olahraga(id)  (BUKAN cabor_master; FK asli atlet.cabor_id)
--   • semua id INTEGER (atlet.id, cabang_olahraga.id, kontingen_id = integer)
--   • TANPA RLS auth.uid()/user_kontingen/user_roles (repo pakai custom cookie auth + service key)
--     -> RLS enable deny-default; akses lewat API route service-key.
--   • linked_by/imported_by = TEXT (auth.users tidak dipakai)

-- ============================================================
-- 1. Extension fuzzy matching
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 2. TABLE: event_kejurnas_results
-- ============================================================
CREATE TABLE IF NOT EXISTS event_kejurnas_results (
  id BIGSERIAL PRIMARY KEY,

  -- Event
  event_name TEXT NOT NULL,
  event_short_name TEXT,
  event_date DATE NOT NULL,
  event_venue TEXT,
  event_organizer TEXT,
  cabor_id INTEGER REFERENCES cabang_olahraga(id),
  cabor_nama TEXT NOT NULL,

  -- Kategori
  kategori_umur TEXT,
  gender VARCHAR(2),
  nomor_pertandingan TEXT NOT NULL,
  round_type TEXT,
  heat_no SMALLINT,

  -- Atlet (raw dari sumber)
  comp_no INT,
  athlete_name_raw TEXT NOT NULL,
  year_of_birth SMALLINT,
  team_name TEXT NOT NULL,

  -- Linking ke tabel atlet
  atlet_id INTEGER REFERENCES atlet(id) ON DELETE SET NULL,
  link_confidence TEXT,             -- EXACT, HIGH, MEDIUM, LOW, UNLINKED, REJECTED
  link_notes TEXT,
  linked_at TIMESTAMPTZ,
  linked_by TEXT,

  -- Hasil
  rank SMALLINT,
  mark TEXT NOT NULL,               -- "59:10.10" / "10.11m" / "DNS"
  status TEXT NOT NULL,             -- OK, Q, q, DNS, DNF, DQ
  medal TEXT,                       -- EMAS, PERAK, PERUNGGU, NULL
  advance_to_next_round BOOLEAN DEFAULT FALSE,

  -- Rekornas context
  rekornas_value TEXT,
  rekornas_holder TEXT,
  rekornas_team TEXT,
  rekornas_date DATE,
  rekornas_broken BOOLEAN DEFAULT FALSE,

  -- Source tracking
  source_file TEXT,
  source_url TEXT,
  imported_by TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ekr_atlet ON event_kejurnas_results(atlet_id) WHERE atlet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ekr_event_date ON event_kejurnas_results(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_ekr_cabor ON event_kejurnas_results(cabor_id);
CREATE INDEX IF NOT EXISTS idx_ekr_team ON event_kejurnas_results(team_name);
CREATE INDEX IF NOT EXISTS idx_ekr_link_confidence ON event_kejurnas_results(link_confidence);
CREATE INDEX IF NOT EXISTS idx_ekr_medal ON event_kejurnas_results(medal) WHERE medal IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ekr_name_trgm ON event_kejurnas_results USING gin (athlete_name_raw gin_trgm_ops);

-- Auto updated_at
CREATE OR REPLACE FUNCTION update_ekr_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ekr_updated_at ON event_kejurnas_results;
CREATE TRIGGER trg_ekr_updated_at
  BEFORE UPDATE ON event_kejurnas_results
  FOR EACH ROW EXECUTE FUNCTION update_ekr_updated_at();

-- RLS: enable deny-default (service_role bypass). Akses app lewat API service-key.
ALTER TABLE event_kejurnas_results ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RPC: match_atlet_fuzzy — top-5 fuzzy match nama atlet
-- ============================================================
CREATE OR REPLACE FUNCTION match_atlet_fuzzy(
  p_name TEXT,
  p_kontingen_id INT,
  p_gender VARCHAR(2),
  p_year INT,
  p_threshold REAL DEFAULT 0.4
)
RETURNS TABLE (atlet_id INTEGER, nama_lengkap TEXT, tgl_lahir DATE, similarity REAL) AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.nama_lengkap::TEXT, a.tgl_lahir, similarity(a.nama_lengkap, p_name) AS sim
  FROM atlet a
  WHERE a.kontingen_id = p_kontingen_id
    AND a.gender = p_gender
    AND a.tgl_lahir IS NOT NULL
    AND ABS(EXTRACT(YEAR FROM a.tgl_lahir)::INT - p_year) <= 2
    AND similarity(a.nama_lengkap, p_name) >= p_threshold
  ORDER BY sim DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION match_atlet_fuzzy TO authenticated, service_role, anon;

-- ============================================================
-- 4. VIEW: v_pipeline_watch_jabar — atlet Jabar di event kejurnas eksternal
-- ============================================================
CREATE OR REPLACE VIEW v_pipeline_watch_jabar AS
SELECT
  ekr.id, ekr.event_date, ekr.event_short_name, ekr.cabor_nama,
  ekr.kategori_umur, ekr.gender, ekr.nomor_pertandingan, ekr.round_type,
  ekr.athlete_name_raw, ekr.year_of_birth, (2026 - ekr.year_of_birth) AS umur_2026,
  ekr.team_name, ekr.atlet_id,
  a.nama_lengkap AS atlet_db_nama, a.kontingen_id AS atlet_kontingen_id,
  ekr.link_confidence, ekr.rank, ekr.mark, ekr.medal, ekr.status,
  CASE
    WHEN ekr.atlet_id IS NOT NULL AND a.kontingen_id = 4 THEN 'KAB BANDUNG'
    WHEN ekr.team_name ILIKE '%jawa barat%' AND ekr.atlet_id IS NULL THEN 'JABAR (unlinked)'
    WHEN ekr.team_name ILIKE '%jawa barat%' THEN 'JABAR (other kab)'
    ELSE 'LUAR JABAR'
  END AS pipeline_tag,
  CASE
    WHEN ekr.medal = 'EMAS' THEN 1
    WHEN ekr.medal = 'PERAK' THEN 2
    WHEN ekr.medal = 'PERUNGGU' THEN 3
    WHEN ekr.advance_to_next_round THEN 4
    WHEN ekr.status = 'OK' THEN 5
    ELSE 6
  END AS priority_score
FROM event_kejurnas_results ekr
LEFT JOIN atlet a ON a.id = ekr.atlet_id
WHERE ekr.team_name ILIKE '%jawa barat%'
ORDER BY ekr.event_date DESC, priority_score ASC;
