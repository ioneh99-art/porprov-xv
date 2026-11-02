-- 069_lawan_luar.sql
-- Head-to-Head target emas (2 Nov 2026): calon lawan & bagan dari situs panitia
-- porprov.konijabar.or.id. Hanya halaman yang diizinkan robots.txt situs itu.
--  atlet_luar : peserta PORPROV per cabor (nama, kontingen, putra/putri, foto) —
--               hanya cabor yang punya target emas Kab. Bandung.
--  bagan_luar : bagan per nomor (kartu laga, klasemen grup, matriks) yang cocok dengan target.
-- Dibaca/ditulis lewat rute server (kunci layanan). Kunci anon tidak punya akses.

create table if not exists public.atlet_luar (
  sumber       text    not null default 'konijabar',
  ref          integer not null,                 -- nomor atlet di situs (/atlet/<slug>-<ref>)
  slug         text    not null,
  nama         text    not null,
  kontingen    text    not null,
  cabor_situs  text    not null,
  cabor_id     integer,                          -- cabang_olahraga kita (dicocokkan dari nama cabor situs)
  gender       text check (gender in ('L','P')),
  foto         text,
  dibaca_at    timestamptz not null default now(),
  primary key (sumber, ref)
);
create index if not exists atlet_luar_cabor_idx on public.atlet_luar (cabor_id, gender);
alter table public.atlet_luar enable row level security;
revoke all on public.atlet_luar from anon, authenticated;

create table if not exists public.bagan_luar (
  sumber      text    not null default 'konijabar',
  ref         integer not null,                  -- /bagan?nomor=<ref>
  nama        text    not null,
  data        jsonb   not null,                  -- { kartu, grup, matriks }
  dibaca_at   timestamptz not null default now(),
  primary key (sumber, ref)
);
alter table public.bagan_luar enable row level security;
revoke all on public.bagan_luar from anon, authenticated;
