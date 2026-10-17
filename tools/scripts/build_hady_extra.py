"""
Add two more groups to «من هدي النبي ﷺ»:

  1. the Prophet's own instructions and promises about an act (قال النبي ﷺ ...),
     picked by hand from mine_hadith.py's candidates (one hadith per idea, no
     repeats of the same narration), and
  2. the practices (كان النبي ﷺ ...) that hadeethenc.com gives for worship,
     which the first pass did not already carry.

Every card is the hadith's own wording with its collection and number.

    python tools/scripts/build_hady_extra.py <hadeethenc.json> <said.json> [--dry-run]
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import corpus  # noqa: E402
from build_dua_sections import NOM, digits, grade_word  # noqa: E402
from build_sunan_topics import BOOK_PAT, attribution, number_in_corpus  # noqa: E402

DRY = "--dry-run" in sys.argv


def number_strict(h, books):
    """Like number_in_corpus, but anchored on words from the middle of the matn:
    the opening «كان رسول الله صلى الله عليه وسلم» is in thousands of hadith."""
    from build_sunan_topics import quote_of
    q = quote_of(h)
    if not q:
        return []
    words = [corpus.norm(w) for w in q.split() if corpus.norm(w)]
    if len(words) < 14:
        return []
    anchor = words[6:12]
    out = []
    for b in books:
        for item in corpus.hadiths(b):
            t = item.get("t") or ""
            if t and corpus.locate(corpus.tokens(t)[1], anchor):
                out.append((b, item["a"]))
                break
    return out
ADHKAR = corpus.DATA / "adhkar.json"

# Indices into said.json (the candidate list printed by the review step): one per idea.
PICK = [0, 1, 10, 13, 14, 18, 19, 28, 36, 37, 38, 41, 43, 44, 46, 50, 51, 54, 58, 59, 64, 65, 67, 72, 81, 82,
        86, 87, 88, 90, 92, 93, 97, 110, 118, 122, 124, 125, 135, 137, 141, 150, 155, 164, 167, 168, 170, 171,
        176, 180, 186, 187]

SKIP_PRACTICE = re.compile(r"(ينهانا|نهى|الجهاد|سرية|جيش|أميرا|قتلى|الحدود|يجمع بين الرجلين)")
TOPIC = [
    ("الطهارة", r"(توضأ|الوضوء|اغتسل|الغسل|السواك|يستاك|يشوص|الطهارة|الماء)"),
    ("الصلاة", r"(صلى|يصلي|الصلاة|ركعة|ركعتين|المسجد|الأذان|الوتر|سجد|يسجد|يقنت|التشهد|يخطب|الجمعة)"),
    ("الصيام والصدقة", r"(صام|يصوم|الصيام|الصوم|يفطر|السحور|رمضان|الصدقة|تصدق|عرفة)"),
    ("الحج", r"(الحج|العمرة|طاف|يطوف|عرفة|منى|مزدلفة|يلبي|التلبية|يرمي)"),
    ("الذكر والدعاء", r"(يقول|يدعو|الدعاء|دعا|يذكر|ذكر الله|يسبح|يستغفر|يقرأ|القرآن)"),
]


def topic_for(plain):
    n = corpus.norm(plain)
    for name, pat in TOPIC:
        if re.search(corpus.norm(pat) if False else pat.replace("(", "(?:"), plain):
            return name
    return "الآداب والأحوال"


def main():
    hen = json.loads(Path(sys.argv[1]).read_text(encoding="utf8"))
    said = json.loads(Path(sys.argv[2]).read_text(encoding="utf8"))
    db = json.load(open(ADHKAR, encoding="utf8"))
    secs = db["sections"]
    sec = next(s for s in secs if s["id"] == "sunan_hady")
    seen = {corpus.norm(i["text"])[:42] for i in sec["content"]}
    for s in secs:
        if s["id"].startswith("sunan") or s["id"] == "forgotten_sunnahs":
            for i in s["content"]:
                seen.add(corpus.norm(i["text"])[:42])
                seen.add(corpus.norm(i.get("benefit", ""))[:42])
    added = []

    # 1. hand-picked sayings
    for n in PICK:
        c = said[n]
        body = c["body"].strip()
        key = corpus.norm(body)[:42]
        if key in seen:
            continue
        seen.add(key)
        src = f"رواه {NOM[c['book']]} ({digits(c['a'])})"
        grade = "" if c["book"] in ("bukhari", "muslim", "malik") else f" — {grade_word(c['book'], c['g'])}"
        added.append({
            "text": "قال النبي ﷺ: «" + body + "»",
            "benefit": f"من هدي النبي ﷺ — {c['topic']}",
            "source": src,
            "source_label": f"{src}{grade}",
            "count": 1,
            "count_description": "مرة واحدة",
        })
    n_said = len(added)

    # 2. practices from hadeethenc
    for h in hen.values():
        if not any(g in h["grade"] for g in ("صحيح", "حسن")):
            continue
        body = h["hadeeth"].split("\n")[0].strip()
        plain = corpus._TASHKEEL.sub("", body)
        if not re.search(r"(كان|كانت) (رسول الله|النبي)", plain[:140]) or SKIP_PRACTICE.search(plain) or not (40 <= len(plain) <= 330):
            continue
        key = corpus.norm(body)[:42]
        if key in seen:
            continue
        att = attribution(h["attribution"])
        if not att:
            continue
        seen.add(key)
        books = [b for pat, b in BOOK_PAT if pat in att]
        if "متفق عليه" in att:
            books = ["bukhari", "muslim"]
        nums = number_strict(h["hadeeth"], books) if books else []
        if len(nums) == 1 and att == "رواه " + NOM[nums[0][0]]:
            source = f"{att} ({digits(nums[0][1])})"
        elif nums:
            source = att + " (" + "، ".join(f"{NOM[b]} {digits(a)}" for b, a in nums) + ")"
        else:
            source = att
        added.append({
            "text": body,
            "benefit": f"من هدي النبي ﷺ — {topic_for(plain)}",
            "source": source,
            "source_label": f"{source} — {h['grade'].split(' ')[0]}",
            "count": 1,
            "count_description": "مرة واحدة",
        })
    print(f"sayings {n_said}, practices {len(added) - n_said}")
    if DRY:
        for i in added[n_said : n_said + 6]:
            print("-", corpus._TASHKEEL.sub("", i["text"])[:110], "|", i["source"])
        return
    sec["content"].extend(added)
    json.dump(db, open(ADHKAR, "w", encoding="utf8"), ensure_ascii=False, indent=2)
    print("sunan_hady now", len(sec["content"]))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf8")
    main()
