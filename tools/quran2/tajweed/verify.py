# Usage: TAJWEED_V2=<the model repository> python tools/quran2/tajweed/verify.py 1,2,...,114 [seed]
# Checks every surah: random stretches of every ayah composed from the pieces, against imam.expected.
"""Check the composed phrases (what the app will build from out/*.json) against imam.expected itself, units included."""
import gzip, json, os, random, sys
sys.path.insert(0, os.environ.get('TAJWEED_V2', 'tajweed-v2'))  # HisnLabs Tajweed v2: imam.py
import imam
from imam import Unit, MADD, LONG, NASAL, HARAKAT
RULES = ['NormalMaddRule', 'MonfaselMaddRule', 'MottaselMaddRule', 'MottaselMaddPauseRule', 'LazemMaddRule', 'AaredMaddRule', 'LeenMaddRule', 'Qalqalah']

def variant(e, key):
    if key == 'p' or key not in e: return e['p'], e.get('r', [])
    v = e[key]
    return (v, []) if isinstance(v, str) else (v[0], v[1])

def compose(ayah, a, b):
    ws = ayah['w']; words = ayah['t'][a:b]
    ph, spans, tags, vanish = '', [], [], []
    for k in range(a, b):
        key = 'o' if b - a == 1 else 'i' if k == a else 'w' if k == b - 1 else 'p'
        p, r = variant(ws[k], key)
        o = len(ph)
        spans.append((o, o + len(p)) if p else (o, o))
        tags += [(o + x, o + y, RULES[c]) for x, y, c in r]
        vanish.append(bool(ws[k].get('v')) and k != b - 1)
        ph += p
    word_at = lambda i: next((k for k, (x, y) in enumerate(spans) if x <= i < y), len(spans) - 1)
    units, ruled = [], set()
    for a_, b_, name in tags:
        if name in MADD:
            seg = ph[a_:b_]
            c = next((ch for ch in seg if ch in LONG), None) or (seg[0] if name == 'LeenMaddRule' else None)
            if c is None: continue
            j = seg.index(c); k = j
            while k < len(seg) and seg[k] == c: k += 1
            golden = k - j + (name == 'LeenMaddRule')
            units.append(Unit(a_ + j, a_ + k, 'madd', word_at(a_), golden=golden, allowed=MADD[name][0], rule=name, char=c))
            ruled.update(range(a_ + j, a_ + k))
        elif name == 'Qalqalah':
            q = ph.find('ڇ', a_, b_)
            if q >= 0: units.append(Unit(q, q + 1, 'qalqalah', word_at(q), char='ڇ')); ruled.add(q)
    i = 0
    while i < len(ph):
        j = i
        while j < len(ph) and ph[j] == ph[i]: j += 1
        c, n, w = ph[i], j - i, word_at(i)
        if i not in ruled:
            if c == 'ں': units.append(Unit(i, j, 'ikhfa', w, golden=n, char=c))
            elif c == '۾': units.append(Unit(i, j, 'iqlab', w, golden=n, char=c))
            elif c in NASAL and n >= 3:
                prev_w = word_at(i - 1) if i else w
                kind = 'idgham_ghunnah' if (prev_w != w and vanish[prev_w]) else 'ghunnah'
                units.append(Unit(i, j, kind, prev_w if kind == 'idgham_ghunnah' else w, golden=n, char=c))
            elif c in 'يو' and n >= 3:
                units.append(Unit(i, j, 'idgham_ghunnah', w, golden=n, char=c))
            elif c not in LONG and c not in HARAKAT and n == 2:
                prev_w = word_at(i - 1) if i else w
                if i == spans[w][0] and prev_w != w and vanish[prev_w]:
                    units.append(Unit(i, j, 'idgham', prev_w, golden=2, char=c))
                else:
                    units.append(Unit(i, j, 'shadda', w, golden=2, char=c))
        i = j
    units.sort(key=lambda u: u.s)
    return ph, spans, units

def key(u): return (u.s, u.e, u.kind, u.word, u.golden, tuple(sorted(u.allowed)), u.rule, u.char)

random.seed(int(sys.argv[2]) if len(sys.argv) > 2 else 7)
surahs = [int(x) for x in sys.argv[1].split(',')]
ok = bad = 0; fails = []
for s in surahs:
    data = json.load(gzip.open(os.path.join(os.environ.get('OUT', 'public/data/quran2/tajweed'), f'{s:03d}.json.gz')))
    for ai, ayah in enumerate(data):
        n = len(ayah['t'])
        tries = [(0, n)] + [(lambda a: (a, random.randint(a + 1, n)))(random.randint(0, n - 1)) for _ in range(5)]
        for a, b in tries:
            ref = imam.expected(ayah['t'][a:b])
            ph, spans, units = compose(ayah, a, b)
            good = ph == ref.phonemes and spans == [tuple(x) for x in ref.spans] and [key(u) for u in units] == [key(u) for u in ref.units]
            if good: ok += 1
            else:
                bad += 1
                if len(fails) < 6: fails.append((s, ai + 1, a, b, ph == ref.phonemes, spans == [tuple(x) for x in ref.spans], [key(u) for u in units][:6], [key(u) for u in ref.units][:6]))
print('ok', ok, 'bad', bad)
for f in fails: print(f)
