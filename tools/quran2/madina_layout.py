# Usage: python tools/quran2/madina_layout.py public/data/quran2/madina-layout.json.gz
"""The layout of the Madina mushaf's 604 pages, kept in the app so the printed page opens with no connection:
for every word (and every ayah's end marker), its line (1–15) and its glyph code in the page's own font (QCF V2),
from Quran.com's API v4 (mushaf 1). The words themselves stay the section's Tanzil text; only where each one
stands is taken. Written as [[verse_key, [[position (0 for the end marker), line, code], …]], …] per page."""
import gzip, json, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

UA = {'User-Agent': 'Mozilla/5.0 (compatible; athar-build/1.0)'}


def page(p):
    url = f'https://api.quran.com/api/v4/verses/by_page/{p}?words=true&word_fields=code_v2,line_number&mushaf=1&per_page=50'
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                body = json.load(r)
            break
        except Exception:
            if attempt == 4:
                raise
            time.sleep(2 ** attempt)
    out = []
    for v in body['verses']:
        words = []
        for w in v['words']:
            if w['char_type_name'] not in ('word', 'end'):
                continue
            words.append([w['position'] if w['char_type_name'] == 'word' else 0, w['line_number'], w['code_v2']])
        out.append([v['verse_key'], words])
    return out


with ThreadPoolExecutor(6) as pool:
    pages = list(pool.map(page, range(1, 605)))
assert len(pages) == 604 and all(pages)
raw = json.dumps(pages, ensure_ascii=False, separators=(',', ':')).encode()
with gzip.GzipFile(sys.argv[1], 'wb', compresslevel=9, mtime=0) as f:
    f.write(raw)
print('pages', len(pages), 'verses', sum(len(p) for p in pages), 'raw', len(raw))
