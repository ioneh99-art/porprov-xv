-- 077_dayung_jabar.sql
-- Data Dayung se-Jawa Barat untuk aplikasi PODSI Jabar (9 Nov 2026).
-- Sumber: situs resmi panitia PORPROV XV (porprov.konijabar.or.id), dibaca oleh
-- scripts/tarik-dayung-jabar.ts. Isinya hanya yang tampil publik di situs itu:
-- nama atlet, kontingen, disiplin, laga, peringkat, catatan waktu, medali.
-- Tanpa NIK/foto/kontak. Sengaja TERPISAH dari tabel atlet (data kontingen Kab. Bandung)
-- supaya jumlah atlet & klasemen aplikasi KONI Kab. Bandung tidak terpengaruh.

create table if not exists public.dayung_jabar_atlet (
  situs_id      integer primary key,              -- id atlet di situs panitia (/atlet/<slug>-<id>)
  slug          text    not null unique,
  nama          text    not null,
  kontingen     text    not null,                 -- nama kontingen persis seperti di situs
  kontingen_id  integer references public.kontingen(id),
  gender        text    check (gender in ('L', 'P', 'MIX')),
  disiplin      text,                             -- Dayung Canoeing / Dayung Rowing / Dayung Dbr
  emas          integer not null default 0,
  perak         integer not null default 0,
  perunggu      integer not null default 0,
  atlet_id      integer references public.atlet(id) on delete set null,  -- tautan ke data lokal (bila ada)
  dibaca_at     timestamptz not null default now()
);
create index if not exists dayung_jabar_atlet_kontingen_idx on public.dayung_jabar_atlet (kontingen);

create table if not exists public.dayung_jabar_laga (
  ref              integer primary key,           -- /laga/<ref>
  tanggal          date,
  jam              text,
  disiplin         text,
  nomor            text    not null,
  gender           text    check (gender in ('L', 'P', 'MIX')),
  babak            text,
  kode             text,
  venue            text,
  status           text,
  selesai          boolean not null default false,
  perebutan_medali boolean not null default false,
  dibaca_at        timestamptz not null default now()
);
create index if not exists dayung_jabar_laga_tanggal_idx on public.dayung_jabar_laga (tanggal);

create table if not exists public.dayung_jabar_peserta (
  id            bigint generated always as identity primary key,
  laga_ref      integer not null references public.dayung_jabar_laga(ref) on delete cascade,
  urutan        smallint not null,                -- urutan tampil di situs
  kontingen     text    not null,
  kontingen_id  integer references public.kontingen(id),
  peringkat     smallint,
  medali        text    check (medali in ('emas', 'perak', 'perunggu')),
  waktu         text,                             -- catatan waktu persis seperti di situs
  waktu_detik   numeric(10, 3),
  atlet_situs_ids integer[] not null default '{}', -- awak lengkap (dari halaman tiap atlet)
  atlet_nama    text[]  not null default '{}',
  unique (laga_ref, urutan)
);
create index if not exists dayung_jabar_peserta_kontingen_idx on public.dayung_jabar_peserta (kontingen);

-- Kapan terakhir dibaca + ringkasan hasil tarikan.
create table if not exists public.dayung_jabar_sinkron (
  id          bigint generated always as identity primary key,
  mulai       timestamptz not null default now(),
  selesai     timestamptz,
  ringkas     jsonb
);

-- Data publik → boleh dibaca siapa saja; menulis hanya lewat service_role (skrip/server).
alter table public.dayung_jabar_atlet   enable row level security;
alter table public.dayung_jabar_laga    enable row level security;
alter table public.dayung_jabar_peserta enable row level security;
alter table public.dayung_jabar_sinkron enable row level security;
revoke all on public.dayung_jabar_atlet, public.dayung_jabar_laga, public.dayung_jabar_peserta, public.dayung_jabar_sinkron from anon, authenticated;
grant select on public.dayung_jabar_atlet, public.dayung_jabar_laga, public.dayung_jabar_peserta, public.dayung_jabar_sinkron to anon, authenticated;
drop policy if exists baca_publik on public.dayung_jabar_atlet;
drop policy if exists baca_publik on public.dayung_jabar_laga;
drop policy if exists baca_publik on public.dayung_jabar_peserta;
drop policy if exists baca_publik on public.dayung_jabar_sinkron;
create policy baca_publik on public.dayung_jabar_atlet   for select to anon, authenticated using (true);
create policy baca_publik on public.dayung_jabar_laga    for select to anon, authenticated using (true);
create policy baca_publik on public.dayung_jabar_peserta for select to anon, authenticated using (true);
create policy baca_publik on public.dayung_jabar_sinkron for select to anon, authenticated using (true);

-- ROLLBACK: drop table dayung_jabar_peserta, dayung_jabar_laga, dayung_jabar_atlet, dayung_jabar_sinkron;
