-- ============================================================
-- PORPROV XV — Core Schema (inferred from application code)
-- Dibuat: 2026-06-06
-- Tujuan: dokumentasi schema & disaster recovery baseline
-- ============================================================
-- CATATAN: File ini adalah representasi schema berdasarkan kode aplikasi.
-- Untuk schema aktual yang telah berjalan, jalankan:
--   pg_dump --schema-only <connection-string> > schema_actual.sql
-- ============================================================

-- ─── EXTENSIONS ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- untuk fuzzy search nama atlet

-- ─── ENUM TYPES ──────────────────────────────────────────────────────────────
CREATE TYPE status_registrasi_enum AS ENUM (
  'Draft',
  'Menunggu Cabor',
  'Menunggu Admin',
  'Ditolak Cabor',
  'Ditolak Admin',
  'Verified',
  'Posted'
);

-- ─── KONTINGEN ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kontingen (
  id         SERIAL PRIMARY KEY,
  nama       TEXT NOT NULL,
  kode       TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE kontingen IS '27 kabupaten/kota di Jawa Barat peserta PORPROV XV';

-- ─── CABANG OLAHRAGA ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cabang_olahraga (
  id         SERIAL PRIMARY KEY,
  nama       TEXT NOT NULL,
  kode       TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      TEXT NOT NULL UNIQUE,
  nama          TEXT NOT NULL,
  email         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN (
                  'superadmin','koni_jabar','konida','penyelenggara',
                  'operator_cabor','atlet','admin')),
  level         TEXT CHECK (level IN ('superadmin','koni_jabar','level1','level2','level3')),
  kontingen_id  INTEGER REFERENCES kontingen(id),
  cabor_id      INTEGER REFERENCES cabang_olahraga(id),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_username_idx     ON users(username);
CREATE INDEX IF NOT EXISTS users_kontingen_id_idx ON users(kontingen_id);
CREATE INDEX IF NOT EXISTS users_role_idx         ON users(role);

-- ─── PLANS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id          TEXT PRIMARY KEY, -- 'basic' | 'standard' | 'premium' | 'enterprise'
  nama        TEXT NOT NULL,
  deskripsi   TEXT,
  harga_bulan NUMERIC(12,2) DEFAULT 0,
  features    TEXT[] NOT NULL DEFAULT '{}',
  max_users   INTEGER NOT NULL DEFAULT 5,
  max_atlet   INTEGER NOT NULL DEFAULT 50,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  urutan      INTEGER,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── SUBSCRIPTIONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kontingen_id     INTEGER NOT NULL REFERENCES kontingen(id),
  plan_id          TEXT NOT NULL REFERENCES plans(id),
  features         TEXT[] DEFAULT '{}',
  features_add     TEXT[] DEFAULT '{}',
  features_remove  TEXT[] DEFAULT '{}',
  max_users        INTEGER,
  max_atlet        INTEGER,
  valid_until      DATE,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  is_trial         BOOLEAN NOT NULL DEFAULT false,
  catatan          TEXT,
  created_by       TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subs_kontingen_active_idx ON subscriptions(kontingen_id, is_active);

-- ─── TENANTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug         TEXT NOT NULL UNIQUE, -- 'kabbogor', 'kotabekasi', dll
  nama         TEXT NOT NULL,
  logo_url     TEXT,
  warna_primer TEXT,
  is_enterprise BOOLEAN NOT NULL DEFAULT false,
  config       JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tenants_slug_idx ON tenants(slug);
COMMENT ON COLUMN tenants.is_enterprise IS 'Jika true, plan otomatis premium tanpa cek subscriptions';

-- ─── ATLET ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS atlet (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  no_ktp              TEXT,                  -- NIK (16 digit)
  nama_lengkap        TEXT NOT NULL,
  gender              TEXT CHECK (gender IN ('L','P')),
  tgl_lahir           DATE,
  tempat_lahir        TEXT,
  telepon             TEXT,
  email               TEXT,
  alamat              TEXT,
  kota_kab            TEXT,
  kontingen_id        INTEGER REFERENCES kontingen(id),
  cabor_id            INTEGER REFERENCES cabang_olahraga(id),
  cabor_nama_raw      TEXT,
  status_registrasi   TEXT NOT NULL DEFAULT 'Draft',
  status_kontingen    TEXT,
  status_atlet        TEXT,
  is_posted           BOOLEAN DEFAULT false,
  -- Data finansial
  nama_bank           TEXT,
  no_rekening         TEXT,
  npwp                TEXT,
  no_bpjs_kesehatan   TEXT,
  -- Data perlengkapan
  ukuran_kemeja       TEXT,
  ukuran_celana       TEXT,
  ukuran_sepatu       TEXT,
  -- Portal atlet
  portal_username     TEXT UNIQUE,
  portal_password     TEXT,
  -- Dokumen
  foto_url            TEXT,
  ktp_url             TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS atlet_kontingen_id_idx       ON atlet(kontingen_id);
CREATE INDEX IF NOT EXISTS atlet_cabor_id_idx           ON atlet(cabor_id);
CREATE INDEX IF NOT EXISTS atlet_status_registrasi_idx  ON atlet(status_registrasi);
CREATE INDEX IF NOT EXISTS atlet_no_ktp_idx             ON atlet(no_ktp);
CREATE INDEX IF NOT EXISTS atlet_nama_trgm_idx          ON atlet USING gin(nama_lengkap gin_trgm_ops);
COMMENT ON COLUMN atlet.status_registrasi IS 'State machine: Draft→Menunggu Cabor→Menunggu Admin→Verified→Posted (atau Ditolak)';

-- ─── LOG VERIFIKASI ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS log_verifikasi (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  atlet_id    UUID NOT NULL REFERENCES atlet(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  status_baru TEXT NOT NULL,
  keterangan  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS log_verif_atlet_idx ON log_verifikasi(atlet_id);

-- ─── KEJUARAAN ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kejuaraan (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cabor_id     INTEGER REFERENCES cabang_olahraga(id),
  nama         TEXT NOT NULL,
  tgl_mulai    DATE,
  tgl_selesai  DATE,
  venue_id     UUID,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── VENUE ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venue (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama        TEXT NOT NULL,
  alamat      TEXT,
  lat         NUMERIC(10,7),
  lng         NUMERIC(10,7),
  kapasitas   INTEGER,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── JADWAL ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jadwal (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cabor_id     INTEGER REFERENCES cabang_olahraga(id),
  venue_id     UUID REFERENCES venue(id),
  tanggal      DATE,
  jam_mulai    TIME,
  jam_selesai  TIME,
  keterangan   TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── KLASEMEN MEDALI ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS klasemen_medali (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kontingen_id INTEGER NOT NULL REFERENCES kontingen(id),
  cabor_id     INTEGER REFERENCES cabang_olahraga(id),
  emas         INTEGER NOT NULL DEFAULT 0,
  perak        INTEGER NOT NULL DEFAULT 0,
  perunggu     INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(kontingen_id, cabor_id)
);

-- ─── TES FISIK ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS atlet_tes_fisik (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  atlet_id            UUID REFERENCES atlet(id),
  kontingen_id        INTEGER REFERENCES kontingen(id),
  nama_atlet          TEXT NOT NULL,
  cabor_nama          TEXT,
  jenis_kelamin       TEXT CHECK (jenis_kelamin IN ('L','P')),
  -- Antropometri
  tinggi_badan        NUMERIC(5,1),
  berat_badan         NUMERIC(5,1),
  bmi                 NUMERIC(4,1),
  -- Hasil biomotorik
  kesimpulan_persen   NUMERIC(5,1),
  kesimpulan_kategori TEXT,
  status_tes          TEXT CHECK (status_tes IN ('Hadir','DNS')),
  -- Metadata
  tahap               INTEGER CHECK (tahap IN (1,2,3)),
  matching_method     TEXT CHECK (matching_method IN ('exact','fuzzy','manual','none')),
  matching_score      NUMERIC(4,1),
  tgl_tes             DATE,
  created_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tes_fisik_atlet_idx      ON atlet_tes_fisik(atlet_id);
CREATE INDEX IF NOT EXISTS tes_fisik_kontingen_idx  ON atlet_tes_fisik(kontingen_id);
CREATE INDEX IF NOT EXISTS tes_fisik_tahap_idx      ON atlet_tes_fisik(tahap);

CREATE TABLE IF NOT EXISTS atlet_tes_fisik_item (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tes_id      UUID NOT NULL REFERENCES atlet_tes_fisik(id) ON DELETE CASCADE,
  komponen    TEXT NOT NULL,
  nilai_raw   NUMERIC,
  nilai_persen NUMERIC(5,1),
  satuan      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tes_fisik_item_tes_idx ON atlet_tes_fisik_item(tes_id);

CREATE TABLE IF NOT EXISTS atlet_tes_fisik_unmatched (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_raw      TEXT NOT NULL,
  cabor_raw     TEXT,
  kontingen_id  INTEGER REFERENCES kontingen(id),
  data_raw      JSONB,
  tahap         INTEGER,
  status_review TEXT NOT NULL DEFAULT 'pending' CHECK (status_review IN ('pending','matched','ignored')),
  matched_atlet_id UUID REFERENCES atlet(id),
  catatan       TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  reviewed_at   TIMESTAMPTZ,
  reviewed_by   UUID REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS tes_unmatched_kontingen_idx ON atlet_tes_fisik_unmatched(kontingen_id, status_review);

-- ─── INVOICES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kontingen_id  INTEGER REFERENCES kontingen(id),
  nomor         TEXT NOT NULL UNIQUE,
  jumlah        NUMERIC(14,2) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid','cancelled')),
  keterangan    TEXT,
  tgl_invoice   DATE NOT NULL DEFAULT CURRENT_DATE,
  tgl_jatuh_tempo DATE,
  tgl_bayar     DATE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── VIEWS ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_tes_fisik_per_cabor AS
SELECT
  tf.kontingen_id,
  tf.cabor_nama,
  COUNT(*) FILTER (WHERE tf.status_tes = 'Hadir') AS jumlah_atlet_tes,
  ROUND(AVG(tf.kesimpulan_persen) FILTER (WHERE tf.status_tes = 'Hadir'), 1) AS rata_kesimpulan,
  tf.jenis_kelamin
FROM atlet_tes_fisik tf
WHERE tf.tahap = 3
GROUP BY tf.kontingen_id, tf.cabor_nama, tf.jenis_kelamin;

CREATE OR REPLACE VIEW v_tes_fisik_komponen_lemah AS
SELECT
  tf.kontingen_id,
  tf.cabor_nama,
  ti.komponen,
  ROUND(AVG(ti.nilai_persen), 1) AS rata_capaian,
  COUNT(*) AS jumlah_data
FROM atlet_tes_fisik tf
JOIN atlet_tes_fisik_item ti ON ti.tes_id = tf.id
WHERE tf.tahap = 3 AND tf.status_tes = 'Hadir'
GROUP BY tf.kontingen_id, tf.cabor_nama, ti.komponen;

CREATE OR REPLACE VIEW v_atlet_tes_fisik_latest AS
SELECT DISTINCT ON (atlet_id)
  *
FROM atlet_tes_fisik
ORDER BY atlet_id, tahap DESC, created_at DESC;

-- ─── RLS POLICIES ────────────────────────────────────────────────────────────
-- Catatan: RLS diaktifkan per tabel melalui Supabase dashboard.
-- Dengan service key, RLS di-bypass secara otomatis.
-- Untuk anon/authenticated key, tambahkan policy berikut:

-- ALTER TABLE atlet ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "kontingen_own_data" ON atlet
--   USING (kontingen_id = (current_setting('request.jwt.claims', true)::jsonb->>'kontingen_id')::int);
