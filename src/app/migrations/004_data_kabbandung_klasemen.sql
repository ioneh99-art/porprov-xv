-- ============================================================
-- PORPROV XV — Migration 004: Data fixes
--   A. Reassign data demo kontingen_id 1 (Kab. Bogor) -> 4 (Kab. Bandung)
--   B. Klasemen medali top-3 = data real Porprov XIV Jabar 2022
-- Dijalankan: 2026-06 (didokumentasikan dari perubahan via service API)
-- Catatan: idempotent-ish — aman dijalankan ulang (WHERE sudah tak match).
-- ============================================================

-- ── A. PEMINDAHAN KEPEMILIKAN DATA DEMO ─────────────────────
-- Data di bawah kontingen_id=1 ("KAB. BOGOR") sebenarnya milik Kab. Bandung,
-- dulu dipakai sebagai demo Kab. Bogor. Dikembalikan ke id=4 (KAB. BANDUNG).
-- atlet_tes_fisik_item ikut otomatis via FK tes_fisik_id (tak punya kontingen_id).

UPDATE atlet                     SET kontingen_id = 4 WHERE kontingen_id = 1;
UPDATE atlet_tes_fisik           SET kontingen_id = 4 WHERE kontingen_id = 1;
UPDATE atlet_tes_fisik_unmatched SET kontingen_id = 4 WHERE kontingen_id = 1;
UPDATE cabor_kuota               SET kontingen_id = 4 WHERE kontingen_id = 1;

-- Klasemen Kab. Bogor dikosongkan (data demo sudah pindah).
-- (Catatan: di Bagian B, baris ini ditimpa lagi dengan data real 2022.)
UPDATE klasemen_medali
   SET emas = 0, perak = 0, perunggu = 0, total = 0
 WHERE kontingen_id = 1;

-- TIDAK dipindah (sengaja): users, tenants, subscriptions, invoices
-- (akun login & billing tetap milik tenant masing-masing).


-- ── B. KLASEMEN REAL PORPROV XIV JABAR 2022 (top-3) ─────────
-- Sumber: hasil akhir Porprov XIV Jawa Barat 2022 (KONI Jabar).
-- Kab. Bekasi = Juara Umum. 24 kontingen lain dibiarkan (angka demo).

-- 1. Kab. Bekasi  (id=16) — Juara Umum
UPDATE klasemen_medali
   SET emas = 189, perak = 139, perunggu = 123, total = 451
 WHERE kontingen_id = 16;

-- 2. Kab. Bogor   (id=1)
UPDATE klasemen_medali
   SET emas = 139, perak = 130, perunggu = 123, total = 392
 WHERE kontingen_id = 1;

-- 3. Kota Bandung (id=21)
UPDATE klasemen_medali
   SET emas = 121, perak = 116, perunggu = 158, total = 395
 WHERE kontingen_id = 21;
