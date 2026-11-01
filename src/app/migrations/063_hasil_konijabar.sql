-- 063_hasil_konijabar.sql
-- Hasil laga yang dibaca dari situs resmi panitia (porprov.konijabar.or.id).
-- Sistem membaca jadwal harian + halaman laga yang melibatkan kontingen kita,
-- menyimpannya di hasil_luar, lalu (bila PIC/KONIDA belum melapor partai itu)
-- memasukkannya ke antrean laporan_hasil berstatus 'menunggu' dengan tanda
-- sumber_luar = 'konijabar'. KONIDA yang memilah dan mengesahkan — data ini
-- tidak dihitung medali dan tidak tampil publik sebelum disahkan.
--
-- Hanya dibaca/ditulis lewat rute server (service key). Kunci anon tidak punya akses.

create table if not exists public.hasil_luar (
  id            bigint generated always as identity primary key,
  sumber        text    not null default 'konijabar' check (sumber in ('konijabar')),
  ref           text    not null,                 -- nomor laga di situs sumber (/laga/<ref>)
  kontingen_id  integer not null references public.kontingen(id),
  cabor_id      integer references public.cabang_olahraga(id),
  cabor_teks    text, disiplin_teks text, nomor_teks text, babak text, kode text,
  tanggal       date, jam text, venue text,
  status_luar   text,                             -- teks status di situs (Selesai, Terjadwal, ...)
  selesai       boolean not null default false,
  lawan         text, skor_kita integer, skor_lawan integer,
  akhir         text check (akhir in ('menang', 'kalah', 'seri')),
  atlet_nama    text[] not null default '{}',
  url           text,
  partai_id     bigint references public.jadwal_partai(id) on delete set null,
  laporan_id    bigint references public.laporan_hasil(id) on delete set null,
  catatan       text,
  dibaca_at     timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (sumber, ref, kontingen_id)
);
create index if not exists hasil_luar_kontingen_tanggal_idx on public.hasil_luar (kontingen_id, tanggal);

alter table public.hasil_luar enable row level security;
revoke all on public.hasil_luar from anon, authenticated;

-- Catatan kapan terakhir membaca situs (supaya tidak membaca lebih sering dari perlu).
create table if not exists public.sinkron_luar (
  sumber        text    not null,
  kontingen_id  integer not null references public.kontingen(id),
  terakhir      timestamptz,
  ringkas       jsonb,
  primary key (sumber, kontingen_id)
);
alter table public.sinkron_luar enable row level security;
revoke all on public.sinkron_luar from anon, authenticated;

-- Laporan yang dibuat dari situs panitia diberi tanda sumbernya.
alter table public.laporan_hasil
  add column if not exists sumber_luar text check (sumber_luar in ('konijabar')),
  add column if not exists ref_luar text;
create unique index if not exists laporan_hasil_ref_luar_uniq
  on public.laporan_hasil (kontingen_id, sumber_luar, ref_luar) where ref_luar is not null;
