-- ============================================================
-- PORPROV XV — Migration 005: Baseline Performance
--   Fitur baseline performa atlet (data PORPROV sebelumnya / 2022)
--   untuk prediksi medali PORPROV 2026. Tenant: Kab. Bandung (id=4).
-- ============================================================

CREATE TABLE IF NOT EXISTS atlet_baseline_performance (
  id                    BIGSERIAL PRIMARY KEY,
  atlet_id              BIGINT NOT NULL REFERENCES atlet(id) ON DELETE CASCADE,
  cabor_id              BIGINT NOT NULL REFERENCES cabang_olahraga(id),
  nomor_pertandingan_id BIGINT REFERENCES nomor_pertandingan(id),

  -- Data dari Excel
  event_name            VARCHAR(255) NOT NULL,
  gender                VARCHAR(10),
  waktu_terbaik         VARCHAR(50),
  target_medali         VARCHAR(50),
  pesaing               TEXT,
  rekor_porprov         VARCHAR(100),

  -- Computed
  waktu_seconds         DECIMAL(10,3),
  rekor_seconds         DECIMAL(10,3),
  gap_percentage        DECIMAL(7,2),
  medal_probability     JSONB DEFAULT '{"emas": 0, "perak": 0, "perunggu": 0}'::jsonb,

  -- Metadata
  tahun_baseline        INT DEFAULT 2022,
  is_relay              BOOLEAN DEFAULT FALSE,
  relay_position        INT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_baseline_atlet  ON atlet_baseline_performance(atlet_id);
CREATE INDEX IF NOT EXISTS idx_baseline_cabor  ON atlet_baseline_performance(cabor_id);
CREATE INDEX IF NOT EXISTS idx_baseline_event  ON atlet_baseline_performance(nomor_pertandingan_id);
CREATE INDEX IF NOT EXISTS idx_baseline_target ON atlet_baseline_performance(target_medali);

-- RLS — explicit SELECT untuk anon + authenticated (cegah return null senyap)
ALTER TABLE atlet_baseline_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS baseline_select_anon          ON atlet_baseline_performance;
DROP POLICY IF EXISTS baseline_select_authenticated ON atlet_baseline_performance;
DROP POLICY IF EXISTS baseline_insert_authenticated ON atlet_baseline_performance;
DROP POLICY IF EXISTS baseline_update_authenticated ON atlet_baseline_performance;
DROP POLICY IF EXISTS baseline_delete_authenticated ON atlet_baseline_performance;

CREATE POLICY baseline_select_anon          ON atlet_baseline_performance FOR SELECT TO anon          USING (true);
CREATE POLICY baseline_select_authenticated ON atlet_baseline_performance FOR SELECT TO authenticated USING (true);
CREATE POLICY baseline_insert_authenticated ON atlet_baseline_performance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY baseline_update_authenticated ON atlet_baseline_performance FOR UPDATE TO authenticated USING (true);
CREATE POLICY baseline_delete_authenticated ON atlet_baseline_performance FOR DELETE TO authenticated USING (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_baseline_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_baseline_updated_at ON atlet_baseline_performance;
CREATE TRIGGER trigger_baseline_updated_at
  BEFORE UPDATE ON atlet_baseline_performance
  FOR EACH ROW EXECUTE FUNCTION update_baseline_updated_at();
