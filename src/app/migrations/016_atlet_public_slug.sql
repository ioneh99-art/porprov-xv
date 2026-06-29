-- 016_atlet_public_slug.sql
-- KBAAS Fase 3.10 — slug publik untuk halaman spotlight atlet.

ALTER TABLE atlet ADD COLUMN IF NOT EXISTS public_slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_atlet_public_slug ON atlet(public_slug) WHERE public_slug IS NOT NULL;

-- backfill slug utk atlet yg sudah is_public
UPDATE atlet SET public_slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(nama_lengkap, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g')) || '-' || id::text
WHERE is_public = TRUE AND public_slug IS NULL;
