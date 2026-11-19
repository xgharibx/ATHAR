#!/usr/bin/env python3
"""
Build the catalogue of «السماع», the Quran listening section
(public/data/listen/catalog.json).

Everything here streams from its own public source; nothing is re-hosted:

  mp3quran.net       full surahs from 240+ reciters and riwayat, the golden
                     mujawwad editions, and per-ayah timings (fetched live by
                     the app for the verses that follow the reciter)
  quranicaudio.com   the night prayers of al-Masjid al-Haram and al-Masjid
                     an-Nabawi, one file per surah, 1419–1447 AH
  archive.org        tawasheeh and ibtihalat of the great Egyptian munshids

Run it again to refresh the snapshot:  python3 tools/listen/build_catalog.py
"""
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "data" / "listen" / "catalog.json"
UA = {"User-Agent": "athar-catalog-builder"}


def get(url: str):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def compress(ids):
    """[1,2,3,5,7,8,9] -> "1-3,5,7-9" """
    ids = sorted(set(ids))
    out, i = [], 0
    while i < len(ids):
        j = i
        while j + 1 < len(ids) and ids[j + 1] == ids[j] + 1:
            j += 1
        out.append(str(ids[i]) if i == j else f"{ids[i]}-{ids[j]}")
        i = j + 1
    return ",".join(out)


# ─────────────── Reciters (mp3quran.net) ───────────────

# Shown first, in this order: the voices most people look for.
FAMOUS = [
    51, 112, 118, 123, 54, 31, 102, 30, 92, 5, 81, 86, 12, 62, 20, 109, 76, 74, 4,
    89, 111, 121, 106, 125, 225, 245, 60, 43, 160, 56, 107, 61, 24, 96, 80, 16, 64,
    49, 9, 1, 197, 221, 127, 253, 231, 273, 21182, 165, 87,
]

STYLE = {
    "مرتل": "مرتّل",
    "المصحف المجود": "مجوّد",
    "المصحف المعلم": "معلّم",
    "تلاوة مميزة": "تلاوة مميزة",
}


def moshaf_label(name: str):
    """'حفص عن عاصم - المصحف المجود' -> ('حفص عن عاصم', 'مجوّد')"""
    parts = [p.strip() for p in name.split(" - ")]
    riwaya = parts[0]
    rest = " - ".join(parts[1:]) if len(parts) > 1 else "مرتل"
    style = STYLE.get(rest, rest)
    return re.sub(r"\s+", " ", riwaya), style


def build_reciters():
    data = get("https://www.mp3quran.net/api/v3/reciters?language=ar")["reciters"]
    timed = {t["folder_url"].rstrip("/") for t in get("https://www.mp3quran.net/api/v3/ayat_timing/reads")}
    timed_ids = {t["folder_url"].rstrip("/"): t["id"] for t in get("https://www.mp3quran.net/api/v3/ayat_timing/reads")}
    out = []
    for r in data:
        moshaf = []
        for m in r["moshaf"]:
            surahs = [int(x) for x in m["surah_list"].split(",") if x.strip().isdigit()]
            if len(surahs) < 3:
                continue
            riwaya, style = moshaf_label(m["name"])
            server = m["server"].rstrip("/")
            entry = {"id": m["id"], "r": riwaya, "s": style, "u": server + "/", "l": compress(surahs)}
            if server in timed:
                entry["t"] = timed_ids[server]
            moshaf.append(entry)
        if not moshaf:
            continue
        # The usual Hafs murattal first.
        moshaf.sort(key=lambda m: (m["r"] != "حفص عن عاصم", m["s"] != "مرتّل", -len(m["l"])))
        out.append({"id": r["id"], "n": r["name"].strip(), "m": moshaf})
    out.sort(key=lambda r: r["n"])
    return out


# The golden age of Egyptian recitation: the mujawwad editions.
GOLDEN = [
    (125, "مجوّد", "سيّد قرّاء دولة التلاوة، وصاحب أوسع المقامات"),
    (51, "مجوّد", "الحنجرة الذهبية: نفَسٌ طويل وصوتٌ ملأ الدنيا"),
    (112, "مجوّد", "صوت يبكي القلوب، بخشوع لا يُنسى"),
    (112, "تسجيل عام 1387 هـ - 1967م", "تسجيل نادر من عام ١٩٦٧م"),
    (118, "مجوّد", "شيخ عموم المقارئ، وإتقان لا يُضاهى"),
    (121, "مجوّد", "صوت رخيم وأداء متقَن"),
    (106, "مجوّد", "قيثارة السماء، من أعلام القرّاء"),
    (102, "مجوّد", "مجوّد من إمام الحرم المكي"),
]


