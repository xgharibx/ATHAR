# Usage: pip install quran-transcript==0.6.4; OUT=public/data/quran2/tajweed python tools/quran2/tajweed/pieces.py
"""Per-word pronunciation pieces for every ayah, from quran_transcript's phonetizer (Hafs, the lengths imam.py uses).

For each word: its expected phonetic script in four contexts — continuing from the word before and into the word
after (cc), starting a breath (ic), ending a breath (cw, waqf), alone (iw) — with the tajweed rules the phonetizer
tags on it (madd kinds, qalqalah), relative to the piece, and whether its nun / tanween vanishes into the next word.
A phrase [a, b) of an ayah is then ic[a] + cc[a+1 .. b-2] + cw[b-1] (or iw[a] alone): verify.py checks this
against the phonetizer itself.

With each piece, the tafkhim / tarqiq the phonetizer gives the sound groups that start in it with ر, ل or ا (what a
teacher corrects: the ر, the lam of the Name, the alif after them), as "offset + m|r|l" (mofakham, moraqaq,
low_mofakham): f for the continuous piece, fi / fw / fo where another context changes them."""
import gzip, json, sys, os
from multiprocessing import Pool
from quran_transcript import Aya, quran_phonetizer, MoshafAttributes
M = MoshafAttributes(rewaya='hafs', madd_monfasel_len=4, madd_mottasel_len=4, madd_mottasel_waqf=4, madd_aared_len=4)
TAFKHEEM = {'mofakham': 'm', 'moraqaq': 'r', 'low_mofakham': 'l'}
RULES = ['NormalMaddRule', 'MonfaselMaddRule', 'MottaselMaddRule', 'MottaselMaddPauseRule', 'LazemMaddRule', 'AaredMaddRule', 'LeenMaddRule', 'Qalqalah']
CTX = 3

def run(words):
    o = quran_phonetizer(' '.join(words), M, remove_spaces=True)
    ph, mp = o.phonemes, o.mappings
    spans, pos, starts = [], 0, []
    for w in words:
        starts.append(pos)
        ps = [m.pos for m in mp[pos:pos + len(w)] if m.pos[1] > m.pos[0]]
        spans.append((min(p[0] for p in ps), max(p[1] for p in ps)) if ps else (spans[-1][1] if spans else 0,) * 2)
        pos += len(w) + 1
    groups, at = [], 0
    for g in o.sifat:
        groups.append((at, g.phonemes, g.tafkheem_or_taqeeq))
        at += len(g.phonemes)
    assert at == len(ph), (words, at, len(ph))
    return ph, mp, spans, starts, groups

def tafkheem(groups, a, b):
    """the ر / ل / ا groups starting in [a, b): "offset + m|r|l" each"""
    return ''.join(f'{at - a}{TAFKHEEM[t]}' for at, g, t in groups if a <= at < b and g[0] in 'رلا')

def piece(words, k):
    """word k of `words`: its script, its rules relative to its span, whether it vanishes into the next word, its tafkhim"""
    ph, mp, spans, starts, groups = run(words)
    a, b = spans[k]
    w = words[k]; p0 = starts[k]
    rules = []
    for m in mp[p0:p0 + len(w)]:
        for r in m.tajweed_rules or []:
            name = type(r).__name__
            if name in RULES:
                ra, rb = m.pos
                assert a <= ra <= rb <= b or ra == rb, (words, k, name, m.pos, (a, b))
                rules.append([ra - a, rb - a, RULES.index(name)])
    vanish = any(m.deleted for m in mp[p0:p0 + len(w)][-3:]) and (w.rstrip('ْۡ').endswith('ن') or any(c in w for c in 'ًࣰٌࣱٍࣲ'))
    return ph[a:b], rules, vanish, tafkheem(groups, a, b)

def pieces_of(words, ph, mp, spans, starts, groups, k):
    a, b = spans[k]
    w = words[k]; p0 = starts[k]
    rules = []
    for m in mp[p0:p0 + len(w)]:
        for r in m.tajweed_rules or []:
            name = type(r).__name__
            if name in RULES:
                ra, rb = m.pos
                rules.append([max(0, ra - a), max(0, min(rb, b) - a), RULES.index(name)])
    vanish = any(m.deleted for m in mp[p0:p0 + len(w)][-3:]) and (w.rstrip('ْۡ').endswith('ن') or any(c in w for c in 'ًࣰٌࣱٍࣲ'))
    return ph[a:b], rules, vanish, tafkheem(groups, a, b)

def ayah(sa):
    s, a = sa
    words = Aya(s, a).get().uthmani.split(' ')
    n = len(words)
    # continuing on both sides: the whole ayah read in one breath, so the pieces join exactly
    full = run(words)
    out = []
    for k in range(n):
        cc = pieces_of(words, *full, k)
        ic = piece(words[k:min(n, k + CTX + 1)], 0)
        cw = piece(words[max(0, k - CTX):k + 1], k - max(0, k - CTX))
        iw = piece([words[k]], 0)
        out.append([cc, ic, cw, iw])
    return s, a, words, out

if __name__ == '__main__':
    todo = []
    info = {}
    for s in range(1, 115):
        nA = Aya(s, 1).get().num_ayat_in_sura
        todo += [(s, a) for a in range(1, nA + 1)]
    only = sys.argv[1:] and [int(x) for x in sys.argv[1].split(',')]
    if only: todo = [x for x in todo if x[0] in only]
    out_dir = os.environ.get('OUT', 'out')
    os.makedirs(out_dir, exist_ok=True)
    res = {}
    with Pool(int(os.environ.get('PROCS', '4'))) as pool:
        for s, a, words, out in pool.imap_unordered(ayah, todo, chunksize=4):
            res[(s, a)] = (words, out)
    for s in sorted({x[0] for x in todo}):
        ayahs = []
        for a in range(1, max(x[1] for x in todo if x[0] == s) + 1):
            words, out = res[(s, a)]
            ws = []
            for (cc, ic, cw, iw) in out:
                # store the continuous piece; the others only where they differ from it
                base = cc if cc is not None else ic
                e = {'p': base[0]}
                if base[1]: e['r'] = base[1]
                if base[2]: e['v'] = 1
                if base[3]: e['f'] = base[3]
                for key, alt in (('i', ic), ('w', cw), ('o', iw)):
                    if alt[0] != base[0] or alt[1] != base[1]:
                        e[key] = [alt[0], alt[1]] if alt[1] else alt[0]
                    if alt[3] != base[3]:
                        e['f' + key] = alt[3]
                ws.append(e)
            ayahs.append({'t': words, 'w': ws})
        raw = json.dumps(ayahs, ensure_ascii=False, separators=(',', ':')).encode()
        # The app reads public/data/quran2/tajweed/NNN.json.gz (src/quran2/tajweed/pieces.ts).
        with gzip.GzipFile(os.path.join(out_dir, f'{s:03d}.json.gz'), 'wb', compresslevel=9, mtime=0) as f:
            f.write(raw)
    print('done', len(todo))
