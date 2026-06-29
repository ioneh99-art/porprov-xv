-- 017_autosync_dual_table.sql
-- KBAAS — auto-sync prestasi kejurnas ke DUA tabel: riwayat_kejuaraan (KONIDA) + riwayat_prestasi (dossier).
-- Menyatukan fragmentasi: dossier Performance baca riwayat_prestasi, menu Kejuaraan baca riwayat_kejuaraan.

-- 1) Kolom link di riwayat_prestasi
ALTER TABLE riwayat_prestasi
  ADD COLUMN IF NOT EXISTS source_event_kejurnas_id BIGINT REFERENCES event_kejurnas_results(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_synced BOOLEAN DEFAULT FALSE;

-- 2) Link row manual Suci (yang sudah dibuat) agar backfill tidak menduplikasi
UPDATE riwayat_prestasi rp SET source_event_kejurnas_id = ekr.id, auto_synced = TRUE
FROM event_kejurnas_results ekr
WHERE rp.atlet_id = 1927 AND ekr.atlet_id = 1927 AND ekr.medal = 'EMAS'
  AND rp.event = 'Indonesia Open Athletics Championship U18 2026'
  AND rp.source_event_kejurnas_id IS NULL;

-- 3) Idempotency (NULL distinct → entry manual atlet portal aman)
CREATE UNIQUE INDEX IF NOT EXISTS uq_rp_source_event ON riwayat_prestasi(source_event_kejurnas_id);

-- 4) Trigger function — tulis ke kedua tabel
CREATE OR REPLACE FUNCTION auto_sync_riwayat_kejuaraan()
RETURNS TRIGGER AS $$
BEGIN
  -- relink: atlet_id pindah → hapus entry lama di kedua tabel
  IF TG_OP='UPDATE' AND OLD.atlet_id IS DISTINCT FROM NEW.atlet_id AND OLD.atlet_id IS NOT NULL THEN
    DELETE FROM riwayat_kejuaraan WHERE source_event_kejurnas_id=NEW.id AND atlet_id=OLD.atlet_id;
    DELETE FROM riwayat_prestasi  WHERE source_event_kejurnas_id=NEW.id AND atlet_id=OLD.atlet_id;
  END IF;

  IF NEW.medal IS NOT NULL AND NEW.atlet_id IS NOT NULL THEN
    -- a) riwayat_kejuaraan (KONIDA workflow)
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

    -- b) riwayat_prestasi (dossier Performance)
    INSERT INTO riwayat_prestasi (
      atlet_id, event, tahun, lokasi, nomor_tanding, hasil, level_event, catatan,
      is_demo, submission_status, submitted_at, verified_at, created_by,
      source_event_kejurnas_id, auto_synced
    ) VALUES (
      NEW.atlet_id, NEW.event_name, EXTRACT(YEAR FROM NEW.event_date)::int, NEW.event_venue,
      TRIM(CONCAT(NEW.nomor_pertandingan,' ',COALESCE(NEW.kategori_umur,''),' ',COALESCE(NEW.gender,''))),
      INITCAP(NEW.medal)::hasil_prestasi, 'Nasional'::level_event,
      'Catatan waktu '||NEW.mark||' — auto dari Kejurnas (KBAAS)',
      FALSE, 'verified', NOW(), NOW(), 'system-kbaas', NEW.id, TRUE
    )
    ON CONFLICT (source_event_kejurnas_id) DO UPDATE SET
      atlet_id=EXCLUDED.atlet_id, hasil=EXCLUDED.hasil, nomor_tanding=EXCLUDED.nomor_tanding,
      catatan=EXCLUDED.catatan, updated_at=NOW();

  ELSIF TG_OP='UPDATE' THEN
    -- tak ada medal/atlet (mis. unlink) → bersihkan entry auto di kedua tabel
    DELETE FROM riwayat_kejuaraan WHERE source_event_kejurnas_id=NEW.id AND auto_synced=TRUE;
    DELETE FROM riwayat_prestasi  WHERE source_event_kejurnas_id=NEW.id AND auto_synced=TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) Backfill riwayat_prestasi utk medal ter-link (Suci sudah ter-link → di-skip)
INSERT INTO riwayat_prestasi (
  atlet_id, event, tahun, lokasi, nomor_tanding, hasil, level_event, catatan,
  is_demo, submission_status, submitted_at, verified_at, created_by, source_event_kejurnas_id, auto_synced
)
SELECT atlet_id, event_name, EXTRACT(YEAR FROM event_date)::int, event_venue,
  TRIM(CONCAT(nomor_pertandingan,' ',COALESCE(kategori_umur,''),' ',COALESCE(gender,''))),
  INITCAP(medal)::hasil_prestasi, 'Nasional'::level_event,
  'Catatan waktu '||mark||' — auto dari Kejurnas (KBAAS)',
  FALSE, 'verified', NOW(), NOW(), 'system-kbaas', id, TRUE
FROM event_kejurnas_results
WHERE medal IS NOT NULL AND atlet_id IS NOT NULL
ON CONFLICT (source_event_kejurnas_id) DO NOTHING;
