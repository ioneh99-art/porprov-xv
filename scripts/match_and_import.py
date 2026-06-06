"""
PORPROV XV — Match & Import Tes Fisik v3 (Smart Hybrid)
Pakai manual mapping dari Excel user (182 valid + 150 saran + 33 unfound)
ditambah fuzzy fallback buat record yang gak di-cover.

Tahap matching:
1. Manual exact mapping dari Excel `Analisis_Pemetaan_Data_Atlet.xlsx`
2. Fuzzy match by nama + cabor + gender (untuk yang skip excel mapping)
3. Sisanya → staging unmatched (review manual)

Cara pakai:
  python match_and_import_v3.py --dry-run
  python match_and_import_v3.py --commit
"""
import os
import json
import argparse
import unicodedata
import pandas as pd
from rapidfuzz import fuzz, process
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

# Target kontingen — priority: TARGET > BOGOR > BANDUNG (fallback backward compat)
KONTINGEN_ID = int(
    os.environ.get("KONTINGEN_ID_TARGET")
    or os.environ.get("KONTINGEN_ID_BOGOR")
    or os.environ.get("KONTINGEN_ID_BANDUNG")
    or "0"
)
KONTINGEN_LABEL = (
    "TARGET" if os.environ.get("KONTINGEN_ID_TARGET")
    else "BOGOR (demo)" if os.environ.get("KONTINGEN_ID_BOGOR")
    else "BANDUNG" if os.environ.get("KONTINGEN_ID_BANDUNG")
    else "(none)"
)

SRC_JSON         = "data/tes_fisik_kab_bandung_2026.json"
SRC_MAPPING_XLSX = "data/Analisis_Pemetaan_Data_Atlet.xlsx"
THRESHOLD_AUTO   = 88
THRESHOLD_REVIEW = 75


def normalize(s):
    if not s: return ""
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode("ascii")
    return " ".join(s.lower().split())


def cabor_match(a, b):
    if not a or not b: return False
    a, b = normalize(a), normalize(b)
    if a == b: return True
    ta, tb = set(a.split()), set(b.split())
    return len(ta & tb) >= 1 and (a in b or b in a or fuzz.token_sort_ratio(a, b) >= 78)


def load_manual_mapping(path):
    """Load mapping dari Excel user.
    Returns dict: {normalized_name_pdf: 'EXACT_MATCH'|'NOT_FOUND'|'SUGGESTIONS:...'}
    """
    if not os.path.exists(path):
        return {}, {}

    sheets = pd.read_excel(path, sheet_name=None)
    exact_map = {}        # nama_pdf → nama_master_exact
    suggestion_map = {}   # nama_pdf → list of suggestion names

    if "Valid - Siap Import" in sheets:
        df = sheets["Valid - Siap Import"]
        for _, row in df.iterrows():
            nama_pdf = normalize(row.get("NAMA_DI_LAPORAN"))
            if nama_pdf:
                # In "valid" sheet, the master name equals the PDF name (exact match)
                exact_map[nama_pdf] = str(row.get("NAMA_DI_LAPORAN")).strip()

    if "Anomali - Butuh Review" in sheets:
        df = sheets["Anomali - Butuh Review"]
        for _, row in df.iterrows():
            nama_pdf = normalize(row.get("NAMA_DI_LAPORAN"))
            saran = str(row.get("SARAN_PENCOCOKAN_REKAP", "")).strip()
            if not nama_pdf or saran == "Tidak Ditemukan" or not saran:
                continue
            suggestions = [s.strip() for s in saran.split(",") if s.strip()]
            suggestion_map[nama_pdf] = suggestions

    return exact_map, suggestion_map


def fetch_atlet_pool(supabase, kontingen_id):
    res = supabase.table("atlet") \
        .select("id, nama_lengkap, gender, cabor_id, cabor_nama_raw, no_ktp") \
        .eq("kontingen_id", kontingen_id) \
        .execute()
    return res.data


def find_in_pool_by_name(pool, target_name):
    """Cari atlet dengan nama exact match di pool."""
    norm_target = normalize(target_name)
    candidates = [a for a in pool if normalize(a["nama_lengkap"]) == norm_target]
    return candidates


