-- 075: Jalur Cepat medali (keputusan Bos, 7 Nov 2026).
-- Superadministrator memasukkan medali dari info grup KONI Kab. → langsung disahkan,
-- bertanda "menunggu PIC". Laporan PIC yang sama kemudian menjadi validasinya.
--   validasi            : null = laporan biasa; 'menunggu_pic' | 'tervalidasi' | 'bentrok' (hanya di baris jalur cepat)
--   validasi_laporan_id : laporan PIC yang memvalidasi / yang bentrok (di baris jalur cepat)
--   validasi_oleh       : nama PIC / pemutus yang memvalidasi
--   validasi_at         : kapan
--   memvalidasi_id      : di baris PIC — medali jalur cepat yang ia validasi (baris PIC itu sendiri
--                         tidak dihitung lagi: status 'ditolak' beralasan "Menjadi validasi …")
alter table public.laporan_hasil
  add column if not exists validasi text,
  add column if not exists validasi_laporan_id bigint references public.laporan_hasil(id) on delete set null,
  add column if not exists validasi_oleh text,
  add column if not exists validasi_at timestamptz,
  add column if not exists memvalidasi_id bigint references public.laporan_hasil(id) on delete set null;

alter table public.laporan_hasil drop constraint if exists laporan_hasil_validasi_check;
alter table public.laporan_hasil add constraint laporan_hasil_validasi_check
  check (validasi is null or validasi in ('menunggu_pic', 'tervalidasi', 'bentrok'));

create index if not exists laporan_hasil_validasi_idx on public.laporan_hasil (kontingen_id, validasi) where validasi is not null;
