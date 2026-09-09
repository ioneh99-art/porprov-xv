-- 050_kontak_panpel.sql
-- Kontak panitia pelaksana tiap cabor (Technical Delegate, Ketua Panpel,
-- Sekretaris, Bendahara) dari berkas panitia provinsi.
-- Berisi nomor telepon pribadi — hanya lewat rute bergerbang sesi.

create table if not exists public.kontak_panpel (
  id                bigserial primary key,
  pengurus_cabang   text,
  cabor_disiplin    text not null,
  cabor_nama_raw    text,
  td_nama           text, td_hp           text,
  ketua_nama        text, ketua_assignment text, ketua_hp text,
  sekretaris_nama   text, sekretaris_hp   text,
  bendahara_nama    text, bendahara_hp    text,
  sumber            text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint uq_kontak_panpel unique (cabor_disiplin)
);

create index if not exists idx_kontak_panpel_cabor on public.kontak_panpel (cabor_nama_raw);
