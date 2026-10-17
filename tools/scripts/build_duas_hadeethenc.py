"""
Add the supplications quoted in hadeethenc.com's «فقه الأدعية والأذكار» and
«الأدعية المأثورة» categories to the prophetic dua section, then build the
themed collections (الاستعاذة، المغفرة والتوبة، الهداية والثبات) out of every
dua the app carries.

Each added dua is the quoted text exactly as the encyclopedia gives it; its
source is the collection (with the hadith number when the same hadith is in the
bundled texts) and its grading. Gradings below hasan are skipped.

    python tools/scripts/build_duas_hadeethenc.py <hadeethenc.json> [--dry-run]
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import corpus  # noqa: E402
from build_dua_sections import digits  # noqa: E402
from build_sunan_topics import BOOK_PAT, NOM, attribution, number_in_corpus  # noqa: E402

ADHKAR = corpus.DATA / "adhkar.json"
DRY = "--dry-run" in sys.argv
CAT = re.compile(r"(فقه الأدعية والأذكار|الأدعية المأثورة|الأذكار|الأدعية)")
START = re.compile(r"^\s*(اللهم|اللَّهُمَّ|ربنا|رَبَّنَا|رب |رَبِّ|أعوذ|أَعُوذُ|يا مقلب|يَا مُقَلِّبَ|يا حي|يَا حَيُّ|حسبي|حَسْبِيَ|لا إله إلا الله العظيم|لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ)")

THEMES = [
    ("dua_istiadha", "أدعية الاستعاذة", re.compile(r"(أعوذ|نعوذ)")),
    ("dua_maghfira", "أدعية المغفرة والتوبة", re.compile(r"(اغفر|مغفرة|تب علي|التواب|استغفر)")),
    ("dua_huda", "أدعية الهداية والثبات", re.compile(r"(اهدني|اهدنا|الهدى|ثبت|ثبّت|سددني|الرشد|التقى|العفاف|تزكي|زكها)")),
]


def quotes(text):
    out = []
    for m in re.finditer(r"«([^»]+)»", text):
        q = re.sub(r"\s+", " ", m.group(1)).strip().strip(".:؛،")
        out.append(q)
    return out


def main():
    src = json.loads(Path(sys.argv[1]).read_text(encoding="utf8"))
    db = json.load(open(ADHKAR, encoding="utf8"))
    secs = db["sections"]
    by_id = {s["id"]: s for s in secs}
    dua_sections = ["quranic_duas", "prophets_duas", "prophetic_duas", "jawami_dua"]
    have = [corpus.norm(i["text"]) for sid in dua_sections for i in by_id[sid]["content"]]

    def dup(t):
        n = corpus.norm(t)
        return any(n in h or h in n for h in have if len(h) > 10 and len(n) > 10)

    added = []
    for h in src.values():
        cats = " ".join(h.get("categories") or [])
        if not CAT.search(cats) or not any(g in h["grade"] for g in ("صحيح", "حسن")):
            continue
        att = attribution(h["attribution"])
        if not att:
            continue
        for q in quotes(h["hadeeth"].split("\n")[0]):
            plain = corpus._TASHKEEL.sub("", q)
            if not START.match(q) or not (18 <= len(plain) <= 330):
                continue
            if "،" not in plain and len(plain.split()) < 4:
                continue
            if dup(q):
                continue
            books = [b for pat, b in BOOK_PAT if pat in att]
            if "متفق عليه" in att:
                books = ["bukhari", "muslim"]
            nums = number_in_corpus(h["hadeeth"], books) if books else []
            if len(nums) == 1 and att == "رواه " + NOM[nums[0][0]]:
                source = f"{att} ({digits(nums[0][1])})"
            elif nums:
                source = att + " (" + "، ".join(f"{NOM[b]} {digits(a)}" for b, a in nums) + ")"
            else:
                source = att
            hint = next((x.strip() for x in (h.get("hints") or []) if re.match(r"^(استحباب|مشروعية|يستحب|فضل|الحث)", x.strip()) and re.search(r"(الدعاء|الذكر|الاستعاذة|دعاء|يقول)", x.strip()[:140])), "")
            hint = re.split(r"(?<=[.؟!])\s", hint)[0][:160].rstrip(" .") if hint else ""
            item = {
                "text": q,
                "benefit": hint or "من أدعية النبي ﷺ",
                "source": source,
                "source_label": f"{source} — {h['grade'].split(' ')[0]}",
                "count": 1,
                "count_description": "مرة واحدة",
            }
            have.append(corpus.norm(q))
            added.append(item)
    print("new prophetic duas:", len(added))

    # themed collections drawn from every dua we now carry
    pool = list(added)
    for sid in dua_sections:
        pool += by_id[sid]["content"]
    themed = {}
    for sid, title, rx in THEMES:
        seen, items = set(), []
        for it in pool:
            plain = corpus._TASHKEEL.sub("", it["text"])
            if rx.search(plain) and len(plain) < 340:
                k = corpus.norm(plain)[:40]
                if k not in seen:
                    seen.add(k)
                    items.append(it)
        themed[sid] = (title, items)
    print({k: len(v[1]) for k, v in themed.items()})
    if DRY:
        for it in added[:12]:
            print("-", corpus._TASHKEEL.sub("", it["text"])[:90], "|", it["source"], "|", it["benefit"][:50])
        return

    by_id["prophetic_duas"]["content"].extend(added)
    order = [s["id"] for s in secs]
    at = order.index("jawami_dua") + 1
    for sid, (title, items) in reversed(list(themed.items())):
        if sid in by_id:
            by_id[sid]["content"] = items
        else:
            secs.insert(at, {"id": sid, "title": title, "content": items})
    json.dump(db, open(ADHKAR, "w", encoding="utf8"), ensure_ascii=False, indent=2)
    print("written")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf8")
    main()
