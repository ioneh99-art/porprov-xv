-- 080_porprov15_arsip.sql
-- Arsip data menyeluruh PORPROV XV Jawa Barat 2026 dari situs resmi panitia
-- (porprov.konijabar.or.id), diambil setelah penutupan 20 Nov 2026.
-- Diisi oleh scripts/olah-arsip-konijabar.ts dari arsip halaman mentah
-- (data/arsip-konijabar/<tanggal>/). Isinya hanya yang tampil publik di situs:
-- nama atlet, kontingen, cabor, nomor, laga, skor/waktu/nilai, medali, venue.
-- TERPISAH dari tabel operasional (atlet, kontingen, laporan_hasil, …) — kolom *_id
-- "kita" hanya tautan baca ke tabel itu bila cocok.

create table if not exists public.porprov15_kontingen (
  situs_id      integer primary key,             -- data-cid di situs
  slug          text not null unique,
  nama          text not null,
  peringkat     smallint,
  emas          integer not null default 0,
  perak         integer not null default 0,
  perunggu      integer not null default 0,
  total         integer not null default 0,
  jumlah_atlet  integer,
  jumlah_laga   integer,
  jumlah_menang integer,
  kontingen_id  integer references public.kontingen(id),
  dibaca_at     timestamptz not null default now()
);

create table if not exists public.porprov15_venue (
  situs_id   integer primary key,
  nama       text not null,
  klaster    text[] not null default '{}',
  cabor      text[] not null default '{}',
  lat        double precision,
  lng        double precision,
  alamat     text,
  lokasi     jsonb not null default '[]'          -- semua titik lokasi (nama, lat, lng, alamat, peta)
);

create table if not exists public.porprov15_cabor (
  situs_id      integer primary key,              -- /atlet?cabor=N
  slug          text not null unique,
  nama          text not null,
  jumlah_nomor  integer,
  jumlah_atlet  integer,
  rentang       text,
  cabor_id      integer references public.cabang_olahraga(id),  -- tautan ke cabor kita bila cocok
  dibaca_at     timestamptz not null default now()
);

create table if not exists public.porprov15_disiplin (
  situs_id    integer primary key,
  cabor_situs_id integer not null references public.porprov15_cabor(situs_id) on delete cascade,
  nama        text not null,
  jadwal      jsonb not null default '[]'          -- [{rentang, venue_situs_id, venue}]
);

create table if not exists public.porprov15_nomor (
  situs_id          integer primary key,          -- /nomor/<slug>-N = /bagan?nomor=N
  slug              text not null unique,
  cabor_situs_id    integer references public.porprov15_cabor(situs_id),
  disiplin_situs_id integer references public.porprov15_disiplin(situs_id),
  disiplin          text,
  nama              text not null,
  gender            text check (gender in ('L', 'P', 'MIX')),
  status            text,
  selesai           boolean not null default false,
  rentang           text,
  venue_situs_id    integer references public.porprov15_venue(situs_id),
  jumlah_laga       integer,
  jumlah_peserta    integer,
  dibaca_at         timestamptz not null default now()
);
create index if not exists porprov15_nomor_cabor_idx on public.porprov15_nomor (cabor_situs_id);

-- Podium resmi tiap nomor (satu baris per kontingen peraih medali; perunggu bisa dua).
create table if not exists public.porprov15_medali (
  id                 bigint generated always as identity primary key,
  nomor_situs_id     integer not null references public.porprov15_nomor(situs_id) on delete cascade,
  urutan             smallint not null,
  medali             text not null check (medali in ('emas', 'perak', 'perunggu')),
  kontingen_situs_id integer references public.porprov15_kontingen(situs_id),
  kontingen          text not null,
  laga_ref           integer,
  atlet_situs_ids    integer[] not null default '{}',
  atlet_nama         text[] not null default '{}',
  unique (nomor_situs_id, urutan)
);
create index if not exists porprov15_medali_kontingen_idx on public.porprov15_medali (kontingen_situs_id, medali);

