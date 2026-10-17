"""
Build the topical sunan sections from the hadeethenc.com crawl
(crawl_hadeethenc.py): each hadith the encyclopedia itself marks as something
recommended, legislated or encouraged («استحباب …»، «مشروعية …»، «الحث على …»)
becomes one card:

  text     the sunnah, in the encyclopedia's own words (its «فوائد» line)
  benefit  the hadith, with its narrator, exactly as the encyclopedia gives it
  source   the collection(s), plus the hadith number when the same hadith is in
           the Bukhari / Muslim / Sunan texts bundled with the app
  label    the grading

Hadith graded below hasan, prohibitions, rulings that are merely «allowed»,
and anything without a clear source are left out.

    python tools/scripts/build_sunan_topics.py <hadeethenc.json> [--dry-run]
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import corpus  # noqa: E402
from build_dua_sections import digits  # noqa: E402

ADHKAR = corpus.DATA / "adhkar.json"
DRY = "--dry-run" in sys.argv

POS = re.compile(
    r"^\s*(?:[-•\d.)(]*\s*)?(استحباب|يستحب|يسن|سنية|من السنة|السنة|مشروعية|يشرع|الحث|الحثُّ|الترغيب|فضل|فضيلة|الأمر بـ?|ينبغي|يندب|الندب|فيه استحباب|في الحديث استحباب|دلالة على استحباب)"
)
# virtues of God, Paradise, people or creeds are not acts to do
NOT_AN_ACT = re.compile(r"^\s*(?:[-•\d.)(]*\s*)?(فضل|فضيلة) (الله|الجنة|النبي|الصحابة|الأنبياء|الإيمان|الإسلام|هذه الأمة|العلماء|الأنصار|قريش|الصديق|عمر|عثمان|علي|الشهداء|المدينة|مكة|الشام)")
NEG = re.compile(r"(حرمة|تحريم|يحرم|حرام|النهي|لا يجوز|عدم جواز|التحذير|الوعيد|وجوب|يجب|فرضية|بطلان|يبطل|الكفارة|عقوبة|ذم |كراهة|يكره|لعن)")
SKIP_CATEGORY = re.compile(r"(الجهاد|الحدود|القضاء|الفرائض|الجنايات|الصحابة|آل البيت|الفتن|أشراط|الإيمان|التوحيد|القدر|الملائكة|الشرك|الأسماء|البدع|الكفر|النفاق|المعاملات|البيوع|الربا|الأسرة|النكاح|الطلاق|الدعوة|السياسة)")

# first match wins; (section id, title, category keywords)
TOPICS = [
    ("sunan_dhikr", "سنن الذكر والدعاء والقرآن", r"(الأدعية|الأذكار|فقه الأدعية|فضائل القرآن|الذكر|تلاوة)"),
    ("sunan_purity", "سنن الطهارة واللباس", r"(الطهارة|الوضوء|الغسل|التيمم|الفطرة|اللباس|الزينة|السواك|قضاء الحاجة)"),
    ("sunan_salah", "سنن الصلاة والمسجد", r"(الصلاة|صلاة|المساجد|المسجد|الأذان|قيام الليل|الجماعة|الإمام)"),
    ("sunan_siyam", "سنن الصيام والزكاة والصدقة", r"(الصيام|الصوم|الزكاة|صدقة|رمضان|الاعتكاف|الإنفاق)"),
    ("sunan_hajj", "سنن الحج والعيد", r"(الحج|العمرة|الأضحية|العيد|الهدي|العقيقة)"),
    ("sunan_janaiz", "سنن الجنائز والمرض", r"(الجنائز|الجنازة|الطب|التداوي|الرقية|المريض|الميت|القبور)"),
    ("sunan_adab", "سنن الآداب والطعام والسلام", r"(الآداب|آداب|الأطعمة|الأشربة|الأكل|السلام|الاستئذان|الكلام|المجلس|السفر|النوم|الضيافة|الجوار)"),
    ("sunan_akhlaq", "سنن الأخلاق وأعمال القلوب", r"(الأخلاق|أعمال القلوب|تزكية|الرقائق|الفضائل|البر|الصلة|الصبر|الشكر|الحياء|الزهد)"),
]
TOPIC_RE = [(sid, title, re.compile(pat)) for sid, title, pat in TOPICS]

# What a hint itself talks about decides the section; the category only breaks ties.
# A hint that matches nothing here is a general lesson, not a sunnah to do, and is left out.
HINT_TOPICS = [
    ("sunan_dhikr", r"(ذكر|دعاء|الدعاء|تسبيح|تهليل|تحميد|استغفار|القرآن|قراءة|سورة|آية|الصلاة على النبي|تلاوة|التعوذ|الاستعاذة)"),
    ("sunan_purity", r"(وضوء|الوضوء|غسل|السواك|الطهارة|التيمم|الفطرة|لباس|اللباس|الثياب|النعل|الاستنجاء|قضاء الحاجة|الخلاء|الطيب|الزينة|الشعر|الأظفار|الخضاب|الخاتم)"),
    ("sunan_salah", r"(الصلاة|صلاة|المسجد|المساجد|الأذان|الإقامة|الركوع|السجود|التشهد|القنوت|الوتر|الجماعة|الصف|الإمام|التكبير|الجلسة|النافلة|التراويح|قيام الليل|الضحى|الاستخارة|الاستسقاء|الكسوف|الجمعة|الخطبة)"),
    ("sunan_siyam", r"(الصيام|الصوم|صوم|الإفطار|السحور|رمضان|الزكاة|الصدقة|الإنفاق|الاعتكاف|التصدق|تفطير)"),
    ("sunan_hajj", r"(الحج|العمرة|الطواف|السعي|عرفة|مزدلفة|الرمي|الإحرام|التلبية|الأضحية|العيد|الهدي)"),
    ("sunan_janaiz", r"(الجنازة|الجنائز|الميت|المريض|عيادة|الرقية|التداوي|الدواء|القبر|التعزية|الدفن|الشفاء)"),
    ("sunan_adab", r"(السلام|الاستئذان|العطاس|الأكل|الطعام|الشراب|المجلس|الضيف|الضيافة|الجار|النوم|السفر|المصافحة|الكلام|الحياء|النكاح|الوليمة|الزواج|الجماع)"),
    ("sunan_akhlaq", r"(الصدق|الصبر|الشكر|التواضع|الرحمة|الرفق|العفو|بر الوالدين|الوالدين|صلة الرحم|الإحسان|كظم الغيظ|الأمانة|حسن الخلق|الابتسامة|الكلمة الطيبة|الإخلاص|التوكل|الزهد|القناعة|التبسم|المعروف|الإصلاح بين)"),
]
HINT_RE = [(sid, re.compile(pat)) for sid, pat in HINT_TOPICS]
TOO_GENERIC = re.compile(r"(نعيم الجنة|عذاب النار|ترك المعاصي|الجهاد|السرايا|المجاهدة|الغزو|العدو|التجار|السوق|الأسواق|الحيلة|الإمارة|الخلافة)")

FORGOTTEN = re.compile(r"(السواك|الضحى|لعق|الاضطجاع|الاستئذان|التيمن|تحنيك|العطاس|المصافحة|الإبراد|النعل|التسمية|الأكل باليمين|الاستخارة|الاعتكاف|صلاة الليل|الوتر|ركعتي الفجر|قبل المغرب|ثلاثة أيام|الأيام البيض|الاثنين والخميس|عرفة|عاشوراء|شوال|السحور|تعجيل الفطر|الدعاء بين الأذان|إجابة المؤذن|تحية المسجد|السلام|التبسم|إماطة الأذى|زيارة المريض|الصدقة الخفية|بر الوالدين|صلة الرحم|الوضوء قبل النوم|نفض الفراش|الأذكار|الاستغفار)")

BOOK_PAT = [
    ("البخاري", "bukhari"), ("مسلم", "muslim"), ("أبو داود", "abudawud"), ("أبي داود", "abudawud"),
    ("النسائي", "nasai"), ("ابن ماجه", "ibnmajah"), ("الترمذي", "tirmidhi"), ("مالك", "malik"),
]
NOM = {"bukhari": "البخاري", "muslim": "مسلم", "abudawud": "أبو داود", "nasai": "النسائي",
       "ibnmajah": "ابن ماجه", "tirmidhi": "الترمذي", "malik": "مالك"}


def attribution(a):
    a = (a or "").strip()
    if not a or "\n" in a or len(a) > 60:
        # long notes ("حديث أنس رواه مسلم ... ") are ambiguous about which text is which
        books = [b for pat, b in BOOK_PAT if pat in a]
        return a.split("\n")[0][:60] if (books and "\n" not in a) else None
    if "متفق عليه" in a:
        return "متفق عليه"
    books = []
    for pat, b in BOOK_PAT:
        if pat in a and b not in books:
            books.append(b)
    if not books:
        return None
    return "رواه " + " و".join(NOM[b] for b in books[:3])


def first_paragraph(h):
    t = (h or "").strip().split("\n")[0].strip()
    t = re.sub(r"\s+", " ", t)
    return t


def quote_of(h):
    m = re.search(r"[«\"](.+?)[»\"]", h)
    return m.group(1) if m else None


def number_in_corpus(h, books):
    """Hadith number(s) when the same matn is in the bundled collections."""
    q = quote_of(h)
    if not q:
        return []
    words = [corpus.norm(w) for w in q.split() if corpus.norm(w)]
    if len(words) < 5:
        return []
    anchor = words[:6]
    out = []
    for b in books:
        for item in corpus.hadiths(b):
            t = item.get("t") or ""
            if not t:
                continue
            _, nt = corpus.tokens(t)
            if corpus.locate(nt, anchor):
                out.append((b, item["a"]))
                break
    return out


def statement(hint):
    t = re.sub(r"\s+", " ", hint).strip()
    t = re.split(r"(?<=[.؟!])\s", t)[0]
    t = re.sub(r"[;؛].*$", "", t) if len(t) > 150 else t
    t = t.rstrip(" .؛،")
    if len(t) > 190:
        cut = t.rfind("،", 0, 170)
        t = t[: cut if cut > 60 else 170]
    return t


def main():
    src = json.loads(Path(sys.argv[1]).read_text(encoding="utf8"))
    db = json.load(open(ADHKAR, encoding="utf8"))
    secs = db["sections"]
    by_id = {s["id"]: s for s in secs}
    existing = {corpus.norm(i["text"]) for s in secs for i in s["content"]}
    curated_quotes = {corpus.norm(i.get("benefit", "") + i.get("source_label", ""))[:60] for i in by_id["sunan"]["content"]}

    out = {sid: [] for sid, _, _ in TOPICS}
    forgotten = []
    seen = set()
    n_in = 0
    for h in src.values():
        if not any(g in h["grade"] for g in ("صحيح", "حسن")):
            continue
        cats = " ".join(h.get("categories") or [])
        if SKIP_CATEGORY.search(cats):
            continue
        pick = None
        topic = None
        for hint in h.get("hints") or []:
            hint = hint.strip()
            if not (POS.match(hint) and not NOT_AN_ACT.match(hint) and not NEG.search(hint[:70])) or TOO_GENERIC.search(hint[:120]):
                continue
            t = next((sid for sid, rx in HINT_RE if rx.search(hint[:140])), None)
            if t:
                pick, topic = hint, t
                break
        if not pick:
            continue
        stmt = statement(pick)
        if len(stmt) < 18:
            continue
        att = attribution(h["attribution"])
        body = first_paragraph(h["hadeeth"])
        if not att or not (30 <= len(body) <= 700):
            continue
        key = corpus.norm(stmt)[:48]
        keyb = corpus.norm(body)[:40]
        if key in seen or keyb in seen or corpus.norm(stmt) in existing:
            continue
        seen.add(key)
        seen.add(keyb)
        n_in += 1
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
        item = {
            "text": stmt + ".",
            "benefit": body,
            "source": source,
            "source_label": f"{source} — {h['grade'].split(' ')[0]}",
            "count": 1,
            "count_description": "مرة واحدة",
        }
        out[topic].append(item)
        if FORGOTTEN.search(stmt):
            forgotten.append(item)

    total = sum(len(v) for v in out.values())
    print("accepted", total, {k: len(v) for k, v in out.items()}, "forgotten +", len(forgotten))
    with_num = sum(1 for v in out.values() for i in v if re.search(r"\([^)]*[٠-٩]", i["source"]))
    print("with a verified number:", with_num)
    if DRY:
        import random
        random.seed(3)
        pool = [i for v in out.values() for i in v]
        for i in random.sample(pool, 14):
            print("-", i["text"][:100], "|", i["source"][:50], "|", corpus._TASHKEEL.sub("", i["benefit"])[:90])
        return

    # write sections
    order = [s["id"] for s in secs]
    insert_at = order.index("forgotten_sunnahs")
    for sid, title, _ in reversed(TOPICS):
        if sid in by_id:
            by_id[sid]["content"] = out[sid]
            continue
        secs.insert(insert_at, {"id": sid, "title": title, "content": out[sid]})
    fsec = by_id["forgotten_sunnahs"]
    have = {corpus.norm(i["text"]) for i in fsec["content"]}
    added = 0
    for it in forgotten:
        if corpus.norm(it["text"]) not in have:
            fsec["content"].append(it)
            added += 1
    print("forgotten_sunnahs now", len(fsec["content"]), f"(+{added})")
    json.dump(db, open(ADHKAR, "w", encoding="utf8"), ensure_ascii=False, indent=2)
    print("written")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf8")
    main()
