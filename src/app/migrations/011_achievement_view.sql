-- 011_achievement_view.sql
-- KBAAS Fase 1.2 — view prestasi terbaru per atlet (untuk Achievement Banner).
-- ADAPTASI: tingkat 'nasional'/'provinsi' (huruf kecil) sesuai constraint repo.

CREATE OR REPLACE VIEW v_atlet_recent_achievements AS
SELECT DISTINCT ON (rk.atlet_id)
  rk.atlet_id,
  rk.nama_kejuaraan AS latest_championship,
  rk.medali        AS latest_medal,
  rk.tingkat       AS latest_level,
  rk.hasil         AS latest_mark,
  rk.tahun         AS latest_year,
  rk.created_at    AS achievement_date,
  ekr.event_date   AS event_date,
  ekr.nomor_pertandingan,
  ekr.kategori_umur,
  ekr.gender,
  (ekr.event_date > NOW() - INTERVAL '180 days') AS is_recent_180d,
  (ekr.event_date > NOW() - INTERVAL '30 days')  AS is_recent_30d,
  CASE
    WHEN rk.medali='EMAS'     AND rk.tingkat='nasional' THEN 'TIER_1_NATIONAL_GOLD'
    WHEN rk.medali='PERAK'    AND rk.tingkat='nasional' THEN 'TIER_1_NATIONAL_SILVER'
    WHEN rk.medali='PERUNGGU' AND rk.tingkat='nasional' THEN 'TIER_2_NATIONAL_BRONZE'
    WHEN rk.medali='EMAS'     AND rk.tingkat='provinsi' THEN 'TIER_2_PROVINCIAL_GOLD'
    ELSE 'TIER_3_OTHER'
  END AS tier
FROM riwayat_kejuaraan rk
LEFT JOIN event_kejurnas_results ekr ON ekr.id = rk.source_event_kejurnas_id
WHERE rk.medali IN ('EMAS','PERAK','PERUNGGU')
ORDER BY rk.atlet_id, rk.created_at DESC;

GRANT SELECT ON v_atlet_recent_achievements TO anon, authenticated, service_role;
