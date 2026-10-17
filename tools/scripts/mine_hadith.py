"""
Mine the repository's hadith collections for sunan and duas.

Nothing here is written by hand: each candidate is the Prophet's own words (or a
description of what he did) cut from a hadith that is already in
public/data/hadith, with the collection and number it came from. Weakly graded
narrations are dropped, as are prohibitions, stories and anything too long to
read in a card.

    python tools/scripts/mine_hadith.py stats
    python tools/scripts/mine_hadith.py sample sunan 40
"""
import json
import random
import re
import sys
from functools import lru_cache
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import corpus  # noqa: E402

BOOKS = ["bukhari", "muslim", "abudawud", "nasai", "ibnmajah", "tirmidhi", "malik"]

N = corpus.norm
MARK_RASUL = [N(w) for w in "رسول الله صلى الله عليه وسلم".split()]
MARK_NABI = [N(w) for w in "النبي صلى الله عليه وسلم".split()]
SAL = "ﷺ"


def good_grade(book, g):
    if book in ("bukhari", "muslim", "malik"):
        return True
    good = sum(1 for x in g if x in ("sahih", "hasan"))
    bad = sum(1 for x in g if x not in ("sahih", "hasan"))
    return good > bad


def find_seq(nt, seq, start=0):
    n = len(seq)
    for i in range(start, len(nt) - n + 1):
        if nt[i : i + n] == seq:
            return i
    return -1


