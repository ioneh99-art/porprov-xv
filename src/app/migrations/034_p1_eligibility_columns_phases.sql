-- 034_p1_eligibility_columns_phases.sql
-- P1 (2026-07-20) — sudah diterapkan ke live. Kolom aturan eligibilitas per nomor
-- (meniru event_class ISTIMEWA) + tabel fase kompetisi. Semua nullable = tanpa batas.
ALTER TABLE nomor_pertandingan
  ADD COLUMN IF NOT EXISTS usia_min INTEGER,
  ADD COLUMN IF NOT EXISTS usia_maks INTEGER,
  ADD COLUMN IF NOT EXISTS max_peserta_kontingen INTEGER,
  ADD COLUMN IF NOT EXISTS max_nomor_per_atlet INTEGER;
CREATE TABLE IF NOT EXISTS fase_kompetisi (
  id BIGSERIAL PRIMARY KEY, event_id INTEGER REFERENCES event_info(id),
  tipe TEXT NOT NULL, nama TEXT, tanggal_buka TIMESTAMPTZ, tanggal_tutup TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fase_kompetisi_tipe_idx ON fase_kompetisi (tipe);
ALTER TABLE fase_kompetisi ENABLE ROW LEVEL SECURITY;
CREATE POLICY fase_kompetisi_read ON fase_kompetisi FOR SELECT TO public USING (true);
