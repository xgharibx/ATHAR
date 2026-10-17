"""
Build «من هدي النبي ﷺ»: what the Prophet used to do, in the words of the hadith
(kana al-nabiyyu ... yaf'alu), from the collections bundled with the app. Each
card carries the collection and number; weakly graded narrations are dropped.

    python tools/scripts/build_hady_section.py [--dry-run]
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import corpus  # noqa: E402
import mine_hadith as M  # noqa: E402
from build_dua_sections import NOM, digits, grade_word  # noqa: E402

DRY = "--dry-run" in sys.argv
ADHKAR = corpus.DATA / "adhkar.json"


def main():
    db = json.load(open(ADHKAR, encoding="utf8"))
    secs = db["sections"]
    seen = {corpus.norm(i["text"])[:45] for s in secs if s["id"].startswith("sunan") or s["id"] == "forgotten_sunnahs" for i in s["content"]}
    seen |= {corpus.norm(i.get("benefit", ""))[:45] for s in secs if s["id"].startswith("sunan") for i in s["content"]}
    out = []
    for c in M.sunan_candidates():
        if c["kind"] != "did":
            continue
        body = re.sub(r"\s+(قال|وقال|قالت)\s*$", "", c["body"]).strip()
        plain = corpus._TASHKEEL.sub("", body)
        if re.search(r"(قالت يا|قال له|فقال لها|يا رسول الله|هذا حديث|فقلت|فقالت)", plain):
            continue
        if len(plain) < 40 or len(plain) > 230:
            continue
        key = corpus.norm("كان النبي " + plain)[:45]
        key2 = corpus.norm(plain)[:45]
        if key in seen or key2 in seen:
            continue
        seen.add(key)
        text = "كان النبي ﷺ " + body
        src = f"رواه {NOM[c['book']]} ({digits(c['a'])})"
        grade = "" if c["book"] in ("bukhari", "muslim", "malik") else f" — {grade_word(c['book'], c['g'])}"
        out.append({
            "text": text,
            "benefit": f"من هدي النبي ﷺ — {c['topic']}",
            "source": src,
            "source_label": f"{src}{grade}",
            "count": 1,
            "count_description": "مرة واحدة",
        })
    out.sort(key=lambda i: i["benefit"])
    print("hady items:", len(out))
    if DRY:
        for i in out[:6]:
            print("-", corpus._TASHKEEL.sub("", i["text"])[:110], "|", i["source"])
        return
    sec = next((s for s in secs if s["id"] == "sunan_hady"), None)
    if sec:
        sec["content"] = out
    else:
        at = [s["id"] for s in secs].index("forgotten_sunnahs")
        secs.insert(at, {"id": "sunan_hady", "title": "من هدي النبي ﷺ", "content": out})
    json.dump(db, open(ADHKAR, "w", encoding="utf8"), ensure_ascii=False, indent=2)
    print("written")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf8")
    main()
