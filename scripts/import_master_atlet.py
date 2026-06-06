"""
PORPROV XV — Import Master Atlet Kab. Bandung (Demo Setup)
1097 atlet dari rekap KONI → tabel `atlet` (kontingen_id=4)

Fitur:
- Parse NIK → tgl_lahir, kecamatan, kode_asal_daerah
- Validasi gender (cross-check NIK vs rekap)
- bcrypt password = 4 digit terakhir NIK (sesuai sistem porprov)
- Auto-set portal_aktif=true, is_public=true (siap demo)
- Upsert by no_ktp (skip kalau sudah ada)
- Auto-link cabor_id dari nama cabor (kalau tabel cabang_olahraga ada)

Cara pakai:
  pip install supabase bcrypt
  python import_master_atlet.py --dry-run     # preview 10 record
  python import_master_atlet.py --commit       # eksekusi full import
"""
import os
import argparse
import bcrypt
import pandas as pd
from datetime import date
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
KONTINGEN_ID = int(os.environ.get("KONTINGEN_ID_BANDUNG", "0"))

SRC_XLSX = "data/0rekap.xlsx"


def parse_nik(nik: str):
    """Extract info dari NIK 16-digit Indonesia.
    Return dict dengan field. Kalau parse fail, return dict dengan fallback values + 'invalid' flag.
    """
    s = str(nik).strip().replace(" ", "")
    fallback = {
        "tgl_lahir": "1990-01-01",  # Default fallback
        "gender_nik": None,
        "kode_provinsi": None,
        "kode_kabupaten": None,
        "kode_kecamatan": None,
        "kode_wilayah": s[0:6] if len(s) >= 6 else None,
        "invalid": True,
        "reason": None,
    }

    if len(s) != 16 or not s.isdigit():
        fallback["reason"] = f"NIK bukan 16 digit angka: {s}"
        return fallback

    try:
        kode_provinsi  = s[0:2]
        kode_kabupaten = s[2:4]
        kode_kecamatan = s[4:6]
        kode_wilayah   = s[0:6]

        dd = int(s[6:8])
        mm = int(s[8:10])
        yy = int(s[10:12])

        gender_nik = "P" if dd > 40 else "L"
        day_real = dd - 40 if dd > 40 else dd
        year_full = 2000 + yy if yy < 30 else 1900 + yy
        tgl_lahir = date(year_full, mm, day_real)

        return {
            "tgl_lahir": tgl_lahir.isoformat(),
            "gender_nik": gender_nik,
            "kode_provinsi": kode_provinsi,
            "kode_kabupaten": kode_kabupaten,
            "kode_kecamatan": kode_kecamatan,
            "kode_wilayah": kode_wilayah,
            "invalid": False,
            "reason": None,
        }
    except (ValueError, IndexError) as e:
        fallback["reason"] = f"Tgl invalid di NIK {s}: {str(e)[:50]}"
        # Try to extract wilayah info anyway
        fallback["kode_provinsi"]  = s[0:2]
        fallback["kode_kabupaten"] = s[2:4]
        fallback["kode_kecamatan"] = s[4:6]
        fallback["kode_wilayah"]   = s[0:6]
        return fallback


def normalize_gender(g: str) -> str:
    """LAKI-LAKI → L, PEREMPUAN → P"""
    g = str(g).strip().upper()
    if "LAKI" in g and "PEREM" not in g: return "L"
    if "PEREM" in g or "WANITA" in g:    return "P"
    return g[0] if g else None


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")


def fetch_cabor_lookup(sb):
    """Bangun mapping nama cabor (upper) → cabor_id."""
    try:
        res = sb.table("cabang_olahraga").select("id, nama").execute()
        return {row["nama"].upper().strip(): row["id"] for row in res.data}
    except Exception as e:
        print(f"⚠️  Gagal load cabor lookup ({e}) — cabor_id akan NULL, pakai cabor_nama_raw")
        return {}


def fetch_existing_atlet(sb, kontingen_id=None):
    """Dict no_ktp → {id, kontingen_id, nama_lengkap} GLOBAL.
    Karena `atlet_no_ktp_key` itu UNIQUE global, kita harus cek lintas kontingen.
    Pagination untuk handle Supabase default limit 1000.
    """
    existing = {}
    page_size = 1000
    offset = 0
    while True:
        res = sb.table("atlet") \
            .select("id, no_ktp, kontingen_id, nama_lengkap") \
            .range(offset, offset + page_size - 1) \
            .execute()
        batch = res.data or []
        for row in batch:
            if row.get("no_ktp"):
                existing[row["no_ktp"]] = row
        if len(batch) < page_size:
            break
        offset += page_size
    return existing


