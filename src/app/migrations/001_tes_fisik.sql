-- ============================================================
-- PORPROV XV — Migration: Tes Fisik (Biomotorik) Atlet
-- Source: UPI Sport Science Report 2026 (Kab. Bandung pilot)
-- Designed multi-kontingen ready (kab/kota lain bisa pakai schema sama)
-- ============================================================

-- 1. Header sesi tes — 1 atlet bisa punya banyak sesi (Tahap 1/2/3)
CREATE TABLE IF NOT EXISTS atlet_tes_fisik (
  id                  BIGSERIAL PRIMARY KEY,
  atlet_id            BIGINT REFERENCES atlet(id) ON DELETE CASCADE,
  kontingen_id        INTEGER NOT NULL REFERENCES kontingen(id),

  -- Identitas snapshot (untuk unmatched records sebelum di-link)
  nama_atlet          VARCHAR(120) NOT NULL,
  cabor_nama          VARCHAR(120),
  jenis_kelamin       CHAR(1) CHECK (jenis_kelamin IN ('L','P')),

  -- Antropometri pada saat tes
  berat_badan         NUMERIC(5,1),       -- kg
  tinggi_badan        NUMERIC(5,1),       -- cm
  bmi                 NUMERIC(5,2),

  -- Metadata sesi tes
  tanggal_tes         DATE NOT NULL,
  tahap               SMALLINT DEFAULT 3, -- 1=Okt 2024, 2=Sep 2025, 3=Apr 2026
  lokasi_tes          VARCHAR(200),
  lembaga_penguji     VARCHAR(200),       -- 'FPOK UPI'
  sumber_data         VARCHAR(200),       -- nama laporan / file
  penanggung_jawab    VARCHAR(120),

  -- Ringkasan hasil
  kesimpulan_persen   SMALLINT,           -- 0-100
  kesimpulan_kategori VARCHAR(20),        -- Kurang Sekali / Kurang / Cukup / Baik / Baik Sekali
  status_tes          VARCHAR(20) DEFAULT 'Hadir', -- Hadir / Tidak Hadir / Tidak Lengkap

  -- Audit
  matching_method     VARCHAR(30),        -- exact / fuzzy / manual / unmatched
  matching_score      NUMERIC(4,3),       -- 0.000 - 1.000
  reviewed_by         BIGINT REFERENCES users(id),
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (atlet_id, tahap, tanggal_tes)
);

CREATE INDEX idx_tes_fisik_atlet     ON atlet_tes_fisik(atlet_id);
CREATE INDEX idx_tes_fisik_kontingen ON atlet_tes_fisik(kontingen_id);
CREATE INDEX idx_tes_fisik_cabor     ON atlet_tes_fisik(cabor_nama);
CREATE INDEX idx_tes_fisik_tanggal   ON atlet_tes_fisik(tanggal_tes);
CREATE INDEX idx_tes_fisik_status    ON atlet_tes_fisik(status_tes);

-- 2. Detail item per sesi
CREATE TABLE IF NOT EXISTS atlet_tes_fisik_item (
  id                  BIGSERIAL PRIMARY KEY,
  tes_fisik_id        BIGINT NOT NULL REFERENCES atlet_tes_fisik(id) ON DELETE CASCADE,
  no_urut             SMALLINT,
  komponen            VARCHAR(60),        -- Flexibility / Balance / Power / dst
  item_tes            VARCHAR(200),       -- "Lower Back and Hamstring Flexibility (Sit and Reach)"
  hasil_nilai         NUMERIC(10,4),
  hasil_satuan        VARCHAR(20),        -- cm / sec / level / rep / m / w/kg / ml/kg/mnt
  norma_nilai         NUMERIC(10,4),
  norma_satuan        VARCHAR(20),
  capaian_persen      SMALLINT,
  kategori            VARCHAR(20)
);

CREATE INDEX idx_tes_item_session   ON atlet_tes_fisik_item(tes_fisik_id);
CREATE INDEX idx_tes_item_komponen  ON atlet_tes_fisik_item(komponen);
CREATE INDEX idx_tes_item_kategori  ON atlet_tes_fisik_item(kategori);