def tidy(text):
    text = re.sub(r"[\"“”«»]|‏\.‏|‏", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return re.sub(r"[\s.،؛:\-–]+$", "", text)


def matn(text):
    """(kind, body) where kind is 'said' or 'did'; body starts right after the Prophet is named."""
    toks = text.split()
    nt = [N(t) for t in toks]
    for seq in (MARK_RASUL, MARK_NABI):
        i = find_seq(nt, seq)
        if i < 0:
            continue
        end = i + len(seq)
        before = nt[max(0, i - 2) : i]
        rest = toks[end:]
        rest_n = nt[end:]
        if not rest:
            continue
        # "كان رسول الله ﷺ ..." / "أن رسول الله ﷺ كان ..."
        if "كن" in before or (rest_n and rest_n[0] == N("كان")):
            body = rest[1:] if rest_n[0] == N("كان") else rest
            return "did", tidy(" ".join(body)), tidy(" ".join(toks[max(0, i - 1) : i])), toks[i - 1] if i else ""
        # "قال رسول الله ﷺ ..." / "سمعت رسول الله ﷺ يقول ..."
        if rest_n and rest_n[0] in (N("يقول"), N("قال"), N("يقولون")):
            return "said", tidy(" ".join(rest[1:])), "", ""
        if "قل" in before:
            return "said", tidy(" ".join(rest)), "", ""
    return None


@lru_cache(maxsize=None)
def all_hadith():
    out = []
    for b in BOOKS:
        for h in corpus.hadiths(b):
            t = h.get("t") or ""
            if not t or not good_grade(b, h.get("g", [])):
                continue
            out.append((b, h, t))
    return out


TOPICS = [
    ("الطهارة والسواك", "السواك|الوضوء|توضا|الاستنجاء|الخلاء|غسل|الفطره|الاظفار|الشارب|الختان|تيمم"),
    ("الصلاة", "صلي|الصلاه|ركعتين|ركعه|الاذان|المؤذن|المسجد|الصف|التكبير|السجود|الركوع|التشهد|الجماعه|الوتر|الضحي|النافله|الفجر|المغرب|العشاء|الظهر|العصر"),
    ("الذكر والدعاء", "يذكر الله|سبحان|الحمد لله|الاستغفار|الدعاء|يدعو|اللهم|التسبيح|التهليل|التكبير|الصلاه علي|يستغفر"),
    ("القرآن", "القران|يقرا|سوره|اية الكرسي|يتلو|المعوذات"),
    ("الصيام", "صام|الصيام|الصوم|يفطر|السحور|الفطر|رمضان|عاشوراء|عرفه"),
    ("الجمعة والعيد", "الجمعه|العيد|الفطر والاضحي|الخطبه"),
    ("الطعام والشراب", "ياكل|الطعام|الاكل|يشرب|الشراب|الماء|اللبن|التمر|الاناء|العسل|الوليمه|الضيافه"),
    ("النوم والبيت", "ينام|مضجعه|الفراش|النوم|يستيقظ|البيت|دخل بيته|السراج|الباب"),
    ("اللباس والزينة", "لبس|الثوب|النعل|الخاتم|العمامه|الطيب|الترجل|اللحيه|يتطيب|الكحل"),
    ("السلام والآداب", "السلام|يسلم|العطاس|عطس|المصافحه|الاستئذان|المجلس|الكلام|الحياء|الجار|الضيف|الزياره|يتبسم|التبسم|الرفق"),
    ("الأخلاق والمعاملة", "الصدق|الامانه|العفو|الصبر|الاحسان|الصدقه|بر الوالدين|صله الرحم|الزكاه|الصلح|الكلمه الطيبه|اماطه الاذي|المعروف"),
    ("المرض والجنائز", "المريض|عياده|الجنازه|الميت|المقبره|القبر|الدفن|التعزيه|الرقيه"),
    ("السفر والحج", "السفر|الحج|العمره|الطواف|الراحله|يسافر|المسافر|عرفه|منى"),
    ("المسجد والعلم", "المسجد|العلم|طلب العلم|الحلقه|المصحف"),
]
TOPIC_RE = [(name, re.compile(pat)) for name, pat in TOPICS]

# Prohibitions, threats, stories and legal rulings are not "a sunnah to do".
NEGATIVE = re.compile(
    r"^(لا|ولا|لن|ما|لم|نهي|نهانا|نهينا|ويل|اياكم|ليس|من كذب|من غشنا|لعن|لعنه|اللهم ان|ان الله لعن)"
    r"|(حرم|حرام|يحل|عذاب|لعن|النار|يعذب|فاقتلوا|اقتلوا|الحد|حدا|زني|الربا|الخمر|يموت|قتل|سبايا|غنيم|الغزو|الجهاد|المشرك|الكفار|منافق)"
)
STORY = re.compile(r"(فاتاه|فجاء|فاتي|فقال له|قال له|سال|فقلت|فقال لي|فقلنا|فلما|ثم قال|ذات يوم|بينما)")


def topic_of(body_plain):
    n = N(re.sub("صلى الله عليه وسلم", "", body_plain))
    scored = [(len(rx.findall(n)), name) for name, rx in TOPIC_RE]
    top = max(scored)
    return top[1] if top[0] > 0 else None


# Where the narrators start talking about the hadith instead of reporting it.
COMMENT = re.compile(
    r"( قال أبو (عيسى|داود|عبد الرحمن|عبد الله)| قال الشيخ| وفي الباب| قال أبو| وقال [^ ]+ (بن|عن)| ورواه| رواه | قال (مالك|سفيان|شعبة|ابن) )"
)
SAID_START = re.compile(
    r"^(إذا|من|اتقوا|تسحروا|أفشوا|افشوا|أكثروا|اكثروا|صلوا|عليكم|ما من|أحب|خير|أفضل|ابدءوا|ابدؤوا|كلوا|اشربوا|سموا|تداووا|استعينوا|أطعموا|صوموا|بكروا|تصدقوا|تهادوا|تبسمك|الصلاة|الصدقة|الصيام|الدعاء|الوضوء|الطهور|المسلم|حق|ثلاث|ركعتا|السواك|الفطرة|أيما|غطوا|أوكوا|أغلقوا|أطفئوا|استاكوا|سواكوا|تخللوا|خالفوا|أحسنوا|أدوا|أبردوا|عجلوا|لا يزال الناس بخير|الجار|الحياء|الكلمة|الطعام|الماء|يا غلام|أمرت|أمرنا|صلاة|صيام|قيام|من صلى|من صام|من توضأ|من قال|من سبح)"
)
DID_START = re.compile(
    r"^(يحب|يكثر|يعجبه|يصلي|يصوم|يأكل|يقول|يبدأ|يستاك|ينام|يلبس|يتوضأ|يخرج|يدخل|يسلم|يفطر|يقرأ|يدعو|يغتسل|يتطيب|يعتكف|يوتر|يسبح|يستغفر|يتسوك|يلعق|يفطر|يقبل|يشرب|يأمر|يرغب|يحرص|لا يدع|إذا |أول ما|أحب)"
)


def clean_body(body):
    plain = corpus._TASHKEEL.sub("", body)
    m = COMMENT.search(plain)
    if m:
        # cut the ORIGINAL at the same token count
        words_before = len(plain[: m.start()].split())
        body = " ".join(body.split()[:words_before])
    return tidy(body)


def sunan_candidates():
    seen = set()
    out = []
    for b, h, t in all_hadith():
        m = matn(t)
        if not m:
            continue
        kind = m[0]
        body = clean_body(m[1])
        plain = corpus._TASHKEEL.sub("", body)
        if not (35 <= len(plain) <= 240):
            continue
        if "صلى الله عليه وسلم" in plain or re.search(r"(حدثنا|أخبرنا|حدثني|أخبرني)", plain):
            continue
        if plain.count("قال") >= 1 and kind == "said" and not plain.startswith("قل"):
            # dialogue or commentary, not a clean instruction
            if plain.count("قال") >= 2 or " قال " in plain:
                continue
        start = plain.strip()
        if kind == "said" and not SAID_START.match(start):
            continue
        if kind == "did" and not DID_START.match(start):
            continue
        npl = N(plain)
        if NEGATIVE.search(npl) or STORY.search(npl):
            continue
        topic = topic_of(plain)
        if not topic:
            continue
        key = npl[:42]
        if key in seen:
            continue
        seen.add(key)
        text = ("كان النبي ﷺ " if kind == "did" else "قال النبي ﷺ: «") + body + ("" if kind == "did" else "»")
        out.append({"book": b, "a": h["a"], "g": h.get("g", []), "kind": kind, "topic": topic, "text": text, "body": body})
    return out


def dua_candidates():
    seen = set()
    out = []
    for b, h, t in all_hadith():
        m = matn(t)
        if not m:
            continue
        body = m[1]
        plain = corpus._TASHKEEL.sub("", body)
        if not re.match(r"^(اللهم|رب |يا )", plain.strip()):
            continue
        if not (20 <= len(plain) <= 330):
            continue
        if STORY.search(N(plain)):
            continue
        key = N(plain)[:45]
        if key in seen:
            continue
        seen.add(key)
        out.append({"book": b, "a": h["a"], "g": h.get("g", []), "text": body})
    return out


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf8")
    cmd = sys.argv[1] if len(sys.argv) > 1 else "stats"
    if cmd == "stats":
        s = sunan_candidates()
        d = dua_candidates()
        from collections import Counter
        print("sunan", len(s), Counter(x["topic"] for x in s).most_common())
        print("sunan by kind", Counter(x["kind"] for x in s))
        print("duas", len(d))
    elif cmd == "sample":
        pool = sunan_candidates() if sys.argv[2] == "sunan" else dua_candidates()
        random.seed(int(sys.argv[4]) if len(sys.argv) > 4 else 7)
        for x in random.sample(pool, min(int(sys.argv[3]), len(pool))):
            print(f"[{x['book']} {x['a']}] {x.get('topic','')} | {corpus._TASHKEEL.sub('', x['text'])[:230]}")
