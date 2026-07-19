-- 033_cleanup_pin_function_search_path.sql
-- Cleanup (2026-07-20) — sudah diterapkan ke live. Pin search_path 26 fungsi (tutup
-- lint function_search_path_mutable). 'public, pg_temp' menjaga perilaku (semua objek
-- di public) sambil cegah search_path injection pada fungsi SECURITY DEFINER.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'approve_admin','approve_cabor','auto_sync_riwayat_kejuaraan','generate_atlet_credentials',
        'generate_invoice_number','hitung_klasemen','mark_to_seconds','match_atlet_fuzzy','posting_atlet',
        'project_athlete_performance','ps_set_updated_at','ps_status_history_block_mutation','reject_admin',
        'reject_cabor','set_updated_at','submit_ke_cabor','update_atlet_dokumen_updated_at',
        'update_baseline_updated_at','update_cabor_event_record_updated_at','update_cabor_kuota_updated_at',
        'update_ekr_updated_at','update_jarvis_updated_at','update_perlengkapan_updated_at',
        'update_riwayat_updated_at','update_updated_at','update_user_password'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
  END LOOP;
END $$;