def find_match(record, pool, exact_map, suggestion_map):
    """Returns (matched_atlet, method, score, candidates)"""
    nama = record.get("nama") or ""
    nama_norm = normalize(nama)
    cabor = record.get("cabor") or ""
    jk = record.get("jenis_kelamin")

    # ── TIER 1: Excel exact mapping ──
    if nama_norm in exact_map:
        candidates = find_in_pool_by_name(pool, exact_map[nama_norm])
        if candidates:
            # Filter by gender if multiple
            same_gender = [a for a in candidates if a["gender"] == jk] if jk else candidates
            pick = same_gender[0] if same_gender else candidates[0]
            return pick, "excel_exact", 1.0, []

    # ── TIER 2: Excel suggestions (try each suggested name) ──
    if nama_norm in suggestion_map:
        for suggestion in suggestion_map[nama_norm]:
            candidates = find_in_pool_by_name(pool, suggestion)
            if candidates:
                # Multiple? pick by cabor first, then gender
                for c in candidates:
                    if cabor_match(c.get("cabor_nama_raw", ""), cabor):
                        return c, "excel_suggestion", 0.92, []
                # No cabor match, fallback to gender
                same_gender = [a for a in candidates if a["gender"] == jk] if jk else candidates
                if same_gender:
                    return same_gender[0], "excel_suggestion_no_cabor", 0.85, []

    # ── TIER 3: Direct exact in pool (case insensitive) ──
    direct = find_in_pool_by_name(pool, nama)
    if direct:
        same_gender = [a for a in direct if a["gender"] == jk] if jk else direct
        pick = same_gender[0] if same_gender else direct[0]
        if cabor_match(pick.get("cabor_nama_raw", ""), cabor):
            return pick, "direct_exact", 1.0, []
        return pick, "direct_exact_diff_cabor", 0.9, []

    # ── TIER 4: Fuzzy fallback ──
    gender_pool = [a for a in pool if a["gender"] == jk] if jk else pool
    if not gender_pool:
        return None, "no_pool", 0.0, []

    choices = {a["id"]: normalize(a["nama_lengkap"]) for a in gender_pool}
    results = process.extract(nama_norm, choices, scorer=fuzz.token_sort_ratio, limit=5)
    if not results:
        return None, "no_results", 0.0, []

    top_score = results[0][1]
    cand_list = [
        {"atlet_id": r[2],
         "nama": next(a["nama_lengkap"] for a in gender_pool if a["id"] == r[2]),
         "cabor": next(a.get("cabor_nama_raw") for a in gender_pool if a["id"] == r[2]),
         "score": r[1]}
        for r in results
    ]

    if top_score >= THRESHOLD_AUTO:
        top_atlet = next(a for a in gender_pool if a["id"] == results[0][2])
        if cabor_match(top_atlet.get("cabor_nama_raw", ""), cabor):
            return top_atlet, "fuzzy_auto", top_score / 100, cand_list

    if top_score >= THRESHOLD_REVIEW:
        return None, "review_needed", top_score / 100, cand_list

    return None, "unmatched", top_score / 100, cand_list


def import_tes(sb, atlet_id, record, kontingen_id, method, score):
    header = {
        "atlet_id": atlet_id,
        "kontingen_id": kontingen_id,
        "nama_atlet": record["nama"],
        "cabor_nama": record.get("cabor"),
        "jenis_kelamin": record.get("jenis_kelamin"),
        "berat_badan": record.get("berat_badan"),
        "tinggi_badan": record.get("tinggi_badan"),
        "bmi": record.get("bmi") if record.get("bmi") and record.get("bmi") > 0 else None,
        "tanggal_tes": "2026-04-11",
        "tahap": 3,
        "lokasi_tes": "Gedung Gymnasium SOR Si Jalak Harupat, Kab. Bandung",
        "lembaga_penguji": "FPOK Universitas Pendidikan Indonesia",
        "sumber_data": "Laporan Tes Biomotorik 2026 - UPI Sport Science",
        "penanggung_jawab": "Prof. Agus Rusdiana, M.A., Ph.D.",
        "kesimpulan_persen": record.get("kesimpulan_persen"),
        "kesimpulan_kategori": record.get("kesimpulan_kategori"),
        "status_tes": record.get("status_tes", "Hadir"),
        "matching_method": method,
        "matching_score": round(score, 3),
    }
    res = sb.table("atlet_tes_fisik").insert(header).execute()
    tes_id = res.data[0]["id"]
    items = record.get("items", [])
    if items:
        rows = [{
            "tes_fisik_id": tes_id, "no_urut": it["no"], "komponen": it["komponen"],
            "item_tes": it["item_tes"], "hasil_nilai": it["hasil_nilai"], "hasil_satuan": it["hasil_satuan"],
            "norma_nilai": it["norma_nilai"], "norma_satuan": it["norma_satuan"],
            "capaian_persen": it["capaian_persen"], "kategori": it["kategori"],
        } for it in items]
        sb.table("atlet_tes_fisik_item").insert(rows).execute()
    return tes_id


