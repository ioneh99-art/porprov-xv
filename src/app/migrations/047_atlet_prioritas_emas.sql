-- 047_atlet_prioritas_emas.sql
-- Menyimpan penandaan atlet prioritas emas sebagai data tetap.
--
-- Latar: pengurus Kab. Bandung menandai atlet yang hampir dipastikan meraih
-- emas dengan MEWARNAI selnya kuning dan jingga di berkas "Analisis Atlet".
-- Penilaian itu datang dari orang yang paham lapangan — jauh lebih berharga
-- daripada apa pun yang bisa dihitung sistem. Tapi selama tersimpan sebagai
-- warna sel Excel, tidak ada satu pun bagian aplikasi yang bisa membacanya.
--
-- Kolom ini mengangkatnya jadi data yang bisa dipakai dasbor, daftar atlet,
-- dan War Room saat PORPROV berlangsung.

alter table public.atlet
  add column if not exists prioritas_emas    text,
  add column if not exists prioritas_capaian text,
  add column if not exists prioritas_sumber  text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'atlet_prioritas_emas_check'
  ) then
    alter table public.atlet
      add constraint atlet_prioritas_emas_check
      check (prioritas_emas is null or prioritas_emas in ('kuning', 'jingga'));
  end if;
end $$;

comment on column public.atlet.prioritas_emas is
  'Penandaan prioritas emas dari pengurus cabor: kuning atau jingga. '
  'Berasal dari pewarnaan sel pada berkas Analisis Atlet, bukan hitungan sistem.';
comment on column public.atlet.prioritas_capaian is
  'Catatan capaian terbaik dari berkas analisis, apa adanya (mis. "EMAS, 260 kg").';
comment on column public.atlet.prioritas_sumber is
  'Asal penandaan — nama berkas dan tanggal, supaya bisa ditelusuri.';

create index if not exists idx_atlet_prioritas_emas
  on public.atlet (kontingen_id, prioritas_emas)
  where prioritas_emas is not null;
