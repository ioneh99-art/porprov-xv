-- 051_atlet_pii_terisolasi.sql
-- Wadah terisolasi untuk NIK, rekening, dan nama bank atlet.
-- Latar lengkap + rencana pemindahannya: docs/RENCANA_TUTUP_BOCOR_ANON.md
--
-- Kunci anon (tertanam di halaman web) bisa membaca seluruh tabel atlet
-- termasuk NIK, lewat policy konida_select_atlet USING(true). 67 berkas
-- halaman bergantung pada policy itu, jadi jalannya disiapkan lebih dulu;
-- kolom lamanya dibuang belakangan setelah semua halaman pindah.

create table if not exists public.atlet_pii (
  atlet_id     bigint primary key references public.atlet(id) on delete cascade,
  no_ktp       text,
  no_rekening  text,
  nama_bank    text,
  updated_at   timestamptz not null default now()
);

alter table public.atlet_pii enable row level security;
revoke all on public.atlet_pii from anon, authenticated;
create index if not exists idx_atlet_pii_ktp on public.atlet_pii (no_ktp);

insert into public.atlet_pii (atlet_id, no_ktp, no_rekening, nama_bank)
select id, no_ktp, no_rekening, nama_bank from public.atlet
on conflict (atlet_id) do update
  set no_ktp = excluded.no_ktp, no_rekening = excluded.no_rekening,
      nama_bank = excluded.nama_bank, updated_at = now();

create or replace function public.sinkron_atlet_pii() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.atlet_pii (atlet_id, no_ktp, no_rekening, nama_bank)
  values (new.id, new.no_ktp, new.no_rekening, new.nama_bank)
  on conflict (atlet_id) do update
    set no_ktp = excluded.no_ktp, no_rekening = excluded.no_rekening,
        nama_bank = excluded.nama_bank, updated_at = now();
  return new;
end $$;

drop trigger if exists trg_sinkron_atlet_pii on public.atlet;
create trigger trg_sinkron_atlet_pii
  after insert or update of no_ktp, no_rekening, nama_bank on public.atlet
  for each row execute function public.sinkron_atlet_pii();
