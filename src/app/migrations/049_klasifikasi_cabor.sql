-- 049_klasifikasi_cabor.sql
-- Klasifikasi cabor + raihan Babak Kualifikasi PORPROV 2025.
-- Sumber: berkas "DATABSE DAN PRIORITAS.xlsx" dari pengurus Kab. Bandung.
-- (isi persis seperti yang diterapkan ke basis data)

create table if not exists public.klasifikasi_cabor (
  id             bigserial primary key,
  cabor_berkas   text not null,
  cabor_nama_raw text,
  kategori       text,
  prioritas      smallint,
  bk_emas        smallint not null default 0,
  bk_perak       smallint not null default 0,
  bk_perunggu    smallint not null default 0,
  keterangan     text,
  sumber         text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint uq_klasifikasi_cabor unique nulls not distinct (cabor_berkas, kategori)
);

create index if not exists idx_klasifikasi_cabor_nama on public.klasifikasi_cabor (cabor_nama_raw);
create index if not exists idx_klasifikasi_prioritas  on public.klasifikasi_cabor (prioritas);

create or replace view public.v_klasifikasi_cabor as
select
  cabor_nama_raw,
  min(prioritas) as prioritas, min(kategori) as kategori,
  sum(bk_emas)::int as bk_emas, sum(bk_perak)::int as bk_perak,
  sum(bk_perunggu)::int as bk_perunggu, count(*) as baris_berkas
from public.klasifikasi_cabor where cabor_nama_raw is not null
group by cabor_nama_raw;

alter view public.v_klasifikasi_cabor set (security_invoker = true);