-- 3. Staging table untuk unmatched records (review manual KONIDA)
CREATE TABLE IF NOT EXISTS atlet_tes_fisik_unmatched (
  id                  BIGSERIAL PRIMARY KEY,
  kontingen_id        INTEGER NOT NULL REFERENCES kontingen(id),
  nama_atlet          VARCHAR(120) NOT NULL,
  cabor_nama          VARCHAR(120),
  jenis_kelamin       CHAR(1),
  raw_data            JSONB NOT NULL,     -- full record dari PDF
  candidate_atlet_ids BIGINT[],           -- array of possible matches dengan skor
  candidate_scores    JSONB,              -- {atlet_id: score}
  resolved            BOOLEAN DEFAULT FALSE,
  resolved_atlet_id   BIGINT REFERENCES atlet(id),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 4. View: Profil tes fisik terbaru per atlet (untuk dashboard)
CREATE OR REPLACE VIEW v_atlet_tes_fisik_latest AS
SELECT DISTINCT ON (atlet_id)
  tf.atlet_id,
  tf.id              AS tes_fisik_id,
  tf.kontingen_id,
  tf.tanggal_tes,
  tf.tahap,
  tf.berat_badan,
  tf.tinggi_badan,
  tf.bmi,
  tf.kesimpulan_persen,
  tf.kesimpulan_kategori,
  tf.status_tes,
  tf.cabor_nama
FROM atlet_tes_fisik tf
WHERE tf.atlet_id IS NOT NULL
ORDER BY atlet_id, tanggal_tes DESC;

-- 5. View: Agregat per cabor (untuk dashboard KONIDA)
CREATE OR REPLACE VIEW v_tes_fisik_per_cabor AS
SELECT
  kontingen_id,
  cabor_nama,
  COUNT(*) FILTER (WHERE status_tes = 'Hadir')         AS jumlah_atlet_tes,
  COUNT(*) FILTER (WHERE status_tes = 'Tidak Hadir')   AS jumlah_atlet_dns,
  ROUND(AVG(kesimpulan_persen) FILTER (WHERE status_tes='Hadir'), 1) AS rata_kesimpulan,
  ROUND(AVG(bmi) FILTER (WHERE bmi > 0), 2)                          AS rata_bmi,
  COUNT(*) FILTER (WHERE kesimpulan_kategori = 'Baik Sekali')        AS n_baik_sekali,
  COUNT(*) FILTER (WHERE kesimpulan_kategori = 'Baik')               AS n_baik,
  COUNT(*) FILTER (WHERE kesimpulan_kategori = 'Cukup')              AS n_cukup,
  COUNT(*) FILTER (WHERE kesimpulan_kategori = 'Kurang')             AS n_kurang,
  COUNT(*) FILTER (WHERE kesimpulan_kategori = 'Kurang Sekali')      AS n_kurang_sekali
FROM atlet_tes_fisik
WHERE tahap = 3
GROUP BY kontingen_id, cabor_nama;

-- 6. View: Komponen terlemah per cabor (insight bagi pelatih)
CREATE OR REPLACE VIEW v_tes_fisik_komponen_lemah AS
SELECT
  tf.kontingen_id,
  tf.cabor_nama,
  item.komponen,
  ROUND(AVG(item.capaian_persen), 1) AS rata_capaian,
  COUNT(*)                            AS jumlah_data
FROM atlet_tes_fisik tf
JOIN atlet_tes_fisik_item item ON item.tes_fisik_id = tf.id
WHERE tf.tahap = 3 AND tf.status_tes = 'Hadir'
GROUP BY tf.kontingen_id, tf.cabor_nama, item.komponen
ORDER BY tf.kontingen_id, tf.cabor_nama, rata_capaian ASC;

-- 7. RLS policies
ALTER TABLE atlet_tes_fisik           ENABLE ROW LEVEL SECURITY;
ALTER TABLE atlet_tes_fisik_item      ENABLE ROW LEVEL SECURITY;
ALTER TABLE atlet_tes_fisik_unmatched ENABLE ROW LEVEL SECURITY;

-- Atlet hanya bisa lihat data tes-nya sendiri
CREATE POLICY atlet_view_own_tes ON atlet_tes_fisik FOR SELECT
  USING (atlet_id = (SELECT id FROM atlet WHERE nik = current_setting('request.jwt.claims', true)::json->>'nik'));

CREATE POLICY atlet_view_own_tes_item ON atlet_tes_fisik_item FOR SELECT
  USING (tes_fisik_id IN (SELECT id FROM atlet_tes_fisik WHERE atlet_id = (SELECT id FROM atlet WHERE nik = current_setting('request.jwt.claims', true)::json->>'nik')));

-- Service role (KONIDA admin) bisa full access — handled via service key di API routes

COMMENT ON TABLE atlet_tes_fisik IS 'Header sesi tes fisik/biomotorik atlet — multi-tahap, multi-kontingen';
COMMENT ON TABLE atlet_tes_fisik_item IS 'Detail item tes per sesi (1-to-many ke header)';
COMMENT ON TABLE atlet_tes_fisik_unmatched IS 'Staging untuk record yang gagal auto-match ke atlet — perlu review manual';