def build_golden(reciters):
    by_id = {r["id"]: r for r in reciters}
    out = []
    for rid, style, note in GOLDEN:
        r = by_id.get(rid)
        if not r:
            continue
        m = next((m for m in r["m"] if m["s"] == style), None)
        if not m:
            continue
        out.append({"reciter": rid, "moshaf": m["id"], "note": note})
    return out


# ─────────────── Night prayers in the two Harams (quranicaudio.com) ───────────────

def build_qiyam():
    qaris = get("https://quranicaudio.com/api/qaris")
    out = []
    for q in qaris:
        if q.get("section_id") != 2:
            continue
        m = re.match(r"(Makkah|Madinah) Taraweeh (\d{4})", q["name"])
        if not m:
            continue
        city = "makkah" if m.group(1) == "Makkah" else "madinah"
        year = int(m.group(2))
        files = get(f"https://quranicaudio.com/api/qaris/{q['id']}/audio_files/mp3")
        tracks = {}
        for f in files:
            sid = f.get("surah_id")
            if not sid or not 1 <= sid <= 114:
                continue
            dur = float((f.get("format") or {}).get("duration") or 0)
            tracks[sid] = round(dur)
        if not tracks:
            continue
        out.append({
            "id": f"{city}-{year}",
            "city": city,
            "year": year,
            "u": f"https://download.quranicaudio.com/quran/{q['relative_path']}",
            "d": {str(k): v for k, v in sorted(tracks.items())},
        })
        print(f"  qiyam {city} {year}: {len(tracks)} surahs", file=sys.stderr)
    out.sort(key=lambda x: (-x["year"], x["city"]))
    return out


# ─────────────── Tawasheeh and ibtihalat (archive.org) ───────────────

ALBUMS = [
    # (archive id, title, artist or None for several, public-domain mark?)
    ("Sama3almelouk_yahoo_20160525", "روائع سيد النقشبندي", "سيد النقشبندي"),
    ("Naqshbandii", "ابتهالات النقشبندي", "سيد النقشبندي"),
    ("20240309_20240309_1714", "نوادر النقشبندي", "سيد النقشبندي"),
    ("20230916_20230916_0316", "ابتهالات ودعاء طوبار", "نصر الدين طوبار"),
    ("07._20210119", "نوادر نصر الدين طوبار", "نصر الدين طوبار"),
    ("Sheikh-Taha-Al-Fashni-Ibtihalat", "ابتهالات طه الفشني", "طه الفشني"),
    ("20230916_20230916_1609", "نوادر طه الفشني", "طه الفشني"),
    ("20230916_20230916_0318", "ابتهالات محمد عمران", "محمد عمران"),
    ("2071215", "كبار المبتهلين", None),
]

ARTISTS = [
    "سيد النقشبندي", "نصر الدين طوبار", "طه الفشني", "محمد عمران", "إسماعيل السمكري",
    "سعيد حافظ", "كامل يوسف البهتيمي", "محمد الهلباوي", "حسن قاسم", "إبراهيم الإسكندراني",
    "محمد الطوخي", "عبدالرازق الجندالي", "وحيد الشرقاوي", "ممدوح عبدالجليل", "عبدالتواب البساتيني",
]

ARTIST_VARIANTS = {
    "سيد النقشبندي": ["النقشبندي", "النقشبندى"],
    "نصر الدين طوبار": ["طوبار", "نصرالدين طوبار"],
    "طه الفشني": ["الفشني", "الفشنى"],
    "محمد عمران": ["عمران"],
    "إسماعيل السمكري": ["السمكري", "السمكرى", "اسماعيل السمكرى"],
    "كامل يوسف البهتيمي": ["البهتيمي", "البهتيمى"],
    "محمد الهلباوي": ["الهلباوي", "الهلباوى"],
    "محمد الطوخي": ["الطوخي", "الطوخى"],
    "سعيد حافظ": ["سعيد حافظ"],
    "حسن قاسم": ["حسن قاسم"],
    "إبراهيم الإسكندراني": ["الاسكندراني", "الإسكندراني"],
    "عبدالرازق الجندالي": ["الجندالي"],
    "وحيد الشرقاوي": ["الشرقاوي"],
    "ممدوح عبدالجليل": ["ممدوح عبدالجليل", "ممدوح عبد الجليل"],
    "عبدالتواب البساتيني": ["البساتيني"],
}

