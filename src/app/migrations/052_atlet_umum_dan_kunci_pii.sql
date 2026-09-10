-- 052_atlet_umum_dan_kunci_pii.sql
-- Menutup kebocoran kunci anon atas NIK, nomor rekening, dan nama bank.
--
-- SEBELUM: policy konida_select_atlet berisi USING(true) untuk role public,
-- dan ada GRANT SELECT setingkat tabel. Kunci anon — yang tertanam di halaman
-- web — bisa menarik 1.142 NIK langsung dari PostgREST tanpa menyentuh
-- aplikasi. Dibuktikan dengan permintaan nyata.
--
-- SESUDAH: hak tabel dicabut, lalu diberikan lagi PER KOLOM kecuali ketiganya.
-- Hak per-kolom saja tidak mempan selama hak tabel masih ada — yang menaungi
-- selalu menang; itu sebabnya percobaan sebelumnya di proyek ini gagal.
-- Efek sampingnya justru bagus: 'select=*' ikut ditolak seluruhnya.
--
-- Halaman membaca lewat view atlet_umum, dan menempelkan data pribadinya
-- lewat /api/konida/atlet-pii yang bergerbang sesi.
--
-- MEMBATALKAN bila ada yang rusak — satu perintah:
--   grant select on public.atlet to anon, authenticated;

-- 1. Pandangan tabel atlet tanpa kolom pribadi, untuk halaman yang memakai '*'.
do $$
declare kol text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into kol
  from information_schema.columns
  where table_schema='public' and table_name='atlet'
    and column_name not in ('no_ktp','no_rekening','nama_bank');
  execute format(
    'create or replace view public.atlet_umum with (security_invoker = true) as select %s from public.atlet', kol);
  execute 'grant select on public.atlet_umum to anon, authenticated';
end $$;

-- 2. Kunci kolom pribadinya.
do $$
declare kol text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into kol
  from information_schema.columns
  where table_schema='public' and table_name='atlet'
    and column_name not in ('no_ktp','no_rekening','nama_bank');
  execute 'revoke select on public.atlet from anon';
  execute 'revoke select on public.atlet from authenticated';
  execute format('grant select (%s) on public.atlet to anon', kol);
  execute format('grant select (%s) on public.atlet to authenticated', kol);
end $$;

comment on column public.atlet.no_ktp is
  'Data pribadi. Kunci anon TIDAK boleh membacanya — hanya lewat '
  '/api/konida/atlet-pii yang bergerbang sesi. Jangan pernah menjalankan '
  '"grant select on atlet to anon" tanpa daftar kolom: itu membuka lagi kebocorannya.';
