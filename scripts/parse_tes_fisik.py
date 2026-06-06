"""
PORPROV XV — Tes Fisik Kab. Bandung Parser
Extracts 402 athletes × N test items from UPI Sport Science report PDF.
Output: JSON + CSV ready for Supabase import.
"""
import re
import json
import csv
from pathlib import Path

SRC = Path("full_text.txt")
OUT_JSON = Path("tes_fisik_kab_bandung_2026.json")
OUT_CSV_ATLET = Path("tes_fisik_atlet.csv")
OUT_CSV_ITEM = Path("tes_fisik_item.csv")
OUT_SUMMARY = Path("extraction_summary.json")

MARKER = "HASIL TES FISIK ATLET KABUPATEN BANDUNG"

# Komponen mapping berdasarkan item tes
KOMPONEN_MAP = {
    "Sit and Reach": "Flexibility",
    "Trunk Lift": "Flexibility",
    "Stork Stand Test": "Balance",
    "Stand Stork Balance": "Balance",
    "Whole Body Reaction": "Speed Reaction",
    "Side Step": "Agility",
    "Speed Test": "Speed",
    "20 Meter": "Speed",
    "Vertical Jump": "Power",
    "Medicine Ball": "Power",
    "Squat": "Strength",
    "Bench Press": "Strength",
    "Bench Pull": "Strength",
    "Deadlift": "Strength",
    "Hurdle Jump": "Local Muscle Endurance",
    "Push Up": "Local Muscle Endurance",
    "Sit Up": "Local Muscle Endurance",
    "Core Stability": "Core Stability",
    "Bleep Test": "Aerobic Capacity",
    "VO2": "Aerobic Capacity",
}

def detect_komponen(item_name: str) -> str:
    for keyword, komponen in KOMPONEN_MAP.items():
        if keyword.lower() in item_name.lower():
            return komponen
    return "Other"

def parse_number(s: str):
    """Parse '77,0' or '25,43' or '-0,8' → float. Returns None for '#DIV/0!' etc."""
    if s is None: return None
    s = s.strip().replace(",", ".")
    if "#" in s or s.lower() in ("n/a", "na", "-"):
        return None
    try:
        return float(s)
    except (ValueError, TypeError):
        return None

# Normalisasi nama cabor (mapping ke nama kanonik)
CABOR_NORMALIZE = {
    "kempo": "Kempo",
    "kickboxing": "Kick Boxing",
    "Kickboxing": "Kick Boxing",
    "Pencak silat": "Pencak Silat",
    "Ibca Mma": "IBCA MMA",
    "IBCA (MMA)": "IBCA MMA",
    "Berkuda Equistrian": "Berkuda / Equestrian",
    "Atletik ( Jarak Pendek )": "Atletik",
    "Renang Perairan Terbuka (OWS)": "OWS (Open Water Swimming)",
    "Esport": "E-Sport",
    "Basket 3x3": "Bola Basket 3x3",
    "Basket 5x5": "Bola Basket 5x5",
    "Hoki Indoor": "Hockey Indoor",
    "Hoki Outdoor": "Hockey Outdoor",
    "Muaythai": "Muay Thai",
    "Petanque": "Pentaque",
    "Cabor Selam": "Selam",
    "Balap Motor": "Balap Motor Road Race & Grasstrack & Mini 4 WD",
    # Canoe dan Rowing tetap dipisah karena beda discipline meski sama2 Dayung
    "Canoe": "Dayung (Canoe)",
    "Rowing": "Dayung (Rowing)",
}

def normalize_cabor(name):
    if not name: return None
    n = name.strip()
    return CABOR_NORMALIZE.get(n, n)

def split_blocks(text: str):
    """Split full text by athlete marker. Returns list of (block_text)."""
    parts = text.split(MARKER)
    # parts[0] is the intro before any athlete; skip it
    return parts[1:]

