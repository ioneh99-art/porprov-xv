-- 018_attach_autosync_trigger.sql
-- Fix 017: function auto_sync_riwayat_kejuaraan() sudah dibuat tapi trigger-nya tidak di-attach.
-- Migration ini hanya menambahkan DROP + CREATE TRIGGER pada tabel event_kejurnas_results.

DROP TRIGGER IF EXISTS trg_autosync_kejurnas ON event_kejurnas_results;

CREATE TRIGGER trg_autosync_kejurnas
AFTER INSERT OR UPDATE ON event_kejurnas_results
FOR EACH ROW EXECUTE FUNCTION auto_sync_riwayat_kejuaraan();
