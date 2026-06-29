# KBAAS — SCOPE LOCK

**Status:** 🔒 LOCKED (disepakati 2026-06-29) · belum dieksekusi
**Tenant:** `kontingen_id = 4` (KAB. BANDUNG) — **CANONICAL**, terverifikasi DB live
**Trigger case:** Suci Lestari (atlet `1927`, cabor Atletik id=10), EMAS 10.000m Race Walk U20, 29 Jun 2026
**Sumber:** `BRIEF_PIPELINE_WATCH.md` + `BRIEF_KBAAS_MASTER.md` + `MASTER_EXECUTION_GUIDE.md`

## Prinsip
KBAAS = **lapisan tambahan (add-on)** di atas sistem Kab. Bandung yang SUDAH matang.
Integrasikan ke halaman/komponen existing bila ada; bangun net-new hanya bila perlu.
**JANGAN** pakai path mentah brief (`src/features/...`, `app/(operator)/...`) — sesuaikan ke struktur repo (`src/app/...`, `src/components/konida/...`).

## ❌ DIKELUARKAN dari scope
- **1.3 Telegram alert** — beserta tabel `telegram_chat_subscriptions` + `telegram_notification_log`, lib sender, `/api/notifications/medal-alert`, cron `*/5`, dan setup chat_id manual.
  - Fungsi "ngabarin KONI" tetap via **Achievement Banner + in-app notif badge** (sudah ada).

## ✅ SCOPE TERKUNCI — 15 fitur, 4 fase (urut wajib 0→1→2→3)

### Fase 0 — Pipeline Watch ✅ SELESAI 2026-06-29
- [x] Migration `009_pipeline_watch.sql`: `pg_trgm` + tabel `event_kejurnas_results` (+ index + RLS) + RPC `match_atlet_fuzzy` + view `v_pipeline_watch_jabar` (adapted: cabang_olahraga, no auth.uid)
- [x] Seed 4 atlet Kab Bandung (Suci EMAS dkk) — terverifikasi
- [x] Script `import_kejurnas.ts` + bulk import 164 entri (160 inserted)
- [x] **Koreksi keamanan:** auto-match LOW/MEDIUM di-unlink (false-positive), suggestion disimpan di `link_notes`. Hanya 4 confirmed + 1 medali (Suci) yg ter-link.
- [x] API `/api/konida/pipeline-watch` (service-key) + Page `/konida/pipeline-watch/kabbandung` + sidebar (Command Center, ikon Radar)
- TODO lanjutan: UI linking manual utk 17 suggestion pending (opsional, bisa di Fase 2)

### Fase 1 — Quick Wins (3 fitur, mayoritas "tinggal colok")
- [ ] 1.1 Auto-sync `riwayat_kejuaraan` — trigger + backfill. **Pakai koreksi skema:** kolom `nomor_lomba` (bukan `nomor`); TAMBAH `medali`,`sumber_data`,`source_event_kejurnas_id`,`auto_synced`; auto-entry `status='APPROVED'`. Colok ke modul kejuaraan/kabbandung existing.
- [ ] 1.2 Achievement Banner + view `v_atlet_recent_achievements` → colok ke **dossier atlet** `performance/kabbandung/[cabor_slug]/[atlet_id]`
- [ ] 1.4 Press Release generator (docx) → **rekonsiliasi dgn `operator/content/press` yang sudah ada** (hindari duplikat)
- ~~1.3 Telegram~~ ❌ SKIP

### Fase 2 — System Upgrades (4 fitur)
- [ ] 2.5 Recalibration engine prediksi medali (colok ke `atlet_baseline_performance`, filter `is_latest=TRUE`) + **cron harian 02:00** (`CRON_SECRET`)
- [ ] 2.6 Multi-discipline projection — tabel `discipline_family` + RPC + komponen → dossier
- [ ] 2.7 Refresh pesaing — view + RPC + tombol (field `pesaing` sudah ada)
- [ ] 2.8 SIPA AI sadar konteks kejurnas → suntik ke SIPA AI existing (`api/sipa`)

### Fase 3 — Strategic (4 fitur) — boleh ditunda/dievaluasi belakangan
- [ ] 3.9 Laporan Bupati kuartalan → extend `Premiumreport/kabbandung` / `warroom/kabbandung`
- [ ] 3.10 Halaman publik atlet `/atlet/[slug]` + OG image (`@vercel/og`)
- [ ] 3.11 Talent Lobby (SENSITIF — wajib audit trail)
- [ ] 3.12 Cycle tracker multi-tahun — tabel `atlet_competition_cycle`

## Prasyarat manual (sisa)
- `CRON_SECRET` di `.env.local` + Vercel (untuk cron recalibration Fase 2)
- npm: `docx`, `@vercel/og`
- File Excel kejurnas → **SUDAH disiapkan user**
- Vercel cron: **1 job** (recalibration) — bukan 2 (telegram dicoret)

## Verifikasi DB (sudah dicek, akurat)
- `event_kejurnas_results` belum ada · `pg_trgm` belum aktif → sesuai Fase 0
- `riwayat_kejuaraan`: punya `nomor_lomba`, TIDAK punya `medali` → koreksi brief valid
- `atlet_baseline_performance`: ada `is_latest`,`lower_is_better`,`medal_probability`,`gap_percentage`,`pesaing` → koreksi #4 valid
- Suci Lestari (1927) di kontingen 4, 0 entry `riwayat_kejuaraan` (target Fase 1.1 = 1 entry EMAS)
