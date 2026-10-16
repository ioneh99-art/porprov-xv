-- 058_proyeksi_medali.sql
-- Proyeksi perolehan medali dari KONI kontingen (mis. berkas "PPT Grafik Raihan
-- Emas": 74 emas Kab. Bandung, 3–19 Nov 2026). Satu baris = satu medali yang
-- diproyeksikan pada satu tanggal. Dipakai sebagai patokan grafik "Proyeksi vs
-- Realisasi" di War Room; realisasinya dihitung dari laporan_hasil yang disahkan.
--
-- Hanya bisa disentuh lewat rute server (service key), seperti tabel lapor.

create table if not exists public.proyeksi_medali (
  id            bigint generated always as identity primary key,
  kontingen_id  integer not null references public.kontingen(id),
  urutan        integer not null,
  tanggal       date    not null,
  medali        text    not null default 'emas' check (medali in ('emas','perak','perunggu')),
  cabor_id      integer references public.cabang_olahraga(id),
  cabor_teks    text    not null,
  nomor_teks    text,
  atlet_teks    text,
  kota          text,
  sumber        text    not null,
  created_at    timestamptz not null default now(),
  unique (kontingen_id, sumber, urutan)
);

comment on table public.proyeksi_medali is
  'Proyeksi medali per tanggal dari KONI kontingen; patokan grafik Proyeksi vs Realisasi. Realisasi = laporan_hasil disahkan.';

create index if not exists proyeksi_medali_kontingen_idx on public.proyeksi_medali (kontingen_id, tanggal);

alter table public.proyeksi_medali enable row level security;
revoke all on public.proyeksi_medali from anon, authenticated;
