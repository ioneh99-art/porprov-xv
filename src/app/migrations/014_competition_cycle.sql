-- 014_competition_cycle.sql
-- KBAAS Fase 3.12 — roadmap kompetisi multi-tahun per atlet.

CREATE TABLE IF NOT EXISTS atlet_competition_cycle (
  id BIGSERIAL PRIMARY KEY,
  atlet_id INTEGER REFERENCES atlet(id) ON DELETE CASCADE,
  tahun INT NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT,                 -- PORPROV / KEJURNAS / PON / INTERNATIONAL / OTHER
  category_age TEXT,
  nomor_pertandingan TEXT,
  target_medal TEXT,
  target_mark TEXT,
  actual_medal TEXT,
  actual_mark TEXT,
  status TEXT DEFAULT 'PLANNED',   -- PLANNED / COMPLETED / SKIPPED / INJURED
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(atlet_id, tahun, event_name, nomor_pertandingan)
);
CREATE INDEX IF NOT EXISTS idx_acc_atlet ON atlet_competition_cycle(atlet_id, tahun);

GRANT SELECT ON atlet_competition_cycle TO anon, authenticated, service_role;

-- Auto-populate dari hasil kejurnas yang sudah ter-link
INSERT INTO atlet_competition_cycle (atlet_id, tahun, event_name, event_type, category_age, nomor_pertandingan, actual_medal, actual_mark, status)
SELECT ekr.atlet_id, EXTRACT(YEAR FROM ekr.event_date)::int, ekr.event_name,
  CASE WHEN ekr.event_name ILIKE '%kejurnas%' OR ekr.event_name ILIKE '%open athletics%' OR ekr.event_name ILIKE '%championship%' THEN 'KEJURNAS'
       WHEN ekr.event_name ILIKE '%porprov%' THEN 'PORPROV'
       WHEN ekr.event_name ILIKE '%pon%' THEN 'PON'
       ELSE 'OTHER' END,
  ekr.kategori_umur, ekr.nomor_pertandingan, ekr.medal, ekr.mark, 'COMPLETED'
FROM event_kejurnas_results ekr
WHERE ekr.atlet_id IS NOT NULL
ON CONFLICT DO NOTHING;
