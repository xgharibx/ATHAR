"""
Build «دعاء الصحابة»: supplications the Companions themselves made, cut from the
hadith and Muwatta texts bundled with the app. Each item names who said it as the
hadith itself reports it, and where it is reported.

    python tools/scripts/build_sahaba_duas.py [--dry-run]
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import corpus  # noqa: E402
from build_dua_sections import NOM, digits, grade_word, pick_hadith  # noqa: E402

DRY = "--dry-run" in sys.argv
ADHKAR = corpus.DATA / "adhkar.json"

# (anchor, end, who and when, as the hadith reports it)
SPECS = [
    ("اللهم انا كنا نتوسل اليك بنبينا فتسقينا", None, "دعاء عمر بن الخطاب رضي الله عنه في الاستسقاء بالعباس"),
    ("اللهم ارزقني شهادة في سبيلك واجعل موتي في بلد رسولك", None, "دعاء عمر بن الخطاب رضي الله عنه"),
    ("اللهم كبرت سني وضعفت قوتي", "مفرط", "دعاء عمر بن الخطاب رضي الله عنه عند رجوعه من الحج"),
    ("اللهم لا تجعل قتلي بيد رجل صلى لك سجدة", None, "كان عمر بن الخطاب رضي الله عنه يقوله"),
    ("اللهم بين لنا في الخمر بيانا شافيا", None, "دعاء عمر بن الخطاب رضي الله عنه لما نزل تحريم الخمر"),
    ("اللهم انك قلت ادعوني استجب لكم", None, "كان عبد الله بن عمر رضي الله عنهما يدعو به على الصفا"),
    ("اللهم اعذه من عذاب القبر", None, "دعاء أبي هريرة رضي الله عنه في صلاة الجنازة على صبي"),
    ("اللهم انك تعلم ان ليس احد احب الي ان اجاهد فيك", None, "دعاء سعد بن معاذ رضي الله عنه بعد جرحه يوم الخندق"),
    ("ربنا ولك الحمد حمدا كثيرا طيبا مباركا فيه", "فيه", "قاله رجل من الصحابة خلف النبي ﷺ بعد الرفع من الركوع"),
    ("الله اكبر كبيرا والحمد لله كثيرا وسبحان الله بكرة واصيلا", None, "قاله رجل من الصحابة في الصلاة خلف النبي ﷺ"),
    ("الحمد لله حمدا كثيرا طيبا مباركا فيه", None, "قاله رجل من الصحابة حين دخل الصف في الصلاة"),
    ("اللهم اني اعتذر اليك مما صنع هؤلاء", None, "قاله أنس بن النضر رضي الله عنه يوم أحد"),
    ("اللهم صبرا او الله المستعان", None, "قاله عثمان بن عفان رضي الله عنه حين بُشّر بالجنة على بلوى تصيبه"),
    ("اللهم اني احمدك واستعينك على قريش ان يقيموا دينك", "دينك", "كان بلال رضي الله عنه يقوله قبل أذان الفجر"),
    ("اللهم اني اسالك يا الله بانك الواحد الاحد الصمد", None, "دعاء رجل من الصحابة في تشهده، فقال النبي ﷺ: قد غفر له"),
    ("اللهم اني قد تصدقت بعرضي على عبادك", None, "كان أبو ضمضم رضي الله عنه يقوله إذا أصبح"),
    ("اللهم اجعلني من ائمة المتقين", None, "دعاء عبد الله بن عمر رضي الله عنهما"),
    ("اللهم لا تخرج نفسي حتى تقر عيني من بني قريظة", None, "دعاء سعد بن معاذ رضي الله عنه بعد جرحه"),
]


def main():
    db = json.load(open(ADHKAR, encoding="utf8"))
    secs = db["sections"]
    items = []
    for anchor, end, who in SPECS:
        hit = pick_hadith(anchor, end)
        if not hit:
            print("DROPPED:", anchor)
            continue
        book, h, piece = hit
        src = f"رواه {NOM[book]} ({digits(h['a'])})"
        grade = "" if book in ("bukhari", "muslim", "malik") else f" — {grade_word(book, h.get('g', []))}"
        items.append({"text": piece, "benefit": who, "source": src, "source_label": f"{src}{grade}",
                      "count": 1, "count_description": "مرة واحدة"})
    print(len(items), "duas")
    if DRY:
        for i in items:
            print("-", corpus._TASHKEEL.sub("", i["text"])[:80], "|", i["source"], "|", i["benefit"])
        return
    sec = next((s for s in secs if s["id"] == "sahaba_duas"), None)
    if sec:
        sec["content"] = items
    else:
        at = [s["id"] for s in secs].index("prophets_duas") + 1
        secs.insert(at, {"id": "sahaba_duas", "title": "دعاء الصحابة", "content": items})
    json.dump(db, open(ADHKAR, "w", encoding="utf8"), ensure_ascii=False, indent=2)
    print("written")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf8")
    main()
