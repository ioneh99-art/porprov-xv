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

### Fase 1 — Quick Wins ✅ SELESAI 2026-06-29
- [x] 1.1 Auto-sync `riwayat_kejuaraan` (migration 010) — trigger + backfill. Koreksi: `nomor_lomba`, `status='Verified'`, `tingkat='nasional'`. Suci EMAS auto-tercatat.
- [x] 1.2 Achievement Banner (migration 011 view + API + komponen) → ke-colok di dossier atlet
- [x] 1.4 Press Release → **pakai fitur existing `/operator/content/press`** (AI + tone, lebih bagus dari docx brief). Tidak dibangun ulang.
- ~~1.3 Telegram~~ ❌ SKIP

### Fase 2 — System Upgrades (4 fitur)
- [x] 2.5 Recalibration engine (migration 012 + lib `medal-prediction/recalibrate.ts` + cron `/api/cron/medal-recalibration` 02:00 + runner). Suci `{0,0,0}`→`{36/32/32}`. 50 atlet ber-baseline ke-recompute.
- [x] 2.6 Multi-discipline projection (migration 013: discipline_family + mark_to_seconds + RPC project_athlete_performance) + API + komponen → dossier. Suci 10K→20K = 2:10:10 (HIGH).
- [x] 2.7 Refresh pesaing (API TS /api/konida/refresh-pesaing + tombol → dossier). Pendekatan diperbaiki: lawan di nomor kejurnas yg sama. Suci: Violine Intan(2022) → Resti PERAK dkk.
- [x] 2.8 SIPA AI sadar konteks kejurnas → blok "PRESTASI KEJURNAS NASIONAL TERBARU" disuntik ke getDBContext (api/sipa) + instruksi prompt

### Fase 3 — Strategic (4 fitur)
- [x] 3.9 Laporan Bupati kuartalan → API agregat + page print-friendly `/konida/Premiumreport/kabbandung/bupati` (in-app, BUKAN docx) + sidebar. Atlet andalan + proyeksi PORPROV.
- [ ] 3.10 Halaman publik atlet `/atlet/[slug]` + OG image (`@vercel/og`)
- [x] 3.11 Talent Lobby (migration 015: talent_lobby_candidates + audit_log + view v_talent_lobby_jabar) + API flag (audit, actor dari cookie) + page + sidebar. Warning sensitif.
- [x] 3.12 Cycle tracker (migration 014: atlet_competition_cycle + auto-populate dari kejurnas) + komponen CompetitionTimeline → dossier

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
