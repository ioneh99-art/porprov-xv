-- 045_tes_fisik_terbaru.sql
-- Melepas kunci "tahap 3" yang tertulis mati di 11 tempat.
--
-- Karena: tes biomotorik akan berkala (tiap ~6 bulan, tahap naik 3 → 4 → 5),
-- sementara seluruh aplikasi menyaring .eq('tahap', 3). Maka begitu tahap 4
-- masuk, data baru tidak akan terlihat di mana pun.
--
-- Mekanisme: satu view yang selalu mengembalikan tes TERBARU per atlet.
-- Kode aplikasi cukup menunjuk view ini, tidak perlu tahu nomor tahapnya.
--
-- security_invoker = true → view menghormati RLS milik pemanggil, bukan
-- pemilik view. Supaya pengetatan RLS di kemudian hari tetap berlaku di sini.

create or replace view public.v_atlet_tes_fisik_terbaru
with (security_invoker = true) as
select distinct on (t.atlet_id) t.*
from public.atlet_tes_fisik t
where t.atlet_id is not null
order by
  t.atlet_id,
  t.tanggal_tes desc nulls last,
  t.tahap       desc nulls last,
  t.id          desc;

comment on view public.v_atlet_tes_fisik_terbaru is
  'Tes biomotorik TERBARU per atlet (urut tanggal_tes, lalu tahap, lalu id). '
  'Pakai ini sebagai ganti .eq(tahap, N) supaya tes berkala berikutnya ikut terbaca.';

grant select on public.v_atlet_tes_fisik_terbaru to anon, authenticated, service_role;

-- View pendamping: riwayat lengkap per atlet untuk grafik tren antar tahap.
create or replace view public.v_atlet_tes_fisik_riwayat
with (security_invoker = true) as
select
  t.atlet_id,
  t.kontingen_id,
  t.nama_atlet,
  t.cabor_nama,
  t.tahap,
  t.tanggal_tes,
  t.lembaga_penguji,
  t.lokasi_tes,
  t.sumber_data,
  t.berat_badan,
  t.tinggi_badan,
  t.bmi,
  t.kesimpulan_persen,
  t.kesimpulan_kategori,
  t.status_tes,
  row_number() over (partition by t.atlet_id order by t.tanggal_tes, t.tahap, t.id) as urutan,
  t.kesimpulan_persen - lag(t.kesimpulan_persen)
    over (partition by t.atlet_id order by t.tanggal_tes, t.tahap, t.id) as selisih_dari_tes_sebelumnya
from public.atlet_tes_fisik t
where t.atlet_id is not null;

comment on view public.v_atlet_tes_fisik_riwayat is
  'Riwayat tes biomotorik per atlet beserta selisih skor terhadap tes sebelumnya. '
  'Dasar grafik tren dan penanda penurunan kondisi fisik.';

grant select on public.v_atlet_tes_fisik_riwayat to anon, authenticated, service_role;
