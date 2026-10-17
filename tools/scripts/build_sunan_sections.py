"""
Build the «السنن» section and extend «سنن مهجورة» in public/data/adhkar.json from
sunan_specs.py. Each item carries the hadith's own words and its number, cut
from the collections in public/data/hadith by corpus.py.

    python tools/scripts/build_sunan_sections.py --dry-run
    python tools/scripts/build_sunan_sections.py
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import corpus  # noqa: E402
from build_dua_sections import NOM, digits, grade_word, pick_hadith  # noqa: E402
from sunan_specs import SUNAN  # noqa: E402

ADHKAR = corpus.DATA / "adhkar.json"
DRY = "--dry-run" in sys.argv


def excerpt(piece: str, limit: int = 170) -> str:
    t = re.sub(r"[{}]", "", piece)
    t = re.sub(r"\s+", " ", t).strip()
    if len(t) <= limit:
        return t
    cut = t.rfind(" ", 0, limit)
    return t[: cut if cut > 60 else limit] + "…"


def build_item(statement, benefit, book, h, piece):
    src = f"رواه {NOM[book]} ({digits(h['a'])})"
    grade = "" if book in ("bukhari", "muslim") else f" — {grade_word(book, h.get('g', []))}"
    return {
        "text": statement,
        "benefit": benefit,
        "source": src,
        "source_label": f"«{excerpt(piece)}» — {src}{grade}",
        "count": 1,
        "count_description": "مرة واحدة",
    }


def main():
    db = json.load(open(ADHKAR, encoding="utf8"))
    secs = db["sections"]
    by_id = {s["id"]: s for s in secs}
    forgotten = by_id["forgotten_sunnahs"]
    existing_forgotten = {corpus.norm(x["text"]) for x in forgotten["content"]}

    sunan_items, forgotten_items = [], []
    for statement, anchor, end, benefit, is_forgotten in SUNAN:
        hit = pick_hadith(anchor, end)
        if not hit:
            print("DROPPED (no verified hadith):", statement)
            continue
        book, h, piece = hit
        item = build_item(statement, benefit, book, h, piece)
        sunan_items.append(item)
        if is_forgotten:
            forgotten_items.append(item)

    new_sunan = {"id": "sunan", "title": "السنن", "content": sunan_items}
    if "sunan" in by_id:
        by_id["sunan"]["content"] = sunan_items
    else:
        idx = next(i for i, s in enumerate(secs) if s["id"] == "forgotten_sunnahs")
        secs.insert(idx, new_sunan)

    added = 0
    for it in forgotten_items:
        if corpus.norm(it["text"]) in existing_forgotten:
            continue
        forgotten["content"].append(it)
        added += 1

    print(f"sunan: {len(sunan_items)} items; forgotten_sunnahs: +{added} (now {len(forgotten['content'])})")
    if not DRY:
        json.dump(db, open(ADHKAR, "w", encoding="utf8"), ensure_ascii=False, indent=2)
        print("written")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf8")
    main()
