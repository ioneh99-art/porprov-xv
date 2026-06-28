-- ============================================================
-- PORPROV XV — Migration 007: Dayung Phase 2 (Heat Draw)
--   Tambah kolom heat_number & lane ke kualifikasi_atlet (assignment),
--   dipakai Heat Draw Wizard. Nullable & additive — tidak mengganggu cabor lain.
--   Anomaly detection dihitung LIVE dari hasil_pertandingan (tanpa kolom baru),
--   jadi tidak ada perubahan skema lain.
-- ============================================================

ALTER TABLE kualifikasi_atlet ADD COLUMN IF NOT EXISTS heat_number SMALLINT;
ALTER TABLE kualifikasi_atlet ADD COLUMN IF NOT EXISTS lane SMALLINT;
CREATE INDEX IF NOT EXISTS idx_kualifikasi_heat ON kualifikasi_atlet(nomor_id, heat_number, lane);

-- ROLLBACK: ALTER TABLE kualifikasi_atlet DROP COLUMN heat_number, DROP COLUMN lane;