def stage_unmatched(sb, record, kontingen_id, candidates):
    sb.table("atlet_tes_fisik_unmatched").insert({
        "kontingen_id": kontingen_id,
        "nama_atlet": record["nama"],
        "cabor_nama": record.get("cabor"),
        "jenis_kelamin": record.get("jenis_kelamin"),
        "raw_data": record,
        "candidate_atlet_ids": [c["atlet_id"] for c in candidates],
        "candidate_scores": {str(c["atlet_id"]): c["score"] for c in candidates},
    }).execute()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--commit",  action="store_true")
    p.add_argument("--source",  default=SRC_JSON)
    p.add_argument("--mapping", default=SRC_MAPPING_XLSX)
    args = p.parse_args()

    if not (args.dry_run or args.commit):
        print("Pakai --dry-run atau --commit"); return
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: Set SUPABASE_URL + SUPABASE_SERVICE_KEY"); return
    if not KONTINGEN_ID:
        print("ERROR: Set salah satu env: KONTINGEN_ID_TARGET / KONTINGEN_ID_BOGOR / KONTINGEN_ID_BANDUNG"); return

    data = json.load(open(args.source, encoding="utf-8"))
    records = data["atlet"]
    print(f"📂 Loaded {len(records)} records dari PDF")

    exact_map, suggestion_map = load_manual_mapping(args.mapping)
    print(f"📋 Manual mapping: {len(exact_map)} exact + {len(suggestion_map)} suggestions")

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    pool = fetch_atlet_pool(sb, KONTINGEN_ID)
    print(f"🎯 Pool atlet kontingen_id={KONTINGEN_ID} ({KONTINGEN_LABEL}): {len(pool)} atlet")
    if not pool:
        print("⚠️  POOL KOSONG — jalanin import_master_atlet.py dulu!"); return

    # Skip records yang udah ada di tes fisik (kalau script di-rerun)
    existing_tes = sb.table("atlet_tes_fisik").select("atlet_id, nama_atlet") \
        .eq("kontingen_id", KONTINGEN_ID).eq("tahap", 3).execute()
    existing_names = {normalize(r["nama_atlet"]) for r in existing_tes.data}
    print(f"📚 Existing tes fisik di DB: {len(existing_names)} (akan di-skip)\n")

    stats = {}
    skipped_existing = 0

    for rec in records:
        nama_norm = normalize(rec.get("nama"))
        if nama_norm in existing_names:
            skipped_existing += 1
            continue

        matched, method, score, candidates = find_match(rec, pool, exact_map, suggestion_map)
        stats[method] = stats.get(method, 0) + 1

        nama_short  = (rec.get("nama") or "")[:32]
        cabor_short = (rec.get("cabor") or "-")[:22]
        is_auto = method in ("excel_exact", "excel_suggestion", "direct_exact", "fuzzy_auto")
        status = "✓" if is_auto else "✗"
        target = f"atlet_id={matched['id']}" if matched else f"top: {candidates[0]['nama'][:25] if candidates else 'none'}"

        print(f"  {status} {rec['urutan']:>3} | {nama_short:<32} | {cabor_short:<22} | "
              f"{method:<26} | {score:.2f} | {target}")

        if args.commit:
            try:
                if matched and is_auto:
                    import_tes(sb, matched["id"], rec, KONTINGEN_ID, method, score)
                    stats["__imported"] = stats.get("__imported", 0) + 1
                else:
                    stage_unmatched(sb, rec, KONTINGEN_ID, candidates)
                    stats["__staged"] = stats.get("__staged", 0) + 1
            except Exception as e:
                stats["__error"] = stats.get("__error", 0) + 1
                print(f"     ⚠️ WRITE ERROR: {str(e)[:80]}")

    print()
    print("=" * 70)
    auto_count = sum(stats.get(k, 0) for k in
                     ("excel_exact", "excel_suggestion", "direct_exact", "fuzzy_auto"))
    total_proc = len(records) - skipped_existing
    print(f"🟢 AUTO-MATCH: {auto_count} / {total_proc} ({100*auto_count//max(total_proc,1)}%)")
    print()
    for k in sorted(stats.keys()):
        if k.startswith("__"): continue
        print(f"  {k:<35} {stats[k]}")
    print(f"  {'(skipped already exists)':<35} {skipped_existing}")
    if args.commit:
        print()
        print(f"  → Imported (tes fisik linked): {stats.get('__imported', 0)}")
        print(f"  → Staged for review          : {stats.get('__staged', 0)}")
        if stats.get("__error"):
            print(f"  ⚠️ Errors: {stats.get('__error')}")
    else:
        print("\n  (DRY-RUN — ga ada write ke DB. Pakai --commit kalau OK)")


if __name__ == "__main__":
    main()