def parse_identity(block: str) -> dict:
    """Extract Nama, Jenis Kelamin, Cabor, Berat, Tinggi, BMI."""
    ident = {
        "nama": None, "jenis_kelamin": None, "cabor": None,
        "berat_badan": None, "tinggi_badan": None, "bmi": None
    }

    # Nama : X    Berat Badan : Y
    m = re.search(r"Nama\s*:\s*(.+?)\s{2,}Berat Badan\s*:\s*([\d,.\-]+)", block)
    if m:
        ident["nama"] = m.group(1).strip()
        ident["berat_badan"] = parse_number(m.group(2))

    m = re.search(r"Jenis Kelamin\s*:\s*(.+?)\s{2,}Tinggi Badan\s*:\s*([\d,.\-]+)", block)
    if m:
        jk = m.group(1).strip()
        # Normalize
        if "laki" in jk.lower():
            ident["jenis_kelamin"] = "L"
        elif "perempuan" in jk.lower() or "wanita" in jk.lower():
            ident["jenis_kelamin"] = "P"
        else:
            ident["jenis_kelamin"] = jk
        ident["tinggi_badan"] = parse_number(m.group(2))

    m = re.search(r"Cabor\s*:\s*(.+?)\s{2,}BMI\s*:\s*([\d,.\-]+|#[A-Z/0!]+)", block)
    if m:
        ident["cabor"] = normalize_cabor(m.group(1).strip())
        ident["bmi"] = parse_number(m.group(2))

    return ident

# Regex untuk row item tes:
# "    1 Item Name (with possible parens)    hasil satuan    norma satuan    XX%    Kategori"
ITEM_RE = re.compile(
    r"^\s*(\d{1,2})\s+"                          # nomor urut
    r"(.+?)\s{2,}"                               # nama item (greedy minimal sampai 2+ spasi)
    r"([\-\d,\.]+)\s+([A-Za-z/]+(?:\.[a-z]+)?)\s{2,}"  # hasil + satuan
    r"([\-\d,\.]+)\s+([A-Za-z/]+(?:\.[a-z]+)?)\s{2,}"  # norma + satuan
    r"(\d{1,3})\s*%\s{2,}"                       # capaian %
    r"(Kurang Sekali|Kurang|Cukup|Baik Sekali|Baik)" # kategori
    , re.MULTILINE
)

# Kesimpulan: "KESIMPULAN ...... XX% Kategori"
KESIMPULAN_RE = re.compile(
    r"KESIMPULAN\s+(\d{1,3})\s*%\s+(Kurang Sekali|Kurang|Cukup|Baik Sekali|Baik)"
)

def parse_items(block: str):
    """Parse semua item tes dari block."""
    items = []
    for m in ITEM_RE.finditer(block):
        no, nama_item, hasil_val, hasil_unit, norma_val, norma_unit, capaian, kategori = m.groups()
        items.append({
            "no": int(no),
            "item_tes": nama_item.strip(),
            "hasil_nilai": parse_number(hasil_val),
            "hasil_satuan": hasil_unit.strip(),
            "norma_nilai": parse_number(norma_val),
            "norma_satuan": norma_unit.strip(),
            "capaian_persen": int(capaian),
            "kategori": kategori.strip(),
            "komponen": detect_komponen(nama_item)
        })
    return items

def parse_kesimpulan(block: str):
    m = KESIMPULAN_RE.search(block)
    if m:
        return {
            "kesimpulan_persen": int(m.group(1)),
            "kesimpulan_kategori": m.group(2).strip()
        }
    return {"kesimpulan_persen": None, "kesimpulan_kategori": None}

