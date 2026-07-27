-- 038_intel_strategis.sql — Fase 1b Intelijen Strategis (File B, BRIEF §5b). Applied live.
-- Non-destruktif. RLS aktif TANPA policy → service-only. batch_id reuse rekonsiliasi_batch.
CREATE TABLE IF NOT EXISTS intel_target_atlet (
  id BIGSERIAL PRIMARY KEY, batch_id BIGINT REFERENCES rekonsiliasi_batch(id) ON DELETE CASCADE,
  kontingen_id INTEGER NOT NULL, atlet_id INTEGER REFERENCES atlet(id), nama_file TEXT NOT NULL, cabang_file TEXT,
  target_medali TEXT CHECK (target_medali IN ('emas','perak','perunggu') OR target_medali IS NULL),
  capaian_catatan TEXT, pesaing TEXT, analisis TEXT,
  match_method TEXT CHECK (match_method IN ('nik','nama_exact','nama_fuzzy','manual','tidak_ketemu')),
  match_score NUMERIC(4,3), created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (batch_id, nama_file, cabang_file)
);
CREATE INDEX IF NOT EXISTS idx_intel_target_atlet ON intel_target_atlet(atlet_id);
CREATE INDEX IF NOT EXISTS idx_intel_target_batch ON intel_target_atlet(batch_id);
CREATE TABLE IF NOT EXISTS intel_target_cabang (
  id BIGSERIAL PRIMARY KEY, batch_id BIGINT REFERENCES rekonsiliasi_batch(id) ON DELETE CASCADE,
  kontingen_id INTEGER NOT NULL, cabang TEXT NOT NULL,
  target_cabor_emas NUMERIC(5,2), target_koni_emas NUMERIC(5,2), probability NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (batch_id, cabang)
);
CREATE OR REPLACE VIEW v_kbaas_target_summary WITH (security_invoker = on) AS
SELECT ita.kontingen_id, ita.batch_id,
  COUNT(*) FILTER (WHERE target_medali='emas') AS atlet_target_emas,
  COUNT(*) FILTER (WHERE target_medali='perak') AS atlet_target_perak,
  COUNT(*) FILTER (WHERE target_medali='perunggu') AS atlet_target_perunggu,
  (SELECT SUM(target_cabor_emas) FROM intel_target_cabang c WHERE c.batch_id=ita.batch_id) AS total_target_cabor_emas,
  (SELECT SUM(target_koni_emas) FROM intel_target_cabang c WHERE c.batch_id=ita.batch_id) AS total_target_koni_emas
FROM intel_target_atlet ita JOIN rekonsiliasi_batch rb ON rb.id=ita.batch_id AND rb.status='confirmed'
GROUP BY ita.kontingen_id, ita.batch_id;
ALTER TABLE intel_target_atlet ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_target_cabang ENABLE ROW LEVEL SECURITY;
