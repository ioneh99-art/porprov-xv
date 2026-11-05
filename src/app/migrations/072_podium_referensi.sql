-- 072_podium_referensi.sql
-- Podium lengkap per nomor (emas/perak/perunggu SEMUA kontingen) dari laporan lapangan
-- Posko Data KONI Kab. Bandung — data referensi (peta pesaing, rekap, cocokkan situs panitia).
-- Bukan klasemen: tidak dibaca halaman publik / klasemen. Baris Kab. Bandung bertaut ke
-- laporan_hasil (laporan_id) yang tetap disahkan lewat Antrean seperti biasa.

create table if not exists public.podium_referensi (
  id            bigserial primary key,
  tanggal       date not null,
  cabor_id      integer,
  cabor_teks    text not null,
  nomor_teks    text not null,
  medali        text not null check (medali in ('emas','perak','perunggu')),
  nama          text not null,          -- ditulis seperti di sumber
  kontingen     text not null,          -- ditulis seperti di sumber
  nilai_teks    text,                   -- waktu/skor bila ada
  kita          boolean not null default false,
  atlet_id      integer,                -- hanya untuk atlet Kab. Bandung
  laporan_id    bigint,                 -- laporan_hasil Kab. Bandung yang memuat medali ini
  venue         text,
  sumber        text not null,          -- mis. 'Grup WA Posko Data 5 Nov 19.05'
  catatan       text,
  dicatat_oleh  text not null default 'Superadministrator',
  created_at    timestamptz not null default now()
);

create unique index if not exists podium_referensi_unik
  on public.podium_referensi (tanggal, cabor_teks, nomor_teks, medali, lower(nama));
create index if not exists podium_referensi_tanggal_idx on public.podium_referensi (tanggal, cabor_id);

-- Hanya server (service role). Tidak ada akses anon/authenticated.
alter table public.podium_referensi enable row level security;
revoke all on public.podium_referensi from anon, authenticated;
