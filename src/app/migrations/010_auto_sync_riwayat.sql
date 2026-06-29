-- 010_auto_sync_riwayat.sql
-- KBAAS Fase 1.1 — auto-sync event_kejurnas_results (medal) → riwayat_kejuaraan.
-- ADAPTASI dari brief: kolom nomor_lomba (bukan nomor); status='Verified' (BUKAN 'APPROVED');
--   tingkat='nasional' (huruf kecil) — sesuai CHECK constraint repo.

-- 1) Kolom tambahan
ALTER TABLE riwayat_kejuaraan
  ADD COLUMN IF NOT EXISTS medali VARCHAR(20),
  ADD COLUMN IF NOT EXISTS sumber_data VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_event_kejurnas_id BIGINT REFERENCES event_kejurnas_results(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_synced BOOLEAN DEFAULT FALSE;

-- 2) Idempotency (NULL distinct → entry manual tak terganggu)
CREATE UNIQUE INDEX IF NOT EXISTS uq_rk_source_event ON riwayat_kejuaraan(source_event_kejurnas_id);

-- 3) Trigger function
CREATE OR REPLACE FUNCTION auto_sync_riwayat_kejuaraan()
RETURNS TRIGGER AS $$
BEGIN
  -- relink: atlet_id pindah → hapus entry lama
  IF TG_OP='UPDATE' AND OLD.atlet_id IS DISTINCT FROM NEW.atlet_id AND OLD.atlet_id IS NOT NULL THEN
    DELETE FROM riwayat_kejuaraan WHERE source_event_kejurnas_id=NEW.id AND atlet_id=OLD.atlet_id;
  END IF;

  IF NEW.medal IS NOT NULL AND NEW.atlet_id IS NOT NULL THEN
    INSERT INTO riwayat_kejuaraan (
      atlet_id, nama_kejuaraan, penyelenggara, tingkat, tahun, tanggal, lokasi,
      cabor, nomor_lomba, hasil, medali, deskripsi, status,
      sumber_data, source_event_kejurnas_id, auto_synced, created_at, updated_at
    ) VALUES (
      NEW.atlet_id, NEW.event_name, NEW.event_organizer, 'nasional',
      EXTRACT(YEAR FROM NEW.event_date)::int, NEW.event_date, NEW.event_venue,
      NEW.cabor_nama,
      TRIM(CONCAT(NEW.nomor_pertandingan,' ',COALESCE(NEW.kategori_umur,''),' ',COALESCE(NEW.gender,''))),
      NEW.mark, NEW.medal,
      'Auto-sync dari Kejurnas. Rank '||COALESCE(NEW.rank::text,'-')||'.',
      'Verified', 'AUTO_FROM_KEJURNAS', NEW.id, TRUE, NOW(), NOW()
    )
    ON CONFLICT (source_event_kejurnas_id) DO UPDATE SET
      atlet_id=EXCLUDED.atlet_id, hasil=EXCLUDED.hasil, medali=EXCLUDED.medali,
      nomor_lomba=EXCLUDED.nomor_lomba, updated_at=NOW();
  ELSIF TG_OP='UPDATE' THEN
    -- tak ada medal/atlet (mis. setelah unlink) → bersihkan entry auto
    DELETE FROM riwayat_kejuaraan WHERE source_event_kejurnas_id=NEW.id AND auto_synced=TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4) Trigger
DROP TRIGGER IF EXISTS trg_auto_sync_riwayat ON event_kejurnas_results;
CREATE TRIGGER trg_auto_sync_riwayat
  AFTER INSERT OR UPDATE ON event_kejurnas_results
  FOR EACH ROW EXECUTE FUNCTION auto_sync_riwayat_kejuaraan();

-- 5) Backfill (data yg sudah ter-link + medal)
INSERT INTO riwayat_kejuaraan (
  atlet_id, nama_kejuaraan, penyelenggara, tingkat, tahun, tanggal, lokasi,
  cabor, nomor_lomba, hasil, medali, deskripsi, status,
  sumber_data, source_event_kejurnas_id, auto_synced
)
SELECT atlet_id, event_name, event_organizer, 'nasional',
  EXTRACT(YEAR FROM event_date)::int, event_date, event_venue, cabor_nama,
  TRIM(CONCAT(nomor_pertandingan,' ',COALESCE(kategori_umur,''),' ',COALESCE(gender,''))),
  mark, medal, 'Auto-sync dari Kejurnas. Rank '||COALESCE(rank::text,'-')||'.',
  'Verified', 'AUTO_FROM_KEJURNAS', id, TRUE
FROM event_kejurnas_results
WHERE medal IS NOT NULL AND atlet_id IS NOT NULL
ON CONFLICT (source_event_kejurnas_id) DO NOTHING;
