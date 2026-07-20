-- 036_fix_missed_anon_write_tables.sql
-- GAP-FIX (2026-07-20) — sudah diterapkan ke live.
-- Sweep J2 awal cuma filter role '%public%' → LUPUT policy di role {anon,authenticated}.
-- 5 tabel ini masih anon-writable; ditutup di sini. BACA tetap. pentathlon_config
-- kini ditulis via /api/operator/pentathlon-config (service key).
DROP POLICY IF EXISTS "Anyone can insert biomotor" ON atlet_biomotor;
DROP POLICY IF EXISTS "Anyone can update biomotor" ON atlet_biomotor;
DROP POLICY IF EXISTS "Anyone can insert mutations" ON atlet_mutation_history;
DROP POLICY IF EXISTS auth_insert_lift_test ON atlet_lift_test;
DROP POLICY IF EXISTS auth_update_lift_test ON atlet_lift_test;
DROP POLICY IF EXISTS "authenticated write fencing_bonus" ON ps_results_fencing_bonus;
DROP POLICY IF EXISTS "Authenticated users can insert config" ON pentathlon_config;
DROP POLICY IF EXISTS "Authenticated users can update config" ON pentathlon_config;
