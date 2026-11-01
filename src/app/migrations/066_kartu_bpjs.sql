-- 066_kartu_bpjs.sql
-- Kartu BPJS Ketenagakerjaan peserta (atlet + official) dari berkas KONI.
--
-- Data pribadi: NIK, nomor KPJ, gambar & PDF kartu. Karena itu TIDAK disimpan
-- di tabel atlet — kolom atlet.no_bpjs_* masih terbaca kunci anon lewat view
-- atlet_umum. Tabel ini tertutup total bagi kunci anon/authenticated; yang
-- membacanya hanya server (service key):
--   • /api/konida/kartu-bpjs  — profil atlet, bergerbang sesi KONIDA
--   • /api/publik/bpjs        — pemilik kartu mengunduh dengan NIK-nya sendiri
--
-- Berkas disimpan di bucket privat 'kartu-bpjs' (tanpa policy → hanya service
-- key), dibagikan lewat signed URL berumur pendek.
--
-- MEMBATALKAN: drop table public.kartu_bpjs_percobaan; drop table public.kartu_bpjs;
--              (lalu kosongkan & hapus bucket kartu-bpjs dari dasbor Storage)

create table if not exists public.kartu_bpjs (
  id               bigserial primary key,
  kontingen_id     int  not null,
  atlet_id         int  references public.atlet(id) on delete set null,
  -- calon atlet bila nama sama tapi NIK beda — menunggu diperiksa KONIDA
  kandidat_atlet_id int references public.atlet(id) on delete set null,
  status_cocok     text not null check (status_cocok in ('nik','nik_beda','bukan_atlet','manual')),
  jenis            text not null default 'ketenagakerjaan',
  nik              text not null,
  kpj              text not null,
  nama_kartu       text not null,
  berlaku          text,
  berkas_pdf       text not null,
  berkas_gambar    text not null,
  sumber_berkas    text,
  sumber_halaman   int,
  jumlah_unduh     int  not null default 0,
  terakhir_diunduh timestamptz,
  created_at       timestamptz not null default now(),
  unique (kontingen_id, nik, jenis)
);
create index if not exists kartu_bpjs_atlet_idx on public.kartu_bpjs (atlet_id);
create index if not exists kartu_bpjs_nama_idx  on public.kartu_bpjs (kontingen_id, nama_kartu);

-- Catatan percobaan unduh lewat halaman publik — dasar pembatas tebak-NIK.
-- Disimpan di DB (bukan memori server) karena Vercel menjalankan banyak salinan.
create table if not exists public.kartu_bpjs_percobaan (
  id        bigserial primary key,
  kartu_id  bigint references public.kartu_bpjs(id) on delete cascade,
  ip_sidik  text not null,
  berhasil  boolean not null,
  at        timestamptz not null default now()
);
create index if not exists kartu_bpjs_percobaan_ip_idx    on public.kartu_bpjs_percobaan (ip_sidik, at desc);
create index if not exists kartu_bpjs_percobaan_kartu_idx on public.kartu_bpjs_percobaan (kartu_id, at desc);

alter table public.kartu_bpjs           enable row level security;
alter table public.kartu_bpjs_percobaan enable row level security;
revoke all on public.kartu_bpjs           from anon, authenticated;
revoke all on public.kartu_bpjs_percobaan from anon, authenticated;
revoke all on sequence public.kartu_bpjs_id_seq           from anon, authenticated;
revoke all on sequence public.kartu_bpjs_percobaan_id_seq from anon, authenticated;

comment on table public.kartu_bpjs is
  'Data pribadi (NIK, KPJ, berkas kartu). Jangan pernah GRANT ke anon/authenticated. '
  'Dibaca hanya lewat /api/konida/kartu-bpjs (sesi) dan /api/publik/bpjs (NIK pemilik).';

insert into storage.buckets (id, name, public)
values ('kartu-bpjs', 'kartu-bpjs', false)
on conflict (id) do update set public = false;
