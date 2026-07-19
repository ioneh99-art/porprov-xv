-- 031_j2_5_venue.sql
-- Jenis 2 / J2-5 (2026-07-19) — sudah diterapkan ke live.
-- Tulis venue -> /api/operator/venue (service key, guard sesi, whitelist, audit).
-- Drop policy ALL; public_read_venue (SELECT) tetap.
-- Setelah ini: NOL policy tulis broad public tersisa di seluruh DB.
DROP POLICY IF EXISTS admin_all_venue ON venue;
