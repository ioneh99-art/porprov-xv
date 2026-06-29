-- 013_discipline_family.sql
-- KBAAS Fase 2.6 — projeksi performa antar-nomor sefamili (mis. 10K Race Walk -> 20K).

CREATE TABLE IF NOT EXISTS discipline_family (
  id BIGSERIAL PRIMARY KEY,
  cabor_id INTEGER,
  family_name TEXT NOT NULL,
  nomor_pertandingan TEXT NOT NULL,
  family_role TEXT NOT NULL,                  -- BASE / SHORTER_VARIANT / LONGER_VARIANT
  conversion_factor_to_base REAL DEFAULT 1.0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cabor_id, family_name, nomor_pertandingan)
);
CREATE INDEX IF NOT EXISTS idx_df_family ON discipline_family(family_name);
CREATE INDEX IF NOT EXISTS idx_df_nomor ON discipline_family(nomor_pertandingan);

INSERT INTO discipline_family (cabor_id, family_name, nomor_pertandingan, family_role, conversion_factor_to_base, notes) VALUES
  (10,'Race Walk','5.000m Race Walk','SHORTER_VARIANT',0.5,'Half distance dari 10K'),
  (10,'Race Walk','10.000m Race Walk','BASE',1.0,'Base event'),
  (10,'Race Walk','20Km Jalan Cepat','LONGER_VARIANT',2.2,'~2.2x 10K (endurance penalty)'),
  (10,'Race Walk','20 Km Jalan Cepat','LONGER_VARIANT',2.2,'alias spasi'),
  (10,'Race Walk','50Km Jalan Cepat','LONGER_VARIANT',5.8,'50K extreme endurance'),
  (10,'Sprint','100m','SHORTER_VARIANT',0.45,'~45% waktu 200m'),
  (10,'Sprint','200m','BASE',1.0,'Base sprint'),
  (10,'Sprint','400m','LONGER_VARIANT',2.15,'~2.15x 200m'),
  (10,'Middle Distance','800m','BASE',1.0,'Base middle'),
  (10,'Middle Distance','1500m','LONGER_VARIANT',2.0,'2x 800m'),
  (10,'Long Distance','3000m','SHORTER_VARIANT',0.55,'shorter dari 5K'),
  (10,'Long Distance','5000m','BASE',1.0,'Base long'),
  (10,'Long Distance','10000m','LONGER_VARIANT',2.1,'~2.1x 5K'),
  (10,'Hurdles','100m Hurdles','SHORTER_VARIANT',0.18,'sprint hurdle Pi'),
  (10,'Hurdles','110m Hurdles','SHORTER_VARIANT',0.20,'sprint hurdle Pa'),
  (10,'Hurdles','400m Hurdles','BASE',1.0,'Base hurdle'),
  (10,'Horizontal Jumps','Lompat Jauh','BASE',1.0,'Long jump base'),
  (10,'Horizontal Jumps','Lompat Jangkit','LONGER_VARIANT',2.05,'triple ~2x long jump'),
  (10,'Throws','Tolak Peluru','SHORTER_VARIANT',0.30,'shot put'),
  (10,'Throws','Lempar Cakram','BASE',1.0,'discus base'),
  (10,'Throws','Lempar Lembing','LONGER_VARIANT',1.5,'javelin'),
  (10,'Throws','Lontar Martil','LONGER_VARIANT',1.4,'hammer')
ON CONFLICT DO NOTHING;

-- helper: parse catatan waktu -> detik
CREATE OR REPLACE FUNCTION mark_to_seconds(m TEXT) RETURNS INT AS $$
BEGIN
  IF m ~ '^\d+:\d+:\d+(\.\d+)?$' THEN
    RETURN split_part(m,':',1)::int*3600 + split_part(m,':',2)::int*60 + floor(split_part(m,':',3)::numeric)::int;
  ELSIF m ~ '^\d+:\d+(\.\d+)?$' THEN
    RETURN split_part(m,':',1)::int*60 + floor(split_part(m,':',2)::numeric)::int;
  ELSIF m ~ '^\d+(\.\d+)?$' THEN
    RETURN floor(m::numeric)::int;
  ELSE RETURN NULL; END IF;
END; $$ LANGUAGE plpgsql IMMUTABLE;

-- RPC projeksi
CREATE OR REPLACE FUNCTION project_athlete_performance(p_atlet_id INT, p_target_nomor TEXT)
RETURNS TABLE (
  source_event TEXT, source_mark TEXT, source_seconds INT,
  target_event TEXT, projected_seconds INT,
  family_name TEXT, conversion_factor REAL, confidence TEXT, source_event_id BIGINT
) AS $$
DECLARE v_family TEXT; v_factor REAL;
BEGIN
  SELECT df.family_name, df.conversion_factor_to_base INTO v_family, v_factor
  FROM discipline_family df WHERE df.nomor_pertandingan ILIKE p_target_nomor LIMIT 1;
  IF v_family IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT ekr.nomor_pertandingan::text, ekr.mark::text, mark_to_seconds(ekr.mark),
    p_target_nomor, (mark_to_seconds(ekr.mark) * (v_factor / df.conversion_factor_to_base))::int,
    df.family_name::text, (v_factor / df.conversion_factor_to_base)::real,
    (CASE WHEN df.family_role='BASE' THEN 'HIGH'
          WHEN abs(v_factor - df.conversion_factor_to_base) < 0.5 THEN 'MEDIUM' ELSE 'LOW' END)::text,
    ekr.id
  FROM event_kejurnas_results ekr
  JOIN discipline_family df ON df.nomor_pertandingan ILIKE ekr.nomor_pertandingan AND df.family_name = v_family
  WHERE ekr.atlet_id = p_atlet_id AND mark_to_seconds(ekr.mark) IS NOT NULL AND ekr.status='OK'
  ORDER BY ekr.event_date DESC LIMIT 5;
END; $$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION project_athlete_performance TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION mark_to_seconds TO anon, authenticated, service_role;