NOISE = [
    r"الشيخ", r"القارئ", r"المبتهل", r"ابتهالات?", r"إبتهالات?", r"ابتهلات", r"تواشيح",
    r"جودة عالية( جدا)?", r"بجودة عالية( جدا)?", r"\bHD\b", r"حصري[اًا]?", r"حصريًا",
    r"فيديو", r"نسخة مرئية", r"بصوت رائع وجميل", r"من أروع ما يكون", r"كامل[ةه]?",
    r"نادر[ةه]?( جد[اًا])?", r"جد[اًا]", r"رحمه الله", r"www\.\S+", r"WWW\.\S+",
]


def is_readable(s: str) -> bool:
    arabic = len(re.findall(r"[؀-ۿ]", s))
    return arabic >= max(3, len(s) * 0.4)


def clean_title(raw: str, artist: str | None):
    s = re.sub(r"\.mp3$", "", raw, flags=re.I)
    s = re.sub(r"^[\d\s._\-–—]+", "", s)
    s = re.sub(r"[_|/]+|--|—|–", " - ", s)
    s = re.sub(r"[^\w\s؀-ۿ\-.,،:()]+", " ", s)  # emoji and odd symbols
    found = artist
    if artist is None:
        for name in ARTISTS:
            if any(v in s for v in [name, *ARTIST_VARIANTS.get(name, [])]):
                found = name
                break
    for name in ([found] if found else []):
        for v in sorted([name, *ARTIST_VARIANTS.get(name, [])], key=len, reverse=True):
            s = s.replace(v, " ")
    for pat in NOISE:
        s = re.sub(pat, " ", s)
    s = re.sub(r"\d{5,}", " ", s)
    s = re.sub(r"\.{2,}", " ", s)
    # Leftovers of removed words: lone letters, «للشيخ», a dangling «ال».
    words = [w for w in s.split() if w not in {"للشيخ", "لشيخ", "ال", "سيد", ",", "."} and not re.fullmatch(r"[\u0600-\u06FF]\u0651?", w)]
    s = " ".join(words)
    s = re.sub(r"\s*-\s*(-\s*)+", " - ", s)
    s = re.sub(r"\s+", " ", s).strip(" -_.،,")
    if len(s) > 64:
        s = s[:64].rsplit(" ", 1)[0] + "…"
    return s, found


def build_tawasheeh():
    out = []
    for ident, title, artist in ALBUMS:
        meta = get(f"https://archive.org/metadata/{ident}")
        files = [f for f in meta.get("files", []) if f["name"].lower().endswith(".mp3")]
        originals = [f for f in files if f.get("source") == "original"] or files
        tracks, seen = [], set()
        for f in sorted(originals, key=lambda f: f["name"]):
            name = f["name"].split("/")[-1]
            if not is_readable(name):
                continue
            length = float(f.get("length") or 0)
            if length and (length < 45 or length > 2 * 3600):
                continue
            t, who = clean_title(name, artist)
            if len(t) < 3 or t in seen:
                continue
            seen.add(t)
            url = f"https://archive.org/download/{ident}/{urllib.parse.quote(f['name'])}"
            track = {"t": t, "u": url, "d": round(length)}
            if artist is None and who:
                track["a"] = who
            tracks.append(track)
        lic = (meta.get("metadata") or {}).get("licenseurl") or ""
        album = {"id": ident, "title": title, "artist": artist or "نخبة المبتهلين", "tracks": tracks, "src": f"https://archive.org/details/{ident}"}
        if "publicdomain" in lic:
            album["pd"] = True
        out.append(album)
        print(f"  tawasheeh {title}: {len(tracks)} tracks", file=sys.stderr)
    return out


def main():
    print("reciters…", file=sys.stderr)
    reciters = build_reciters()
    print(f"  {len(reciters)} reciters", file=sys.stderr)
    by_id = {r["id"] for r in reciters}
    catalog = {
        "v": 1,
        "famous": [i for i in FAMOUS if i in by_id],
        "reciters": reciters,
        "golden": build_golden(reciters),
        "qiyam": build_qiyam(),
        "tawasheeh": build_tawasheeh(),
        "sources": {
            "mp3quran": "https://mp3quran.net",
            "quranicaudio": "https://quranicaudio.com",
            "archive": "https://archive.org",
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)", file=sys.stderr)


if __name__ == "__main__":
    main()
