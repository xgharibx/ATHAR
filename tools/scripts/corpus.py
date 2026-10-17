"""
Verified-source extraction for the dua and sunnah sections.

Every dua and sunnah the app ships is cut out of text that is already in the
repository (the Quran and six hadith collections under public/data), so its
wording and its number are the book's, not ours. A candidate names where its
text starts and ends; this finds it, and says which book and number it came
from. Nothing is written from memory.

    python tools/scripts/corpus.py find "اللهم اني اعوذ بك من الهم والحزن"
"""
import json
import re
import sys
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "public" / "data"
BOOKS = ["bukhari", "muslim", "abudawud", "nasai", "ibnmajah", "malik"]
BOOK_LABEL = {
    "bukhari": "صحيح البخاري",
    "muslim": "صحيح مسلم",
    "abudawud": "سنن أبي داود",
    "nasai": "سنن النسائي",
    "ibnmajah": "سنن ابن ماجه",
    "malik": "موطأ مالك",
    "nawawi": "الأربعون النووية",
    "qudsi": "الأحاديث القدسية",
}

_TASHKEEL = re.compile("[ؐ-ًؚ-ٰٟۖ-ۭـ࣓-ࣿ]")


def norm(s: str) -> str:
    s = _TASHKEEL.sub("", s)
    s = re.sub("[أإآٱ]", "ا", s)
    s = s.replace("ى", "ي").replace("ة", "ه")
    s = s.replace("ؤ", "و").replace("ئ", "ي").replace("ء", "")
    s = s.replace("ا", "")  # alef is spelled differently across rasm and print; matching ignores it
    return re.sub(r"[^ء-ؿف-ي0-9]", "", s)


@lru_cache(maxsize=None)
def hadiths(book: str):
    d = json.load(open(DATA / "hadith" / f"{book}.json", encoding="utf8"))
    return d["hadiths"]


@lru_cache(maxsize=None)
def quran():
    return json.load(open(DATA / "quran.json", encoding="utf8"))["surahs"]


def tokens(text: str):
    toks = text.split()
    return toks, [norm(t) for t in toks]


def locate(ntoks, anchor_tokens, start=0):
    """Index of the first run of tokens matching the anchor (empty tokens skipped)."""
    idx = [i for i, t in enumerate(ntoks) if t]
    seq = [ntoks[i] for i in idx]
    n = len(anchor_tokens)
    for p in range(len(seq) - n + 1):
        if idx[p] < start:
            continue
        if seq[p : p + n] == anchor_tokens:
            return idx[p], idx[p + n - 1]
    return None


CLEAN = re.compile(r"[\"“”«»]|‏\.‏|‏")


def clean(text: str) -> str:
    text = CLEAN.sub("", text)
    text = re.sub(r"\s+", " ", text).strip()
    return re.sub(r"[\s.,؛:\-–]+$", "", text)


def cut(text: str, start: str, end: str | None, max_tokens=70):
    toks, nt = tokens(text)
    a = [norm(w) for w in start.split() if norm(w)]
    hit = locate(nt, a)
    if not hit:
        return None
    s = hit[0]
    if end:
        b = [norm(w) for w in end.split() if norm(w)]
        e = locate(nt, b, start=s)
        if not e:
            return None
        return clean(" ".join(toks[s : e[1] + 1]))
    out = []
    for t in toks[s : s + max_tokens]:
        out.append(t)
        if re.search(r"[\"”»]|\.‏?$|‏\.", t) and len(out) > 4:
            break
    return clean(" ".join(out))


def find_hadith(start: str, end: str | None = None, books=BOOKS, limit=3):
    res = []
    for b in books:
        for h in hadiths(b):
            t = h.get("t") or ""
            if not t:
                continue
            piece = cut(t, start, end)
            if piece:
                res.append({"book": b, "n": h["n"], "g": h.get("g", []), "text": piece, "full": t})
                if len([r for r in res if r["book"] == b]) >= limit:
                    break
    return res


def find_quran(refs, start: str, end: str):
    """refs: [(surah, ayah), ...] joined in order; returns the exact slice."""
    s = quran()
    text = " ".join(s[su - 1]["ayahs"][ay - 1] for su, ay in refs)
    return cut(text, start, end)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf8")
    if len(sys.argv) >= 3 and sys.argv[1] == "find":
        for r in find_hadith(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)[:8]:
            print(r["book"], r["n"], r["g"], "\n   ", r["text"][:300])
