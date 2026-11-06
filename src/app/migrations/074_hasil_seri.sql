-- 074: hasil laga 'seri' (imbang di babak pool/penyisihan; tim masih bertanding).
-- Sebelumnya PIC terpaksa memilih "Menang" untuk laga 1–1 (laporan #217 Hockey Indoor).
alter table public.laporan_hasil drop constraint if exists laporan_hasil_hasil_check;
alter table public.laporan_hasil add constraint laporan_hasil_hasil_check
  check (hasil in ('emas','perak','perunggu','peringkat','menang','kalah','seri','lolos','gugur'));
