"""
Fetch the text of Ibn al-Qayyim's books from Arabic Wikisource (CC BY-SA 4.0),
one request at a time, backing off when the site asks us to slow down.

    python tools/scripts/fetch_wikisource.py <out.json>

The result is {page title: wikitext}; extract_wisdom.py turns it into the
«تدبر اليوم» pool.
"""
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

BOOKS = [
    "كتاب الفوائد", "الداء والدواء", "الوابل الصيب", "مدارج السالكين", "الجواب الكافي", "إغاثة اللهفان",
    "طريق الهجرتين", "عدة الصابرين", "روضة المحبين", "مفتاح دار السعادة", "التحفة العراقية",
    "صيد الخاطر", "جامع العلوم والحكم",
]


def api(**kw):
    kw["format"] = "json"
    url = "https://ar.wikisource.org/w/api.php?" + urllib.parse.urlencode(kw)
    for i in range(8):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "athar-content-sync (contact: app owner)"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode("utf8"))
        except urllib.error.HTTPError as e:
            time.sleep(5 * (i + 1) if e.code == 429 else 2)
        except Exception:
            time.sleep(3)
    return None


def main():
    out = Path(sys.argv[1])
    texts = json.loads(out.read_text(encoding="utf8")) if out.exists() else {}
    titles = []
    for b in BOOKS:
        r = api(action="query", list="allpages", apprefix=b, aplimit=500)
        titles += [p["title"] for p in (r or {}).get("query", {}).get("allpages", [])]
        time.sleep(1.2)
    print("pages", len(titles), flush=True)
    for t in titles:
        if t in texts:
            continue
        r = api(action="query", prop="revisions", rvprop="content", rvslots="main", titles=t)
        time.sleep(1.2)
        pages = (r or {}).get("query", {}).get("pages", {})
        for p in pages.values():
            rev = (p.get("revisions") or [{}])[0]
            content = (rev.get("slots", {}).get("main", {}) or {}).get("*") or rev.get("*") or ""
            texts[t] = content
        out.write_text(json.dumps(texts, ensure_ascii=False), encoding="utf8")
        print(t, len(texts[t]) if t in texts else 0, flush=True)
    print("done", len(texts))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf8")
    main()