def main():
    text = SRC.read_text(encoding="utf-8")
    blocks = split_blocks(text)
    print(f"Detected {len(blocks)} athlete blocks")

    atlet_list = []
    issues = []

    for idx, block in enumerate(blocks, start=1):
        ident = parse_identity(block)
        items = parse_items(block)
        kesimpulan = parse_kesimpulan(block)

        rec = {
            "urutan": idx,
            **ident,
            **kesimpulan,
            "jumlah_item": len(items),
            "status_tes": "Hadir" if len(items) > 0 else "Tidak Hadir",
            "items": items
        }
        atlet_list.append(rec)

        # Validation
        if not ident["nama"]:
            issues.append({"urutan": idx, "issue": "Nama tidak terdeteksi"})
        if not ident["cabor"]:
            issues.append({"urutan": idx, "issue": "Cabor tidak terdeteksi"})
        if len(items) == 0:
            issues.append({"urutan": idx, "issue": "0 item tes terdeteksi", "nama": ident["nama"]})
        if kesimpulan["kesimpulan_persen"] is None:
            issues.append({"urutan": idx, "issue": "Kesimpulan tidak terdeteksi", "nama": ident["nama"]})

    # Statistik
    cabor_count = {}
    gender_count = {"L": 0, "P": 0, "Unknown": 0}
    kategori_count = {}
    total_items = 0
    bmi_distribution = {"underweight": 0, "normal": 0, "overweight": 0, "obese": 0, "unknown": 0}

    for a in atlet_list:
        cab = a.get("cabor") or "Unknown"
        cabor_count[cab] = cabor_count.get(cab, 0) + 1
        jk = a.get("jenis_kelamin") or "Unknown"
        gender_count[jk] = gender_count.get(jk, 0) + 1
        kat = a.get("kesimpulan_kategori") or "Unknown"
        kategori_count[kat] = kategori_count.get(kat, 0) + 1
        total_items += a["jumlah_item"]
        bmi = a.get("bmi")
        if bmi is None:
            bmi_distribution["unknown"] += 1
        elif bmi < 18.5:
            bmi_distribution["underweight"] += 1
        elif bmi < 25:
            bmi_distribution["normal"] += 1
        elif bmi < 30:
            bmi_distribution["overweight"] += 1
        else:
            bmi_distribution["obese"] += 1

    summary = {
        "total_atlet": len(atlet_list),
        "total_item_tes": total_items,
        "rata_item_per_atlet": round(total_items / max(len(atlet_list), 1), 2),
        "total_cabor": len(cabor_count),
        "breakdown_cabor": dict(sorted(cabor_count.items(), key=lambda x: -x[1])),
        "breakdown_gender": gender_count,
        "breakdown_kategori_overall": kategori_count,
        "bmi_distribution": bmi_distribution,
        "issues_count": len(issues),
        "issues_sample": issues[:20]
    }

    # Write outputs
    OUT_JSON.write_text(json.dumps({
        "metadata": {
            "sumber": "Laporan Tes Biomotorik Atlet Porprov Kab. Bandung 2026 - UPI Sport Science",
            "tanggal_tes": "2026-04-11",
            "lokasi": "Gedung Gymnasium SOR Si Jalak Harupat, Kab. Bandung",
            "tahap": 3,
            "penanggung_jawab": "Prof. Agus Rusdiana, M.A., Ph.D.",
            "lembaga": "FPOK Universitas Pendidikan Indonesia"
        },
        "summary": summary,
        "atlet": atlet_list
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    # CSV — atlet header
    with OUT_CSV_ATLET.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["urutan", "nama", "jenis_kelamin", "cabor", "berat_badan",
                    "tinggi_badan", "bmi", "kesimpulan_persen", "kesimpulan_kategori",
                    "jumlah_item"])
        for a in atlet_list:
            w.writerow([a["urutan"], a["nama"], a["jenis_kelamin"], a["cabor"],
                        a["berat_badan"], a["tinggi_badan"], a["bmi"],
                        a["kesimpulan_persen"], a["kesimpulan_kategori"], a["jumlah_item"]])

    # CSV — items detail
    with OUT_CSV_ITEM.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["atlet_urutan", "nama", "cabor", "no_item", "komponen",
                    "item_tes", "hasil_nilai", "hasil_satuan",
                    "norma_nilai", "norma_satuan", "capaian_persen", "kategori"])
        for a in atlet_list:
            for it in a["items"]:
                w.writerow([a["urutan"], a["nama"], a["cabor"], it["no"], it["komponen"],
                            it["item_tes"], it["hasil_nilai"], it["hasil_satuan"],
                            it["norma_nilai"], it["norma_satuan"],
                            it["capaian_persen"], it["kategori"]])

    OUT_SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n=== EXTRACTION SUMMARY ===")
    print(f"Total atlet      : {summary['total_atlet']}")
    print(f"Total item tes   : {summary['total_item_tes']}")
    print(f"Rata2 item/atlet : {summary['rata_item_per_atlet']}")
    print(f"Total cabor      : {summary['total_cabor']}")
    print(f"Gender L/P       : {gender_count['L']} / {gender_count['P']}")
    print(f"Issues           : {len(issues)}")
    print(f"\nTop 5 cabor by athlete count:")
    for cab, n in list(summary['breakdown_cabor'].items())[:5]:
        print(f"  {cab}: {n}")
    print(f"\nKategori overall:")
    for k, v in kategori_count.items():
        print(f"  {k}: {v}")

if __name__ == "__main__":
    main()