def build_record(row, kontingen_id, cabor_lookup):
    """Bangun 1 record atlet siap insert. Always returns (record, warning_list)."""
    nik = str(row["NOMOR KTP"]).strip()
    nik_info = parse_nik(nik)
    warnings = []

    if nik_info["invalid"]:
        warnings.append(f"NIK_INVALID: {nik_info['reason']} → pakai default tgl_lahir 1990-01-01")

    gender_rekap = normalize_gender(row["GENDER"])
    gender_nik = nik_info["gender_nik"]
    # Prioritas: gender_rekap (sumber resmi), fallback ke gender_nik
    gender_final = gender_rekap or gender_nik or "L"

    if gender_nik and gender_rekap and gender_nik != gender_rekap:
        warnings.append(f"GENDER_MISMATCH: rekap={gender_rekap}, nik={gender_nik} → pakai rekap")

    cabor_nama = str(row["CABANG OLAHRAGA"]).strip()
    cabor_id = cabor_lookup.get(cabor_nama.upper())

    pwd_plain = nik[-4:] if len(nik) >= 4 else "1234"
    pwd_hash = hash_password(pwd_plain)

    record = {
        "kontingen_id": kontingen_id,
        "no_ktp": nik,
        "nama_lengkap": str(row["NAMA LENGKAP"]).strip(),
        "gender": gender_final,
        "tgl_lahir": nik_info["tgl_lahir"],
        "cabor_id": cabor_id,
        "cabor_nama_raw": cabor_nama,
        "kode_asal_daerah": nik_info["kode_wilayah"],
        "nama_asal_daerah": str(row["KONTINGEN"]).strip(),
        "no_registrasi_koni": int(row["ID"]) if pd.notna(row.get("ID")) else None,
        "atlet_password_hash": pwd_hash,
        "portal_aktif": True,
        "is_public": True,
        "status_kontingen": "Atlet",
        "status_registrasi": "Verified",
        "status_verifikasi": "Verified",
    }
    return record, warnings


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true", help="Preview 10 record")
    p.add_argument("--commit",  action="store_true", help="Eksekusi full import")
    p.add_argument("--source",  default=SRC_XLSX)
    args = p.parse_args()

    if not (args.dry_run or args.commit):
        print("Pakai --dry-run atau --commit"); return
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: Set SUPABASE_URL + SUPABASE_SERVICE_KEY"); return
    if not KONTINGEN_ID:
        print("ERROR: Set KONTINGEN_ID_BANDUNG"); return
    if not os.path.exists(args.source):
        print(f"ERROR: File source ga ada: {args.source}"); return

    df = pd.read_excel(args.source)
    df = df.drop(columns=["Unnamed: 7"], errors="ignore")
    print(f"📂 Loaded {len(df)} atlet dari {args.source}")
    print(f"🎯 Target kontingen_id={KONTINGEN_ID} (Kab. Bandung)")
    print(f"📝 Mode: {'DRY-RUN' if args.dry_run else 'COMMIT'}\n")

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    cabor_lookup = fetch_cabor_lookup(sb)
    existing = fetch_existing_atlet(sb, KONTINGEN_ID)
    print(f"📚 Cabor lookup loaded: {len(cabor_lookup)} cabor")
    print(f"📚 Existing atlet di kontingen ini: {len(existing)}\n")

    stats = {"inserted": 0, "updated": 0, "skipped_invalid": 0,
             "warnings": 0, "errors": 0}
    warnings_list = []
    errors_list = []

    if args.dry_run:
        sample = df.head(10)
        print("=" * 80)
        print("PREVIEW 10 RECORD PERTAMA:")
        print("=" * 80)
        for idx, row in sample.iterrows():
            record, warns = build_record(row, KONTINGEN_ID, cabor_lookup)
            cabor_status = f"id={record['cabor_id']}" if record['cabor_id'] else "NULL (pakai raw)"
            print(f"  ✓ [{idx}] {record['nama_lengkap']}")
            print(f"      NIK     : {record['no_ktp']}")
            print(f"      Lahir   : {record['tgl_lahir']}  Gender: {record['gender']}")
            print(f"      Cabor   : {record['cabor_nama_raw']} ({cabor_status})")
            print(f"      Password: {str(row['NOMOR KTP'])[-4:]} (di-hash)")
            for w in warns: print(f"      ⚠️  {w}")
            print()

        # Validate all records
        print("=" * 80)
        print("VALIDASI SEMUA RECORD:")
        print("=" * 80)
        n_will_insert = 0
        n_will_update = 0
        n_will_conflict = 0  # NIK ada di kontingen lain
        n_invalid_nik = 0
        n_warnings = 0
        conflicts_sample = []

        for idx, row in df.iterrows():
            nik = str(row["NOMOR KTP"]).strip()
            record, warns = build_record(row, KONTINGEN_ID, cabor_lookup)
            for w in warns:
                if w.startswith("NIK_INVALID"):
                    n_invalid_nik += 1
                else:
                    n_warnings += 1

            if nik in existing:
                ex = existing[nik]
                if ex["kontingen_id"] == KONTINGEN_ID:
                    n_will_update += 1
                else:
                    n_will_conflict += 1
                    if len(conflicts_sample) < 10:
                        conflicts_sample.append(
                            f"NIK={nik} | {record['nama_lengkap']} (rekap) vs "
                            f"{ex['nama_lengkap']} (kontingen_id={ex['kontingen_id']})"
                        )
            else:
                n_will_insert += 1

        print(f"\n📊 PREDIKSI HASIL:")
        print(f"   ✅ Akan diinsert (NIK baru)        : {n_will_insert}")
        print(f"   🔄 Akan diupdate (di kontingen 4) : {n_will_update}")
        print(f"   ⚔️  KONFLIK (NIK di kontingen lain): {n_will_conflict}")
        print(f"   📛 NIK invalid (pakai fallback tgl): {n_invalid_nik}")
        print(f"   ⚠️  Total warnings                : {n_warnings}")
        if conflicts_sample:
            print(f"\n   Sample konflik NIK lintas-kontingen:")
            for c in conflicts_sample: print(f"     • {c}")
        print(f"\n🔍 Run dengan --commit kalau hasil prediksi udah OK")
        print(f"   (Konflik lintas-kontingen akan di-SKIP default, di-log ke conflicts.csv)")
        return

    # ========== COMMIT MODE ==========
    print("🚀 START IMPORT (UPSERT + per-row error isolation)...\n")

    conflicts_log = []   # NIK exists di kontingen lain
    success_count = 0

    for idx, row in df.iterrows():
        nik = str(row["NOMOR KTP"]).strip()
        record, warns = build_record(row, KONTINGEN_ID, cabor_lookup)
        if warns:
            stats["warnings"] += 1
            for w in warns:
                if w.startswith("NIK_INVALID"):
                    stats["skipped_invalid"] += 1

        progress = f"[{idx+1:>4}/{len(df)}]"
        nama_short = record['nama_lengkap'][:35]

        # Skenario 1: NIK udah ada di kontingen ini → UPDATE
        if nik in existing:
            ex = existing[nik]
            if ex["kontingen_id"] == KONTINGEN_ID:
                try:
                    payload = {k: v for k, v in record.items() if k != "atlet_password_hash"}
                    sb.table("atlet").update(payload).eq("id", ex["id"]).execute()
                    stats["updated"] += 1
                    if (idx + 1) % 50 == 0:
                        print(f"  🔄 {progress} updated {nama_short}")
                except Exception as e:
                    stats["errors"] += 1
                    print(f"  ✗ {progress} UPDATE fail {nama_short}: {str(e)[:80]}")
            else:
                # Skenario 2: NIK di kontingen LAIN → log konflik, jangan timpa
                conflicts_log.append({
                    "nik": nik,
                    "nama_rekap": record["nama_lengkap"],
                    "cabor_rekap": record["cabor_nama_raw"],
                    "nama_db": ex["nama_lengkap"],
                    "kontingen_id_db": ex["kontingen_id"],
                })
                if len(conflicts_log) <= 5 or len(conflicts_log) % 20 == 0:
                    print(f"  ⚔️  {progress} KONFLIK {nama_short} | "
                          f"NIK udah di kontingen {ex['kontingen_id']} sbg '{ex['nama_lengkap']}'")
        else:
            # Skenario 3: NIK baru → INSERT
            try:
                sb.table("atlet").insert(record).execute()
                stats["inserted"] += 1
                success_count += 1
                if success_count % 50 == 0:
                    print(f"  ✓ {progress} inserted {nama_short} (total inserted: {stats['inserted']})")
            except Exception as e:
                stats["errors"] += 1
                print(f"  ✗ {progress} INSERT fail {nama_short}: {str(e)[:80]}")

    # Export konflik ke CSV biar bisa di-review user
    if conflicts_log:
        import csv
        conflict_file = "conflicts_nik_lintas_kontingen.csv"
        with open(conflict_file, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=conflicts_log[0].keys())
            w.writeheader()
            w.writerows(conflicts_log)
        print(f"\n📁 Konflik NIK lintas-kontingen disimpan ke: {conflict_file}")

    print()
    print("=" * 60)
    print("=== HASIL IMPORT ===")
    print(f"   ✅ Inserted (baru)         : {stats['inserted']}")
    print(f"   🔄 Updated (kontingen 4)   : {stats['updated']}")
    print(f"   ⚔️  Konflik (kontingen lain): {len(conflicts_log)}")
    print(f"   📛 NIK invalid (fallback)  : {stats['skipped_invalid']}")
    print(f"   ⚠️  Total warnings         : {stats['warnings']}")
    print(f"   🔥 Errors                  : {stats['errors']}")
    print()
    if conflicts_log:
        print(f"⚠️  {len(conflicts_log)} atlet TIDAK terimport karena NIK-nya udah ada di kontingen lain.")
        print(f"   Cek file conflicts_nik_lintas_kontingen.csv buat review manual.")
        print(f"   Kalau yakin atlet ini benar Kab. Bandung, manual update kontingen_id di Supabase.")
    print()
    print("🎉 Next step: jalanin match_and_import.py buat link data tes fisik!")


if __name__ == "__main__":
    main()
