-- 048_jadwal_cabor.sql
-- Jadwal resmi PORPROV XV: kapan dan di mana tiap cabor bertanding.
--
-- Latar: sistem selama ini tahu SIAPA atletnya, tapi tidak tahu kapan mereka
-- turun. Semua hitung mundur memakai satu tanggal umum, padahal pertandingan
-- pertama 28 Oktober — sepuluh hari sebelum upacara pembukaan 7 November —
-- dan ada 17 cabor yang sudah bertanding sebelum PORPROV resmi dibuka.
-- Tanpa tabel ini, ketujuh belas cabor itu tidak terlihat di mana pun.
--
-- CATATAN NAMA: tabel "jadwal_pertandingan" SUDAH ADA di basis data ini,
-- kosong, dan berbentuk lain — jadwal per nomor pertandingan (nomor_id,
-- waktu_mulai, venue_id, fase). Itu granularitas yang berbeda: per partai.
-- Tabel ini per CABOR, rentang beberapa hari. Sengaja dinamai lain supaya
-- keduanya tidak saling menimpa.
--
-- Penautan ke cabor lewat cabor_nama_raw, bukan cabor_id: penomoran cabor di
-- aplikasi ini berbeda antar tabel (Dayung 147 di tabel atlet, 2 di
-- cabor_master) sehingga tidak bisa dijadikan sandaran.
--
-- Satu cabor bisa punya banyak baris: Dayung lima (Canoeing, Canoeing-Slalom,
-- Rowing, Rowing-Beach, DBR), Akuatik lima, Senam tiga.

create table if not exists public.jadwal_cabor (
  id              bigserial primary key,
  jenis           text not null default 'pertandingan'
                  check (jenis in ('pertandingan', 'upacara')),
  wilayah         text,
  tuan_rumah      text,
  cabor_disiplin  text not null,     -- nama apa adanya di berkas jadwal
  cabor_nama_raw  text,              -- terjemahan ke nama cabor sistem; null = belum ketemu
  mulai           date,
  selesai         date,
  venue           text,
  akomodasi       text,              -- kota tempat kontingen menginap
  contact_person  text,
  catatan         text,
  sumber          text,              -- berkas asal, supaya bisa ditelusuri
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Satu baris dikenali dari disiplin + tanggal mulai + venue, supaya impor
-- ulang berkas yang sama tidak menggandakan isinya.
--
-- NULLS NOT DISTINCT dipakai dengan sengaja: tanpa itu Postgres menganggap
-- dua baris ber-tanggal kosong sebagai berbeda, sehingga impor berulang malah
-- menggandakan baris yang justru paling rawan. Kunci kolom polos (bukan
-- coalesce) supaya upsert bisa menyebutnya lewat ON CONFLICT.
alter table public.jadwal_cabor
  add constraint uq_jadwal_cabor_baris
  unique nulls not distinct (cabor_disiplin, mulai, venue);

create index if not exists idx_jadwal_cabor_nama  on public.jadwal_cabor (cabor_nama_raw);
create index if not exists idx_jadwal_cabor_mulai on public.jadwal_cabor (mulai);

comment on table public.jadwal_cabor is
  'Jadwal PORPROV XV 2026 per cabor (rentang hari). Berbeda dari jadwal_pertandingan yang per nomor/partai.';
comment on column public.jadwal_cabor.cabor_nama_raw is
  'Nama cabor di sistem. Null = belum ketemu padanannya, entah karena Kab. Bandung tidak ikut atau namanya belum dikenali.';

-- Ringkasan per cabor: rentang tanggal digabung dari semua disiplinnya.
create or replace view public.v_jadwal_cabor as
select
  cabor_nama_raw,
  count(*)                            as jumlah_nomor,
  min(mulai)                          as mulai_paling_awal,
  max(selesai)                        as selesai_paling_akhir,
  min(tuan_rumah)                     as tuan_rumah,
  string_agg(distinct venue, ' | ')   as venue,
  string_agg(distinct wilayah, ' | ') as wilayah
from public.jadwal_cabor
where jenis = 'pertandingan' and cabor_nama_raw is not null
group by cabor_nama_raw;

alter view public.v_jadwal_cabor set (security_invoker = true);
