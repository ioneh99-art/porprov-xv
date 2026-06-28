-- ============================================================
-- PORPROV XV — Migration 006: Konsolidasi Cabor Dayung (Kab. Bandung)
--   Operator Dayung plugin foundation (Phase 1).
--   Dijalankan 2026-06 via service API (didokumentasikan di sini).
-- ============================================================
--
-- KONTEKS: data Dayung terpecah —
--   atlet (67)  -> cabang_olahraga id 147 ('Dayung')
--   nomor (54)  -> id 34 (Canoe+Kayak), 35 (Rowing), 36 (TBR)
--   (id 2 = 'Aerosport - Paramotor', BUKAN Dayung — JANGAN disentuh)
-- Solusi: konsolidasi semua Dayung ke id 147 + disiplin_id penanda sub-cabor.

-- 1. Seed disiplin Dayung di cabor 147 (per disiplin × gender; constraint gender: L/P/MIXED)
--    Disiplin: Canoe, Kayak, Rowing, TBR.
INSERT INTO disiplin (cabor_id, nama, gender, kategori)
SELECT 147, d.nama, g.gender, 'Senior'
FROM (VALUES ('Canoe'),('Kayak'),('Rowing'),('TBR')) AS d(nama)
CROSS JOIN (VALUES ('L'),('P'),('MIXED')) AS g(gender)
WHERE NOT EXISTS (
  SELECT 1 FROM disiplin x WHERE x.cabor_id=147 AND x.nama=d.nama AND x.gender=g.gender
);

-- 2. Re-tag 54 nomor Dayung (34/35/36 -> 147) + set disiplin_id by nama + gender.
--    (peserta_nomor = 0 untuk nomor ini, jadi aman.)
UPDATE nomor_pertandingan np SET
  cabor_id = 147,
  disiplin_id = (
    SELECT d.id FROM disiplin d
    WHERE d.cabor_id = 147
      AND d.nama = CASE
        WHEN np.nama ILIKE '%Canoe%'  THEN 'Canoe'
        WHEN np.nama ILIKE '%Kayak%'  THEN 'Kayak'
        WHEN np.nama ILIKE '%Rowing%' THEN 'Rowing'
        WHEN np.nama ILIKE '%TBR%'    THEN 'TBR'
      END
      AND d.gender = CASE WHEN np.gender='MIX' THEN 'MIXED' ELSE np.gender END
    LIMIT 1
  )
WHERE np.cabor_id IN (34,35,36);

-- 3. Arahkan operator Dayung ke cabor kanonik + kontingen Kab. Bandung.
UPDATE users SET cabor_id = 147, kontingen_id = 4 WHERE username = 'op.dayung';

-- ROLLBACK (darurat): restore dari _backup_dayung_nomor.json (cabor_id & disiplin_id asli),
--   hapus disiplin cabor_id=147, kembalikan users.cabor_id op.dayung ke 34.
