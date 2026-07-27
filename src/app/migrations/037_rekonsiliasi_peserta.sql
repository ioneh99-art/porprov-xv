-- 037_rekonsiliasi_peserta.sql
-- Fase 1 Rekonsiliasi Peserta Resmi (BRIEF_FITUR_REKONSILIASI §5) — sudah diterapkan live.
-- Non-destruktif: tak menyentuh atlet. RLS aktif TANPA policy → anon ditolak, service-only.
CREATE TABLE IF NOT EXISTS rekonsiliasi_batch (
  id BIGSERIAL PRIMARY KEY, kontingen_id INTEGER NOT NULL, nama_file TEXT, sumber TEXT DEFAULT 'KONI',
  total_reviu INTEGER, total_portal INTEGER, total_db INTEGER,
  status TEXT DEFAULT 'dry_run' CHECK (status IN ('dry_run','confirmed','dibatalkan')),
  dibuat_oleh TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS rekonsiliasi_peserta (
  id BIGSERIAL PRIMARY KEY, batch_id BIGINT REFERENCES rekonsiliasi_batch(id) ON DELETE CASCADE,
  kontingen_id INTEGER NOT NULL, nama_file TEXT NOT NULL, nik_file TEXT, cabang_file TEXT, nomor_file TEXT,
  atlet_id INTEGER REFERENCES atlet(id),
  match_method TEXT CHECK (match_method IN ('nik','nama_exact','nama_fuzzy','manual','tidak_ketemu')),
  match_score NUMERIC(4,3),
  status_peserta TEXT DEFAULT 'peserta_resmi' CHECK (status_peserta IN ('peserta_resmi','perlu_konfirmasi','tidak_ketemu')),
  dikonfirmasi_oleh TEXT, dikonfirmasi_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (batch_id, nama_file, nik_file)
);
CREATE INDEX IF NOT EXISTS idx_rekon_peserta_atlet ON rekonsiliasi_peserta(atlet_id);
CREATE INDEX IF NOT EXISTS idx_rekon_peserta_batch ON rekonsiliasi_peserta(batch_id);
CREATE OR REPLACE VIEW v_peserta_resmi WITH (security_invoker = on) AS
SELECT DISTINCT rp.kontingen_id, rp.atlet_id FROM rekonsiliasi_peserta rp
JOIN rekonsiliasi_batch rb ON rb.id = rp.batch_id
WHERE rb.status='confirmed' AND rp.status_peserta='peserta_resmi' AND rp.atlet_id IS NOT NULL;
ALTER TABLE rekonsiliasi_batch   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rekonsiliasi_peserta ENABLE ROW LEVEL SECURITY;
