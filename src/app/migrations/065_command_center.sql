-- 065_command_center.sql
-- Pengaturan layar command center (3 monitor) per kontingen. Satu tombol dari HP
-- (War Room → Command Center) mengubah ketiga layar sekaligus karena layar
-- membaca baris ini tiap beberapa detik.
--   mode_kunjungan : tampilan tamu (Bupati/pejabat) — huruf lebih besar, ucapan
--                    selamat datang, data internal (antrean, alarm) disembunyikan.
--   sambutan       : teks ucapan yang tampil saat mode kunjungan.
-- Hanya dibaca/ditulis lewat rute server (service key). Kunci anon tidak punya akses.

create table if not exists public.command_center (
  kontingen_id   integer primary key references public.kontingen(id),
  mode_kunjungan boolean not null default false,
  sambutan       text,
  diubah_oleh    text,
  updated_at     timestamptz not null default now()
);
alter table public.command_center enable row level security;
revoke all on public.command_center from anon, authenticated;
