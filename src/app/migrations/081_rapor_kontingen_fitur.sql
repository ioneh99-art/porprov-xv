-- 081_rapor_kontingen_fitur.sql
-- 1) Ringkasan jumlah atlet per kontingen × cabor dari gudang PORPROV XV (bahan Rapor Kontingen).
--    Baca publik seperti tabel porprov15_* lainnya; security_invoker supaya ikut RLS tabel asal.
-- 2) Saklar fitur per kontingen (buka/kunci tanpa tayang ulang). Hanya server (service key)
--    yang membaca/menulis; diubah lewat API khusus Superadministrator dan tercatat di audit_logs.

create or replace view public.porprov15_atlet_kontingen_cabor
with (security_invoker = true) as
select kontingen_situs_id, cabor_situs_id, count(*)::int as jumlah
from public.porprov15_atlet
where kontingen_situs_id is not null and cabor_situs_id is not null
group by kontingen_situs_id, cabor_situs_id;

grant select on public.porprov15_atlet_kontingen_cabor to anon, authenticated;

create table if not exists public.fitur_kontingen (
  kontingen_id integer not null references public.kontingen(id),
  fitur        text    not null,
  terbuka      boolean not null default false,
  catatan      text,
  diubah_oleh  text,
  diubah_at    timestamptz not null default now(),
  primary key (kontingen_id, fitur)
);

alter table public.fitur_kontingen enable row level security;
revoke all on public.fitur_kontingen from anon, authenticated;

comment on table public.fitur_kontingen is
  'Saklar fitur berbayar/terbatas per kontingen (mis. rapor_kontingen untuk Kab. Bandung). Bawaan terkunci.';

insert into public.fitur_kontingen (kontingen_id, fitur, terbuka, catatan, diubah_oleh)
values (4, 'rapor_kontingen', false, 'Rapor Kontingen PORPROV XV — terkunci bawaan', 'Superadministrator')
on conflict do nothing;
