# Rencana menutup kebocoran kunci anon

Ditulis 9 September 2026, sesudah audit menyeluruh.

## Masalahnya

Tabel `atlet` punya policy `konida_select_atlet` berisi `USING(true)` untuk
role `public`. Artinya **kunci anon boleh membaca seluruh tabel** — termasuk
NIK, nomor rekening, dan nama bank.

Kunci anon itu tertanam di halaman web (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
Siapa pun bisa mengambilnya dari sumber halaman lalu menarik seluruh data
tanpa menyentuh aplikasi. Dibuktikan langsung:

```
curl -H "apikey: <anon>" ".../rest/v1/atlet?select=nama_lengkap,no_ktp&limit=2"
[{"nama_lengkap":"Saint Thufail Al Intizhar Hanindra","no_ktp":"3277011504090005"}, ...]
```

## Kenapa tidak langsung dicabut

**67 berkas halaman** membaca tabel `atlet` dengan kunci anon. Mencabut policy
itu sekarang mematikan 67 halaman serentak — Dashboard, Data Atlet, Dokumen,
War Room, dan seluruh halaman operator — 49 hari sebelum PORPROV.

## Yang sudah dikerjakan (aman, tidak memutus apa pun)

1. **Tabel `atlet_pii`** — NIK, rekening, nama bank dipindahkan ke wadah
   terisolasi. RLS menyala, nol policy, hak anon dicabut. Diuji: kunci anon
   mendapat `permission denied`. 1.257 baris tersalin.
2. **Pemicu sinkron** — selama kolom lama masih ada, tiap perubahan di tabel
   `atlet` ikut disalin ke `atlet_pii`, supaya datanya tidak bercabang.
3. **Rute `/api/konida/atlet-pii`** — bergerbang sesi, kepemilikan diperiksa
   ulang di server, hanya mengembalikan atlet milik kontingen si pemanggil.

Sampai di sini **kebocorannya masih terbuka**: kolomnya masih ada di tabel
`atlet`. Yang sudah ada adalah jalannya.

## Yang tersisa — dan urutannya

Halaman yang menampilkan NIK harus mengambilnya dari rute baru, bukan dari
tabel `atlet`. Baru sesudah semuanya pindah, kolomnya dibuang.

### Tahap A — halaman Kab. Bandung (yang dipakai sehari-hari)
- `konida/atlet/kabbandung/page.tsx`
- `konida/dokumen/kabbandung/page.tsx`
- `konida/dashboard/kabbandung/page.tsx`
- `konida/export/kabbandung/page.tsx`
- `konida/kualifikasi/kabbandung/page.tsx`
- `konida/laporan/kabbandung/page.tsx`
- `konida/Premiumreport/kabbandung/page.tsx` + `heatmap-cabor`
- `konida/atlet/[id]/page.tsx` + `[id]/edit`
- `konida/atlet/tambah/page.tsx`
- `components/ExportModal.tsx`
- `components/konida/AtletDokumenRowV2.tsx`
- `components/data-quality/QualityDetailModal.tsx`

### Tahap B — kontingen & operator lain
kabbogor, operator dayung, operator pentathlon, dashboard tenant.

### Tahap C — portal atlet
`app/atlet/*` — atlet melihat NIK-nya sendiri; perlu jalur terpisah karena
sesinya beda.

### Tahap D — flip (baru boleh sesudah A, B, C selesai dan diuji)

```sql
alter table public.atlet drop column no_ktp;
alter table public.atlet drop column no_rekening;
alter table public.atlet drop column nama_bank;
drop trigger if exists trg_sinkron_atlet_pii on public.atlet;
```

Sesudah itu, kunci anon masih bisa membaca tabel `atlet` — tapi tidak ada lagi
data pribadi di dalamnya. Menutup policy `USING(true)` sepenuhnya adalah
pekerjaan terpisah dan lebih besar lagi.

## Catatan

Pola ini sama dengan yang sudah terbukti di proyek ini: hash kata sandi dulu
juga bocor lewat grant tabel, dan REVOKE per-kolom tidak mempan; yang berhasil
adalah memindahkannya ke tabel terisolasi (`atlet_auth`, `users_auth`).
