-- 061_lapor_jalur_konida.sql
-- Jalur kedua mengisi hasil cabor: tim KONIDA yang login di dashboard membuka
-- formulir lapor cabor mana pun tanpa kode PIC (untuk cabor yang PIC-nya belum
-- ada atau belum aktif). Hasilnya tetap masuk Antrean menunggu disahkan.
--
-- Mekanisme: satu baris lapor_akses tersembunyi per (kontingen, cabor) berjalur
-- 'konida'. Sidik kodenya acak dan tidak pernah diberikan ke siapa pun, dan rute
-- /api/lapor/masuk menolak baris berjalur 'konida' — jadi baris ini hanya bisa
-- dipakai lewat sesi dashboard yang masih berlaku. Nama pelapor diambil dari sesi
-- dashboard saat itu, bukan dari baris ini.
--
-- Tambahan saja (kolom bernilai bawaan 'pic'): baris dan kode PIC yang sudah ada tidak berubah.

alter table public.lapor_akses add column if not exists jalur text not null default 'pic';

do $$ begin
  alter table public.lapor_akses add constraint lapor_akses_jalur_cek check (jalur in ('pic', 'konida'));
exception when duplicate_object then null; end $$;

create unique index if not exists lapor_akses_konida_satu
  on public.lapor_akses (kontingen_id, cabor_id) where jalur = 'konida';

comment on column public.lapor_akses.jalur is
  'pic = kode lapor PIC dari WhatsApp; konida = pintu tanpa kode untuk tim KONIDA yang login di dashboard (tidak bisa dipakai lewat kode).';
