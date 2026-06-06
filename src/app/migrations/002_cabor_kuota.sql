-- ============================================================
-- Migration 002: Cabor Master + Kuota + View Summary
-- Diperlukan oleh: /konida/kualifikasi/*
-- Jalankan di: Supabase SQL Editor
-- ============================================================

-- ─── CABOR MASTER ────────────────────────────────────────────
-- Daftar resmi cabang olahraga PORPROV XV
CREATE TABLE IF NOT EXISTS cabor_master (
  id              SERIAL PRIMARY KEY,
  kode            TEXT NOT NULL UNIQUE,
  nama            TEXT NOT NULL,
  kategori        TEXT,               -- 'Beregu' | 'Perorangan' | 'Ganda'
  klaster_venue   TEXT,               -- 'Bogor' | 'Bekasi' | 'Depok'
  is_aktif        BOOLEAN NOT NULL DEFAULT true,
  catatan         TEXT,
  urutan          INTEGER NOT NULL DEFAULT 0,
  legacy_cabor_id INTEGER REFERENCES cabang_olahraga(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cabor_master_urutan_idx ON cabor_master(urutan);
CREATE INDEX IF NOT EXISTS cabor_master_is_aktif_idx ON cabor_master(is_aktif);

-- ─── CABOR KUOTA (per kontingen) ─────────────────────────────
-- Kuota yang ditetapkan per cabor per kontingen
CREATE TABLE IF NOT EXISTS cabor_kuota (
  id            SERIAL PRIMARY KEY,
  cabor_id      INTEGER NOT NULL REFERENCES cabor_master(id) ON DELETE CASCADE,
  kontingen_id  INTEGER NOT NULL REFERENCES kontingen(id) ON DELETE CASCADE,
  kuota_total   INTEGER NOT NULL DEFAULT 0,
  kuota_putra   INTEGER NOT NULL DEFAULT 0,
  kuota_putri   INTEGER NOT NULL DEFAULT 0,
  kuota_ofisial INTEGER NOT NULL DEFAULT 0,
  catatan       TEXT,
  updated_by    TEXT,
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cabor_id, kontingen_id)
);

CREATE INDEX IF NOT EXISTS cabor_kuota_kontingen_idx ON cabor_kuota(kontingen_id);
CREATE INDEX IF NOT EXISTS cabor_kuota_cabor_idx ON cabor_kuota(cabor_id);

-- ─── VIEW v_cabor_kuota_summary ───────────────────────────────
-- Join cabor_master + cabor_kuota + atlet counts per status & gender
-- Digunakan oleh halaman Kontrol Kuota & Kualifikasi
CREATE OR REPLACE VIEW v_cabor_kuota_summary AS
SELECT
  ck.id                                                                       AS kuota_id,
  ck.kontingen_id,
  cm.id                                                                       AS cabor_id,
  cm.kode                                                                     AS cabor_kode,
  cm.nama                                                                     AS cabor_nama,
  cm.kategori,
  cm.klaster_venue,
  cm.urutan,
  ck.kuota_total,
  ck.kuota_putra,
  ck.kuota_putri,
  ck.kuota_ofisial,

  -- Aktif = Verified + Posted
  COUNT(a.id) FILTER (WHERE a.status_registrasi IN ('Verified','Posted'))    AS aktif,
  COUNT(a.id) FILTER (WHERE a.status_registrasi = 'Verified')                AS verified,
  COUNT(a.id) FILTER (WHERE a.status_registrasi = 'Posted')                  AS posted,
  COUNT(a.id) FILTER (WHERE a.status_registrasi = 'Menunggu Admin')          AS pending,
  COUNT(a.id) FILTER (WHERE a.status_registrasi IN ('Ditolak Admin','Ditolak Cabor')) AS ditolak,

  -- Gender breakdown (aktif only)
  COUNT(a.id) FILTER (WHERE a.status_registrasi IN ('Verified','Posted') AND a.gender = 'L') AS aktif_putra,
  COUNT(a.id) FILTER (WHERE a.status_registrasi IN ('Verified','Posted') AND a.gender = 'P') AS aktif_putri,

  -- Total semua status
  COUNT(a.id)                                                                 AS total_terdaftar,

  -- Persentase kuota terpakai
  CASE
    WHEN ck.kuota_total > 0 THEN
      LEAST(
        ROUND(
          COUNT(a.id) FILTER (WHERE a.status_registrasi IN ('Verified','Posted'))::numeric
          / ck.kuota_total * 100
        )::integer,
        100
      )
    ELSE 0
  END                                                                         AS pct,

  -- Status kuota
  CASE
    WHEN COUNT(a.id) FILTER (WHERE a.status_registrasi IN ('Verified','Posted')) > ck.kuota_total
      THEN 'OVER'
    WHEN COUNT(a.id) FILTER (WHERE a.status_registrasi IN ('Verified','Posted')) >= ck.kuota_total
      THEN 'PENUH'
    WHEN ck.kuota_total > 0 AND
         COUNT(a.id) FILTER (WHERE a.status_registrasi IN ('Verified','Posted')) >= ck.kuota_total * 0.9
      THEN 'KRITIS'
    ELSE 'OPEN'
  END                                                                         AS status_kuota

FROM cabor_kuota ck
JOIN cabor_master cm ON cm.id = ck.cabor_id
LEFT JOIN atlet a
  ON  a.kontingen_id = ck.kontingen_id
  AND (
    a.cabor_nama_raw = cm.nama
    OR a.cabor_id = cm.legacy_cabor_id
  )
WHERE cm.is_aktif = true
GROUP BY
  ck.id, ck.kontingen_id,
  ck.kuota_total, ck.kuota_putra, ck.kuota_putri, ck.kuota_ofisial,
  cm.id, cm.kode, cm.nama, cm.kategori, cm.klaster_venue, cm.urutan
ORDER BY cm.urutan;

-- ─── SEED: Cabor PORPROV XV (sesuaikan nama dengan data di tabel atlet) ───────
-- PENTING: kolom 'nama' harus SAMA PERSIS dengan cabor_nama_raw di tabel atlet
-- Isi klaster_venue: 'Bogor' | 'Bekasi' | 'Depok' (sesuai panduan PORPROV XV)
-- Hapus/edit baris yang tidak dipakai Kab. Bogor

INSERT INTO cabor_master (kode, nama, kategori, klaster_venue, urutan) VALUES
  ('AQ',  'Akuatik',               'Perorangan', 'Bekasi', 10),
  ('AT',  'Atletik',               'Perorangan', 'Bogor',  20),
  ('BK',  'Basket',                'Beregu',     'Bekasi', 30),
  ('BD',  'Bulutangkis',           'Perorangan', 'Bogor',  40),
  ('BX',  'Tinju',                 'Perorangan', 'Bogor',  50),
  ('CK',  'Catur',                 'Perorangan', 'Bogor',  60),
  ('CW',  'Cricket',               'Beregu',     'Bekasi', 70),
  ('DG',  'Dayung',                'Beregu',     'Bogor',  80),
  ('EQ',  'Equestrian',            'Perorangan', 'Bogor',  90),
  ('FK',  'Futsal',                'Beregu',     'Bekasi', 100),
  ('GB',  'Gulat',                 'Perorangan', 'Bogor',  110),
  ('GF',  'Golf',                  'Perorangan', 'Bekasi', 120),
  ('GN',  'Gimnastik',             'Perorangan', 'Depok',  130),
  ('HK',  'Hoki',                  'Beregu',     'Bekasi', 140),
  ('JD',  'Judo',                  'Perorangan', 'Bogor',  150),
  ('KB',  'Kabaddi',               'Beregu',     'Depok',  160),
  ('KR',  'Karate',                'Perorangan', 'Bogor',  170),
  ('KN',  'Kano Slalom',           'Perorangan', 'Bogor',  180),
  ('LT',  'Layar',                 'Perorangan', 'Bekasi', 190),
  ('MN',  'Menembak',              'Perorangan', 'Bekasi', 200),
  ('MX',  'Muaythai',              'Perorangan', 'Bogor',  210),
  ('PP',  'Panjat Tebing',         'Perorangan', 'Bogor',  220),
  ('PB',  'Panahan',               'Perorangan', 'Bekasi', 230),
  ('PC',  'Pencak Silat',          'Perorangan', 'Bogor',  240),
  ('PR',  'Petanque',              'Perorangan', 'Bekasi', 250),
  ('PL',  'Polo Air',              'Beregu',     'Bekasi', 260),
  ('RG',  'Rugby',                 'Beregu',     'Bekasi', 270),
  ('SB',  'Softball',              'Beregu',     'Bekasi', 280),
  ('SK',  'Sepak Takraw',          'Beregu',     'Bogor',  290),
  ('SL',  'Selam',                 'Perorangan', 'Bekasi', 300),
  ('SN',  'Senam',                 'Perorangan', 'Depok',  310),
  ('SP',  'Sepak Bola',            'Beregu',     'Bekasi', 320),
  ('SQ',  'Squash',                'Perorangan', 'Bekasi', 330),
  ('TK',  'Taekwondo',             'Perorangan', 'Bogor',  340),
  ('TN',  'Tenis',                 'Perorangan', 'Bekasi', 350),
  ('TM',  'Tenis Meja',            'Perorangan', 'Depok',  360),
  ('TT',  'Tarung Derajat',        'Perorangan', 'Bogor',  370),
  ('VL',  'Voli',                  'Beregu',     'Bekasi', 380),
  ('WG',  'Wushu',                 'Perorangan', 'Depok',  390),
  ('WT',  'Angkat Besi',           'Perorangan', 'Bogor',  400)
ON CONFLICT (kode) DO NOTHING;

-- ─── SEED: Kuota Kab. Bogor (kontingen_id = 1) ───────────────────────────────
-- Sesuaikan angka kuota dengan SK/penetapan PORPROV XV
-- Jalankan SETELAH INSERT cabor_master di atas

INSERT INTO cabor_kuota (cabor_id, kontingen_id, kuota_total, kuota_putra, kuota_putri, kuota_ofisial)
SELECT cm.id, 1,
  CASE cm.kode
    WHEN 'AT'  THEN 30  WHEN 'BD'  THEN 20  WHEN 'BX'  THEN 15
    WHEN 'KR'  THEN 20  WHEN 'TK'  THEN 20  WHEN 'PC'  THEN 20
    WHEN 'JD'  THEN 15  WHEN 'GB'  THEN 15  WHEN 'MX'  THEN 10
    WHEN 'TT'  THEN 15  WHEN 'WG'  THEN 15  WHEN 'PP'  THEN 10
    WHEN 'AQ'  THEN 20  WHEN 'DG'  THEN 20  WHEN 'SL'  THEN 15
    WHEN 'PB'  THEN 15  WHEN 'MN'  THEN 10  WHEN 'GN'  THEN 10
    WHEN 'SN'  THEN 10  WHEN 'CK'  THEN 10  WHEN 'TN'  THEN 10
    WHEN 'TM'  THEN 10  WHEN 'SQ'  THEN 10  WHEN 'PR'  THEN 10
    WHEN 'SK'  THEN 16  WHEN 'BK'  THEN 24  WHEN 'VL'  THEN 24
    WHEN 'FK'  THEN 20  WHEN 'SP'  THEN 25  WHEN 'HK'  THEN 22
    WHEN 'RG'  THEN 20  WHEN 'SB'  THEN 20  WHEN 'PL'  THEN 20
    WHEN 'LT'  THEN 10  WHEN 'EQ'  THEN  8  WHEN 'GF'  THEN  8
    WHEN 'KN'  THEN 10  WHEN 'KB'  THEN 18  WHEN 'CW'  THEN 15
    WHEN 'WT'  THEN 15
    ELSE 10
  END AS kuota_total,
  CASE cm.kode
    WHEN 'BK'  THEN 12  WHEN 'VL'  THEN 12  WHEN 'FK'  THEN 10
    WHEN 'SP'  THEN 25  WHEN 'AT'  THEN 15  WHEN 'AQ'  THEN 10
    WHEN 'SK'  THEN  8
    ELSE ROUND(
      CASE cm.kode
        WHEN 'AT'  THEN 30  WHEN 'BD'  THEN 20  WHEN 'BX'  THEN 15
        WHEN 'KR'  THEN 20  WHEN 'TK'  THEN 20  WHEN 'PC'  THEN 20
        WHEN 'JD'  THEN 15  WHEN 'GB'  THEN 15  WHEN 'MX'  THEN 10
        ELSE 10
      END * 0.5
    )
  END AS kuota_putra,
  CASE cm.kode
    WHEN 'BK'  THEN 12  WHEN 'VL'  THEN 12  WHEN 'SP'  THEN 0
    WHEN 'FK'  THEN 10  WHEN 'AT'  THEN 15  WHEN 'AQ'  THEN 10
    WHEN 'SK'  THEN  8
    ELSE ROUND(
      CASE cm.kode
        WHEN 'AT'  THEN 30  WHEN 'BD'  THEN 20  WHEN 'BX'  THEN 15
        WHEN 'KR'  THEN 20  WHEN 'TK'  THEN 20  WHEN 'PC'  THEN 20
        WHEN 'JD'  THEN 15  WHEN 'GB'  THEN 15  WHEN 'MX'  THEN 10
        ELSE 10
      END * 0.5
    )
  END AS kuota_putri,
  2 AS kuota_ofisial
FROM cabor_master cm
WHERE cm.is_aktif = true
ON CONFLICT (cabor_id, kontingen_id) DO NOTHING;

-- ─── VERIFIKASI ───────────────────────────────────────────────
-- Jalankan ini untuk cek hasilnya:
-- SELECT * FROM v_cabor_kuota_summary WHERE kontingen_id = 1 ORDER BY urutan;
