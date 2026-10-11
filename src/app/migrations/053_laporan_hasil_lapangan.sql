-- 053_laporan_hasil_lapangan.sql
-- Laporan hasil pertandingan dari PIC cabor di lapangan, dengan pengesahan KONIDA.
--
-- KENAPA TIDAK MENULIS KE hasil_pertandingan:
--   1. Pemicu hitung_klasemen() menghitung per BARIS ATLET — satu emas beregu
--      berisi 10 pemain akan terhitung 10 emas.
--   2. Pemicu itu menghitung semua baris, termasuk yang belum disahkan, dan
--      tabelnya terbuka untuk dibaca kunci anon.
-- Di sini satu baris = satu NOMOR pertandingan, dan baru dihitung setelah
-- berstatus 'disahkan'.
--
-- Kedua tabel hanya bisa disentuh lewat rute server (service key): RLS menyala
-- tanpa policy, dan hak anon/authenticated dicabut.

create table if not exists public.lapor_akses (
  id               bigint generated always as identity primary key,
  kontingen_id     integer not null references public.kontingen(id),
  cabor_id         integer not null references public.cabang_olahraga(id),
  kode_hash        text    not null unique,
  kode_ujung       text    not null,
  nama_pic         text    not null,
  no_wa            text,
  aktif            boolean not null default true,
  dibuat_oleh      text,
  created_at       timestamptz not null default now(),
  terakhir_dipakai timestamptz
);

comment on table public.lapor_akses is
  'Kode lapor PIC cabor. Kodenya sendiri tidak disimpan — hanya sidik (HMAC) dan 4 huruf terakhir untuk dikenali.';

create table if not exists public.laporan_hasil (
  id            bigint generated always as identity primary key,
  kontingen_id  integer not null references public.kontingen(id),
  cabor_id      integer not null references public.cabang_olahraga(id),
  nomor_id      integer references public.nomor_pertandingan(id),
  nomor_teks    text    not null,
  atlet_ids     integer[] not null check (cardinality(atlet_ids) between 1 and 60),
  hasil         text    not null check (hasil in ('emas','perak','perunggu','peringkat','lolos','gugur')),
  peringkat     integer check (peringkat between 1 and 999),
  nilai_teks    text,
  keterangan    text,
  foto_path     text,
  tanggal       date    not null,
  akses_id      bigint references public.lapor_akses(id),
  pelapor_nama  text    not null,
  pelapor_wa    text,
  status        text    not null default 'menunggu' check (status in ('menunggu','disahkan','ditolak')),
  diputus_oleh  text,
  diputus_at    timestamptz,
  alasan_tolak  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.laporan_hasil is
  'Satu baris = satu nomor pertandingan (perorangan atau beregu). Hanya status disahkan yang dihitung sebagai medali.';

create index if not exists laporan_hasil_antrean_idx
  on public.laporan_hasil (kontingen_id, status, tanggal);
create index if not exists lapor_akses_kontingen_idx
  on public.lapor_akses (kontingen_id, cabor_id);

alter table public.lapor_akses   enable row level security;
alter table public.laporan_hasil enable row level security;

revoke all on public.lapor_akses   from anon, authenticated;
revoke all on public.laporan_hasil from anon, authenticated;
