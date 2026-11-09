-- 079_dayung_data_awal.sql
-- Data awal & pengukuran berkala atlet Dayung se-Jabar (PODSI Jabar), 9 Nov 2026.
-- Kunci = situs_id (dayung_jabar_atlet). Untuk atlet yang tertaut ke tabel atlet
-- (contoh Kab. Bandung), tanggal lahir tetap dibaca dari atlet & tinggi/berat dari
-- atlet_tes_fisik — tabel ini hanya MENAMBAH yang belum ada, tidak menimpa.
-- Data pribadi (tanggal lahir) & pengukuran TIDAK dibuka ke anon: dibaca/ditulis
-- lewat /api/dayung/data-awal (wajib sesi operator Dayung/admin).

create table if not exists public.dayung_atlet_isian (
  situs_id    integer primary key references public.dayung_jabar_atlet(situs_id) on delete cascade,
  tgl_lahir   date,
  diisi_oleh  text,
  updated_at  timestamptz not null default now()
);

-- Satu baris = satu ukuran pada satu tanggal (titik nol = tanggal paling awal).
create table if not exists public.dayung_pengukuran (
  id          bigint generated always as identity primary key,
  situs_id    integer not null references public.dayung_jabar_atlet(situs_id) on delete cascade,
  tanggal     date    not null,
  item        text    not null,   -- kunci dari katalog di src/lib/dayung-data-awal.ts
  nilai       numeric(10, 3) not null check (nilai > 0),
  satuan      text    not null,
  catatan     text,
  diisi_oleh  text,
  created_at  timestamptz not null default now(),
  unique (situs_id, tanggal, item)
);
create index if not exists dayung_pengukuran_situs_idx on public.dayung_pengukuran (situs_id, item, tanggal);

alter table public.dayung_atlet_isian enable row level security;
alter table public.dayung_pengukuran  enable row level security;
revoke all on public.dayung_atlet_isian, public.dayung_pengukuran from anon, authenticated;

-- ROLLBACK: drop table dayung_pengukuran, dayung_atlet_isian;
