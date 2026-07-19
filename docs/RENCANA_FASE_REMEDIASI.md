# Rencana Fase Remediasi porprov-admin

Status per 2026-07-19. Tujuan: lunasin "hutang" kerjaan kecil dulu, baru masuk renovasi besar (Jenis 2).

> **UPDATE 2026-07-19: Fase A, B, C SELESAI.** Hutang kecil lunas. Sisa = Jenis 2 (proyek besar).

## Peta besar
```
Jenis 1 (auth / nutup bolong)   ████████████████████  SELESAI ✅
Jenis 3 (aturan & data)         ████████████████████  SELESAI ✅ (Fase A+B+C)
Cleanup                         ████████████████████  SELESAI ✅ (non-destruktif)
Jenis 2 (renovasi RLS)          ░░░░░░░░░░░░░░░░░░░░  belum (proyek besar)
```

---

## FASE A — Cleanup ringan  ·  risiko RENDAH  ·  ~1 sesi
Menyelesaikan ekor Jenis 3 + rapi-rapi. Semua additive / non-destruktif, aman buat app live.

- **A1. Fix bug langganan lintas-ruang.** `cabor_subscription` dicocokkan pakai `cabor_id` di ruang `cabor_master`, padahal pemanggil kirim id ruang `cabang_olahraga` → cabor tertentu (mis. Dayung=147) gagal baca tier. Perbaiki lookup (by-nama atau peta kecil). Tes: operator Dayung dapat tier benar.
- **A2. Sinkronkan `is_posted`.** 108 atlet status "Posted" tapi `is_posted=false`. UPDATE sinkron + pastikan alur posting ke depan set dua-duanya (sudah di /api/verifikasi). Tes: hitung ulang = 0 selisih.
- **A3. Tandai/buang data mati.** Tabel `cabor_master`, `cabor_kuota` (lama, ruang beda), `operator_cabor` tak dipanggil kode manapun. Verifikasi sekali lagi lalu dokumentasikan / drop. TIDAK menyentuh `cabang_olahraga` (yang dipakai).

**Definisi selesai Fase A:** Jenis 3 & cleanup lunas kecuali yang nunggu data eksternal (Fase C).

---

## FASE B — Gerbang atlet anti-bypass  ·  risiko SEDANG  ·  ~1 sesi
Bikin gerbang pembuatan atlet benar-benar tak bisa dilewati (bukan cuma imbauan). Ini cicilan PERTAMA Jenis 2, dibatasi ke satu tabel.

- **B1. Alihkan 3 tool import massal ke server.** `konida/export/kabbandung`, `konida/export/kabbogor`, `operator/dayung/data-gateway` masih insert atlet via anon. Bikin route bulk server (service key) + validasi batch (eligibilitas + dedup NIK). 
- **B2. Cabut policy INSERT anon di tabel `atlet`.** Setelah semua penulis lewat server, hapus izin insert anon → satu-satunya jalur bikin atlet = route server tervalidasi.

**Definisi selesai Fase B:** tak ada lagi insert `atlet` dari browser; semua lewat gerbang.

---

## FASE C — Kuota keras  ·  risiko RENDAH  ·  cepat, NUNGGU DATA
- **C1.** Setelah angka `cabor_kuota` resmi PORPROV tersedia & diisi benar, ubah route `/api/atlet/create` dari mode imbau → tolak keras (ganti `quotaWarnings.push` jadi `return 409`). 
- **Blokir:** butuh angka kuota resmi dari user. Sampai itu ada, tetap mode imbau.

---

## Sesudah semua fase di atas → JENIS 2 (proyek terpisah)
Renovasi menyeluruh: pindahkan SEMUA tulisan penting dari browser ke route server, lalu perketat RLS tabel per tabel. Mingguan, direncanakan sendiri, di luar cakupan fase-fase di atas.

---

### Catatan eksekusi
- App LIVE. Tiap fase: kerjakan, tes (mint cookie sesi HMAC utk uji route), baru push (push = deploy 3 project Vercel).
- Urutan disarankan: **A → B → C** (C bisa kapan saja begitu data siap).
