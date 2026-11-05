-- 073_klasemen_sementara.sql
-- Rekap sementara perolehan medali semua kontingen (mis. dari Posko Data), dicatat
-- per "potret" (label + waktu). KHUSUS DALAM APLIKASI (War Room): tidak dibaca halaman
-- publik dan tidak menyentuh klasemen_medali (yang mengikuti situs KONI Jabar).

create table if not exists public.klasemen_sementara (
  id            bigserial primary key,
  potret        text not null,                 -- label potret, mis. '2026-11-05 malam'
  potret_at     timestamptz not null,          -- waktu rekap diterima
  kontingen     text not null,                 -- ditulis seperti di sumber
  emas          integer not null default 0 check (emas between 0 and 999),
  perak         integer not null default 0 check (perak between 0 and 999),
  perunggu      integer not null default 0 check (perunggu between 0 and 999),
  sumber        text not null,
  dicatat_oleh  text not null default 'Superadministrator',
  created_at    timestamptz not null default now()
);

create unique index if not exists klasemen_sementara_unik on public.klasemen_sementara (potret, lower(kontingen));
create index if not exists klasemen_sementara_waktu_idx on public.klasemen_sementara (potret_at desc);

-- Hanya server (service role).
alter table public.klasemen_sementara enable row level security;
revoke all on public.klasemen_sementara from anon, authenticated;
