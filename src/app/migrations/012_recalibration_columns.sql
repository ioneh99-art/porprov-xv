-- 012_recalibration_columns.sql
-- KBAAS Fase 2.5 — kolom audit recalibration prediksi medali.

ALTER TABLE atlet_baseline_performance
  ADD COLUMN IF NOT EXISTS last_recalibrated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recalibration_source JSONB,
  ADD COLUMN IF NOT EXISTS national_medal_boost JSONB;

COMMENT ON COLUMN atlet_baseline_performance.recalibration_source IS
  'JSON: {gap_pct, base_probability, medal_boost, recent_medals_count, boost_sources, calculated_at}';
COMMENT ON COLUMN atlet_baseline_performance.national_medal_boost IS
  'JSON: {emas, perak, perunggu} boost dari medali nasional terbaru';