create table if not exists public.porprov15_atlet (
  situs_id           integer primary key,          -- /atlet/<slug>-N
  slug               text not null unique,
  nama               text not null,
  kontingen_situs_id integer references public.porprov15_kontingen(situs_id),
  kontingen          text,
  cabor_situs_id     integer references public.porprov15_cabor(situs_id),
  cabor              text,
  disiplin           text,
  gender             text check (gender in ('L', 'P', 'MIX')),
  emas               integer not null default 0,
  perak              integer not null default 0,
  perunggu           integer not null default 0,
  jumlah_laga        integer not null default 0,
  atlet_id           integer references public.atlet(id) on delete set null,  -- tautan ke data atlet kita (Kab. Bandung) bila cocok
  dibaca_at          timestamptz not null default now()
);
create index if not exists porprov15_atlet_kontingen_idx on public.porprov15_atlet (kontingen_situs_id);
create index if not exists porprov15_atlet_cabor_idx on public.porprov15_atlet (cabor_situs_id);

create table if not exists public.porprov15_laga (
  ref               integer primary key,           -- /laga/<ref>
  nomor_situs_id    integer references public.porprov15_nomor(situs_id),
  cabor_situs_id    integer references public.porprov15_cabor(situs_id),
  tanggal           date,
  jam               text,
  cabor             text,
  disiplin          text,
  nomor             text,
  gender            text check (gender in ('L', 'P', 'MIX')),
  babak             text,
  kode              text,
  venue             text,
  klaster           text,
  status            text,
  selesai           boolean not null default false,
  perebutan_medali  boolean not null default false,
  bentuk            text not null check (bentuk in ('duel', 'peringkat', 'kosong')),
  video             text,
  dibaca_at         timestamptz not null default now()
);
create index if not exists porprov15_laga_nomor_idx on public.porprov15_laga (nomor_situs_id);
create index if not exists porprov15_laga_tanggal_idx on public.porprov15_laga (tanggal);

create table if not exists public.porprov15_laga_peserta (
  id                 bigint generated always as identity primary key,
  laga_ref           integer not null references public.porprov15_laga(ref) on delete cascade,
  urutan             smallint not null,
  sisi               text check (sisi in ('a', 'b')),
  kontingen_situs_id integer references public.porprov15_kontingen(situs_id),
  kontingen          text not null,
  menang             boolean,
  skor               integer,
  peringkat          smallint,
  medali             text check (medali in ('emas', 'perak', 'perunggu')),
  nilai              text,                         -- persis seperti di situs (skor/waktu/poin)
  nilai_angka        numeric(14, 4),               -- waktu → detik; selain itu angka pertama
  atlet_situs_ids    integer[] not null default '{}',
  atlet_nama         text[] not null default '{}',
  unique (laga_ref, urutan)
);
create index if not exists porprov15_peserta_kontingen_idx on public.porprov15_laga_peserta (kontingen_situs_id);
create index if not exists porprov15_peserta_atlet_idx on public.porprov15_laga_peserta using gin (atlet_situs_ids);

-- Ringkasan tiap kali arsip diolah (jumlah per jenis + pemeriksaan silang).
create table if not exists public.porprov15_sinkron (
  id          bigint generated always as identity primary key,
  arsip       text not null,                       -- tanggal folder arsip
  mulai       timestamptz not null default now(),
  selesai     timestamptz,
  ringkas     jsonb
);

-- Data publik situs panitia → boleh dibaca; menulis hanya service_role (skrip).
do $$
declare t text;
begin
  foreach t in array array['porprov15_kontingen','porprov15_venue','porprov15_cabor','porprov15_disiplin','porprov15_nomor',
                           'porprov15_medali','porprov15_atlet','porprov15_laga','porprov15_laga_peserta','porprov15_sinkron']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('drop policy if exists baca_publik on public.%I', t);
    execute format('create policy baca_publik on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- ROLLBACK: drop table porprov15_laga_peserta, porprov15_laga, porprov15_medali, porprov15_atlet,
--   porprov15_nomor, porprov15_disiplin, porprov15_cabor, porprov15_venue, porprov15_kontingen, porprov15_sinkron;
