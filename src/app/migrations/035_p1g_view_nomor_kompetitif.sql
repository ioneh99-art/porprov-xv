-- 035_p1g_view_nomor_kompetitif.sql
-- P1g (2026-07-20) — sudah diterapkan ke live. View kekompetitifan nomor (jml kontingen
-- & atlet aktif per nomor). security_invoker=on (lint-clean). Dibaca via route superadmin
-- /api/superadmin/laporan-kompetitif (tandai nomor < 4 kontingen).
CREATE OR REPLACE VIEW v_nomor_kompetitif
WITH (security_invoker = on) AS
SELECT n.id AS nomor_id, n.nama AS nomor, n.gender, n.cabor_id, c.nama AS cabor,
  count(DISTINCT k.kontingen_id) FILTER (WHERE lower(coalesce(k.status,'')) NOT LIKE 'dibatalkan%' AND lower(coalesce(k.status,'')) NOT LIKE 'ditolak%') AS jml_kontingen,
  count(DISTINCT k.atlet_id) FILTER (WHERE lower(coalesce(k.status,'')) NOT LIKE 'dibatalkan%' AND lower(coalesce(k.status,'')) NOT LIKE 'ditolak%') AS jml_atlet
FROM nomor_pertandingan n
LEFT JOIN cabang_olahraga c ON c.id = n.cabor_id
LEFT JOIN kualifikasi_atlet k ON k.nomor_id = n.id
GROUP BY n.id, n.nama, n.gender, n.cabor_id, c.nama;
