"""
Turn the Wikisource texts of Ibn al-Qayyim's books into «تدبر اليوم» passages.

A passage is one whole paragraph of the book, unchanged, that is short enough for
a card and reads on its own: it ends a sentence, quotes no isnad or footnote,
and is not a heading or a list. Nothing is paraphrased.

    python tools/scripts/extract_wisdom.py <wikisource.json> <out.json>
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import corpus  # noqa: E402

SOURCE_OF = {
    "كتاب الفوائد": "ابن القيم — كتاب الفوائد",
    "الداء والدواء": "ابن القيم — الداء والدواء",
    "الوابل الصيب": "ابن القيم — الوابل الصيب",
    "مدارج السالكين": "ابن القيم — مدارج السالكين",
    "الجواب الكافي": "ابن القيم — الجواب الكافي",
    "إغاثة اللهفان": "ابن القيم — إغاثة اللهفان",
    "طريق الهجرتين": "ابن القيم — طريق الهجرتين",
    "عدة الصابرين": "ابن القيم — عدة الصابرين",
    "روضة المحبين": "ابن القيم — روضة المحبين",
    "مفتاح دار السعادة": "ابن القيم — مفتاح دار السعادة",
    "التحفة العراقية": "ابن تيمية — التحفة العراقية",
    "صيد الخاطر": "ابن الجوزي — صيد الخاطر",
    "جامع العلوم والحكم": "ابن رجب — جامع العلوم والحكم",
}


def clean_wikitext(t):
    t = re.sub(r"<ref[^>]*>.*?</ref>", "", t, flags=re.S)
    t = re.sub(r"<[^>]+>", "", t)
    t = re.sub(r"\{\{[^{}]*\}\}", "", t)
    t = re.sub(r"\{\{[^{}]*\}\}", "", t)
    t = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", t)
    t = re.sub(r"'''?", "", t)
    t = re.sub(r"^=+.*?=+\s*$", "", t, flags=re.M)
    t = re.sub(r"^[*#:;]+\s*", "", t, flags=re.M)
    return t


BAD = re.compile(r"(\{|\}|\[|\]|http|\||=|حدثنا|أخبرنا|ص\s*\d|\(\d|فصل|باب |انتهى|إلخ|\.\.\.|…|☆|\*|:\s*$)")
ENDS = re.compile(r"[.؟!»”\"]$")


def paragraphs(text):
    for block in re.split(r"\n\s*\n", clean_wikitext(text)):
        p = re.sub(r"\s+", " ", block).strip()
        yield p


CONNECT = re.compile(r"^(و|ف|ثم|لكن|ولكن|لكنه|وأما|فأما|أما|فإن|وإن|فإذا|وإذا|إذ|لأن|ولأن|وهذا|وهذه|فهذا|فهذه|وذلك|فذلك|وقد|فقد|بل|أي|يعني|وكذلك|فكذلك|وهو|وهي|فهو|فهي|وهم|فهم|وكل|وفي|وإنما|وأن|وله|ولا|فلا|وقال|فقال|وقوله|فقوله|وتحقيق|ومنها|ومنه|وإما|فإما|وما|ومن|ولما|ولهذا|فلهذا|ولذلك|فلذلك|وليس|وهل|فهل)")
GOOD = re.compile(r"(القلب|العبد|الله|الإيمان|النفس|الذنب|التوبة|الصبر|الشكر|المحبة|الدنيا|الآخرة|العلم|العمل|الذكر|الصدق|الإخلاص|الخوف|الرجاء|التوكل|الزهد|الحياء|الهوى|الشهوة|الطاعة|المعصية|القرآن|الدعاء|الرحمة|النعمة|البلاء|الإحسان|اليقين|الخشوع)")


def sentences(par):
    parts = re.split(r"(?<=[.؟!])\s+", par)
    return [x.strip() for x in parts if x.strip()]


def windows(par):
    sents = sentences(par)
    for i in range(len(sents)):
        if CONNECT.match(corpus._TASHKEEL.sub("", sents[i]).strip().split(" ")[0] if sents[i] else ""):
            continue
        for n in (1, 2, 3, 4):
            chunk = " ".join(sents[i : i + n])
            if len(sents[i : i + n]) < n:
                break
            yield chunk


def main():
    src = json.loads(Path(sys.argv[1]).read_text(encoding="utf8"))
    out, seen = [], set()
    for title, text in src.items():
        book = next((k for k in SOURCE_OF if title.startswith(k)), None)
        if not book:
            continue
        for par in paragraphs(text):
            best = None
            for chunk in windows(par):
                plain = corpus._TASHKEEL.sub("", chunk)
                words = plain.split()
                if not (16 <= len(words) <= 60) or not (110 <= len(plain) <= 380):
                    continue
                if BAD.search(plain) or not ENDS.search(plain):
                    continue
                if re.search(r"[0-9٠-٩]", plain) or "«" in plain or "﴿" in plain or "(" in plain:
                    continue
                if not GOOD.search(plain):
                    continue
                if re.search(r"(قال|وقال|يقول|وقيل|فقيل|سئل|سأل|قالوا|فقالوا)", plain):
                    continue
                # the longest window of this paragraph that passes reads most completely
                if best is None or len(chunk) > len(best):
                    best = chunk
            if not best:
                continue
            key = corpus.norm(best)[:45]
            if key in seen:
                continue
            seen.add(key)
            out.append({"text": best, "source": SOURCE_OF[book]})
    Path(sys.argv[2]).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf8")
    from collections import Counter
    print(len(out), Counter(o["source"] for o in out))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf8")
    main()
