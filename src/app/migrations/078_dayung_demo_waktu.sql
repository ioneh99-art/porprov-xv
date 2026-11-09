-- 078_dayung_demo_waktu.sql
-- Catatan waktu MODE DEMO untuk peragaan aplikasi Dayung ke PODSI Jabar (9 Nov 2026).
-- Operator mengetik waktu per perahu pada start list resmi (dayung_jabar_peserta);
-- aplikasi mengurutkan & memberi medali. TIDAK mengubah hasil resmi. Bisa dikosongkan kapan saja.

create table if not exists public.dayung_demo_waktu (
  laga_ref     integer  not null references public.dayung_jabar_laga(ref) on delete cascade,
  urutan       smallint not null,
  waktu_detik  numeric(10, 3),
  status       text     not null default 'ok' check (status in ('ok', 'DNS', 'DNF', 'DSQ')),
  diisi_oleh   text,
  updated_at   timestamptz not null default now(),
  primary key (laga_ref, urutan)
);

alter table public.dayung_demo_waktu enable row level security;
revoke all on public.dayung_demo_waktu from anon, authenticated;
grant select on public.dayung_demo_waktu to anon, authenticated;
drop policy if exists baca_publik on public.dayung_demo_waktu;
create policy baca_publik on public.dayung_demo_waktu for select to anon, authenticated using (true);
-- Menulis hanya lewat /api/dayung/demo-waktu (service_role, wajib sesi operator Dayung/admin).

-- ROLLBACK: drop table dayung_demo_waktu;
