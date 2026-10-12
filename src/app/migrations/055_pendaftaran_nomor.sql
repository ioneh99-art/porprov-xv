-- 055_pendaftaran_nomor.sql
-- Daftar resmi "siapa turun di nomor apa" dari ekspor klasifikasi_verified
-- panitia (1.860 pendaftaran Kab. Bandung, 929 atlet, 637 nomor).
--
-- KENAPA TABEL SENDIRI, BUKAN nomor_pertandingan:
--   Katalog nomor_pertandingan disusun sebelum pendaftaran dan tidak cocok
--   dengan yang benar-benar dipertandingkan — Angkat Besi di katalog berkelas
--   61/67/73 kg, sedangkan yang didaftarkan 60/65/71 kg — dan memuat 185 baris
--   kembar. Tabel ini mencatat apa yang sungguh didaftarkan, per atlet.
--
-- NIK TIDAK DISIMPAN DI SINI. Berkas asal memuat NIK di kolom atletnya; NIK itu
-- hanya dipakai saat impor untuk menemukan atlet_id, lalu dibuang. Atlet yang
-- terdaftar resmi tapi belum ada di sistem disimpan dengan atlet_id kosong dan
-- namanya saja.
--
-- cabor_id memakai penomoran cabor yang sama dengan tabel atlet, supaya kode
-- lapor PIC (yang terikat cabor atlet) langsung menemukan nomornya.

create table if not exists public.pendaftaran_nomor (
  id            bigint generated always as identity primary key,
  kontingen_id  integer not null references public.kontingen(id),
  cabor_id      integer not null references public.cabang_olahraga(id),
  cabor_berkas  text    not null,
  disiplin      text    not null,
  nomor         text    not null,
  penanda       text    check (penanda in ('Pa', 'Pi', 'Campuran', 'Terbuka')),
  atlet_id      integer references public.atlet(id) on delete set null,
  nama_berkas   text    not null,
  jk_berkas     text    check (jk_berkas in ('L', 'P')),
  sumber        text,
  created_at    timestamptz not null default now()
);

comment on table public.pendaftaran_nomor is
  'Pendaftaran resmi atlet per nomor pertandingan (ekspor klasifikasi_verified). Satu baris = satu atlet di satu nomor. NIK sengaja tidak disimpan.';

-- Satu atlet hanya sekali per nomor. Nama ikut jadi kunci supaya atlet yang
-- belum ada di sistem (atlet_id kosong) tetap bisa dibedakan satu sama lain.
create unique index if not exists uq_pendaftaran_nomor_baris
  on public.pendaftaran_nomor (kontingen_id, disiplin, nomor, nama_berkas, coalesce(atlet_id, 0));
create index if not exists idx_pendaftaran_nomor_cabor
  on public.pendaftaran_nomor (kontingen_id, cabor_id);
create index if not exists idx_pendaftaran_nomor_atlet
  on public.pendaftaran_nomor (atlet_id);

alter table public.pendaftaran_nomor enable row level security;
revoke all on public.pendaftaran_nomor from anon, authenticated;

-- Laporan yang nomornya dipilih dari daftar resmi mencatat disiplinnya, supaya
-- kelak bisa disandingkan dengan jadwal harian (yang disusun per disiplin).
alter table public.laporan_hasil add column if not exists disiplin text;

comment on column public.laporan_hasil.disiplin is
  'Disiplin dari daftar resmi (mis. DAYUNG CANOEING). Kosong bila nomornya diketik bebas.';
