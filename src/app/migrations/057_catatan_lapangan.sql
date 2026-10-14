-- 057_catatan_lapangan.sql
-- Catatan kejadian dari PIC cabor di lapangan, di luar hasil pertandingan.
-- Tiga jenis, mengikuti bagian III–V format Laporan Monitoring PORPROV XV:
--   aturan     pelaksanaan tidak sesuai aturan/THB (bahan protes)
--   teknis     masalah teknis pertandingan (alat, venue, perangkat, cedera saat tanding)
--   nonteknis  di luar teknis pertandingan (akomodasi, transportasi, konsumsi, kesehatan)
--
-- Catatan tidak perlu disahkan seperti hasil — tidak ada angka yang berubah
-- karenanya. KONIDA menindaklanjuti: baru → ditangani → selesai, atau diabaikan
-- (salah kirim / tidak relevan; tidak ikut tercetak di laporan cabor).
--
-- Seperti laporan_hasil: hanya bisa disentuh lewat rute server (service key).

create table if not exists public.catatan_lapangan (
  id              bigint generated always as identity primary key,
  kontingen_id    integer not null references public.kontingen(id),
  cabor_id        integer not null references public.cabang_olahraga(id),
  jenis           text    not null check (jenis in ('aturan','teknis','nonteknis')),
  mendesak        boolean not null default false,
  tanggal         date    not null,
  jam             text    check (jam is null or jam ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  nomor_teks      text,
  atlet_ids       integer[] not null default '{}' check (cardinality(atlet_ids) <= 60),
  isi             text    not null check (char_length(isi) between 10 and 1000),
  foto_path       text,
  akses_id        bigint references public.lapor_akses(id),
  pelapor_nama    text    not null,
  pelapor_wa      text,
  status          text    not null default 'baru' check (status in ('baru','ditangani','selesai','diabaikan')),
  tanggapan       text,
  ditangani_oleh  text,
  ditangani_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.catatan_lapangan is
  'Catatan kejadian dari PIC cabor (aturan/THB, teknis, non-teknis). Ditindaklanjuti KONIDA; bahan bagian III–V laporan cabor.';

create index if not exists catatan_lapangan_antrean_idx
  on public.catatan_lapangan (kontingen_id, status, tanggal);
create index if not exists catatan_lapangan_cabor_idx
  on public.catatan_lapangan (kontingen_id, cabor_id);

alter table public.catatan_lapangan enable row level security;
revoke all on public.catatan_lapangan from anon, authenticated;
