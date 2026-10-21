-- 060_jadwal_partai.sql
-- Jadwal per partai: satu baris = satu pertandingan kontingen (tanggal, jam,
-- nomor, babak, atlet, lawan, venue). Diisi PIC cabor dari HP (/lapor tab
-- Jadwal), KONIDA dari Kelola Jadwal, atau dari kolom Jam/Nomor/Lawan berkas
-- Matriks KONI. Langsung tampil di halaman publik — termasuk nama atlet
-- (keputusan Bos 21 Okt 2026).
--
-- Hanya dibaca/ditulis lewat rute server (service key). Kunci anon tidak punya akses.

create table if not exists public.jadwal_partai (
  id            bigint generated always as identity primary key,
  kontingen_id  integer not null references public.kontingen(id),
  cabor_id      integer not null references public.cabang_olahraga(id),
  tanggal       date    not null,
  jam           text    check (jam ~ '^[0-2][0-9]:[0-5][0-9]$'),
  nomor_teks    text    not null,
  disiplin      text,               -- terisi bila nomor dari daftar resmi pendaftaran
  nomor_resmi   text,
  babak         text,
  atlet_ids     integer[] not null default '{}' check (cardinality(atlet_ids) <= 60),
  lawan         text,
  venue         text,
  status        text    not null default 'terjadwal'
                check (status in ('terjadwal', 'berlangsung', 'ditunda', 'selesai', 'batal')),
  keterangan    text,
  sumber        text    not null default 'pic' check (sumber in ('pic', 'konida', 'matriks')),
  akses_id      bigint  references public.lapor_akses(id) on delete set null,
  dibuat_oleh   text,
  diubah_oleh   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.jadwal_partai is
  'Jadwal per partai kontingen. Langsung tampil di halaman publik, termasuk nama atlet.';

create index if not exists jadwal_partai_kontingen_tanggal_idx on public.jadwal_partai (kontingen_id, tanggal);
create index if not exists jadwal_partai_cabor_idx on public.jadwal_partai (kontingen_id, cabor_id);

alter table public.jadwal_partai enable row level security;
revoke all on public.jadwal_partai from anon, authenticated;

-- Laporan hasil yang dikirim dari partai terjadwal menyimpan tautannya.
alter table public.laporan_hasil
  add column if not exists partai_id bigint references public.jadwal_partai(id) on delete set null;
