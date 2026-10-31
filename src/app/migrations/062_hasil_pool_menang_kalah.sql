-- 062: hasil laga babak pool/penyisihan — 'menang' dan 'kalah' (tim masih bertanding).
-- Sebab: pilihan lama hanya emas/perak/perunggu/peringkat/lolos/gugur, sehingga PIC
-- yang kalah di pool terpaksa memilih "lolos" dan halaman publik menulis "LOLOS!".
-- Keduanya BELUM FINAL (seperti 'lolos'): tidak menambah medali/laga selesai.
alter table public.laporan_hasil drop constraint laporan_hasil_hasil_check;
alter table public.laporan_hasil add constraint laporan_hasil_hasil_check
  check (hasil in ('emas','perak','perunggu','peringkat','menang','kalah','lolos','gugur'));
