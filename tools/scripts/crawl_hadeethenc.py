"""
Fetch curated hadith (text, grade, source, explanation) from hadeethenc.com —
the Islamic House hadith encyclopedia the app already uses for «حديث اليوم» —
for the categories about worship practice and etiquette.

    python tools/scripts/crawl_hadeethenc.py <out.json> [category ids...]

Polite by design: a handful of parallel requests, retries with backoff, and the
result is cached on disk so a re-run only fetches what is missing.
"""
import json
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

API = "https://hadeethenc.com/api/v1"


def get(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "athar-content-sync"}), timeout=40) as r:
                return json.loads(r.read().decode("utf8"))
        except Exception:
            time.sleep(1.5 * (i + 1))
    return None


def category_tree():
    cats = get(f"{API}/categories/list/?language=ar") or []
    return {c["id"]: c for c in cats}


def descendants(cats, root_ids):
    out = set(root_ids)
    changed = True
    while changed:
        changed = False
        for c in cats.values():
            if c["parent_id"] in out and c["id"] not in out:
                out.add(c["id"])
                changed = True
    return out


def list_ids(cat_id):
    ids = []
    page = 1
    while True:
        d = get(f"{API}/hadeeths/list/?language=ar&category_id={cat_id}&page={page}&per_page=100")
        if not d or not d.get("data"):
            break
        ids += [x["id"] for x in d["data"]]
        meta = d.get("meta", {})
        if page >= int(meta.get("last_page", 1)):
            break
        page += 1
    return ids


def main():
    out_path = Path(sys.argv[1])
    roots = sys.argv[2:] or ["121", "125", "126", "265", "266", "267", "268", "269", "12"]
    cats = category_tree()
    wanted = descendants(cats, roots)
    cache = json.loads(out_path.read_text(encoding="utf8")) if out_path.exists() else {}
    ids = {}
    with ThreadPoolExecutor(max_workers=6) as ex:
        for cid, lst in zip(sorted(wanted), ex.map(list_ids, sorted(wanted))):
            for hid in lst:
                ids.setdefault(hid, []).append(cid)
    todo = [h for h in ids if h not in cache]
    print(f"categories {len(wanted)}, hadith {len(ids)}, to fetch {len(todo)}", flush=True)

    def one(hid):
        d = get(f"{API}/hadeeths/one/?language=ar&id={hid}")
        return hid, d

    done = 0
    with ThreadPoolExecutor(max_workers=8) as ex:
        for hid, d in ex.map(one, todo):
            if d and d.get("hadeeth"):
                d["categories"] = [cats[c]["title"] for c in ids[hid] if c in cats]
                d["category_ids"] = ids[hid]
                cache[hid] = d
            done += 1
            if done % 200 == 0:
                out_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf8")
                print(f"{done}/{len(todo)}", flush=True)
    out_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf8")
    print("saved", len(cache))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf8")
    main()
