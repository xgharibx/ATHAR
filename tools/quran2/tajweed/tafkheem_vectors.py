# Usage: pip install quran-transcript==0.6.4 levenshtein; python tools/quran2/tajweed/tafkheem_vectors.py <dir with imam.py> > tests/fixtures/quran2-tajweed/tafkheem.json
"""Test vectors for tafkhim / tarqiq (tests/quran2Tajweed.test.ts): for random stretches of random ayahs (one breath),
the tafkhim the phonetizer gives their ر / ل / ا sound groups, and the remarks imam.py makes when the model hears
some of them the other way (heard = the expected script, the labels of a few groups turned)."""
import json, random, sys
sys.path.insert(0, sys.argv[1])
import imam
from quran_transcript import Aya, quran_phonetizer, MoshafAttributes
M = MoshafAttributes(rewaya='hafs', madd_monfasel_len=4, madd_mottasel_len=4, madd_mottasel_waqf=4, madd_aared_len=4)
CODE = {'mofakham': 'm', 'moraqaq': 'r', 'low_mofakham': 'l'}
TURN = {'mofakham': 'moraqaq', 'moraqaq': 'mofakham', 'low_mofakham': 'moraqaq'}
SIFAT = list(imam.SIFAT) if hasattr(imam, 'SIFAT') else None
random.seed(7)
out = []
picks = [(112, 1), (1, 2), (2, 255), (67, 1), (18, 1), (2, 20), (55, 13), (24, 35)]
while len(picks) < 140:
    s = random.randint(1, 114)
    n = Aya(s, 1).get().num_ayat_in_sura
    picks.append((s, random.randint(1, n)))
for s, a in picks:
    words = Aya(s, a).get().uthmani.split(' ')
    n = len(words)
    spans = [(0, n)] + [tuple(sorted(random.sample(range(n + 1), 2))) for _ in range(2)]
    for x, y in spans:
        if y <= x:
            continue
        o = quran_phonetizer(' '.join(words[x:y]), M, remove_spaces=True)
        at, want = 0, []
        for g in o.sifat:
            if g.phonemes[0] in 'رلا':
                want.append([at, CODE[g.tafkheem_or_taqeeq]])
            at += len(g.phonemes)
        ref = imam.expected(words[x:y])
        assert ref.phonemes == o.phonemes
        # heard as expected, with a few ر / ل / ا groups turned
        heard_sifat, turned = [], []
        for k, g in enumerate(ref.sifat):
            t = g.tafkheem_or_taqeeq
            if g.phonemes[0] in 'رلا' and random.random() < 0.35:
                t = TURN[t]
                turned.append(k)
            heard_sifat.append([g.phonemes, g.hams_or_jahr, g.shidda_or_rakhawa, t, g.itbaq, g.safeer, g.qalqla, g.tikraar, g.tafashie, g.istitala, g.ghonna])
        res = imam.listen(ref, ref.phonemes, heard_sifat=heard_sifat, langs=('ar',))
        notes = [[k, nn['pos'], nn['expected'], nn['heard'], nn['msg']['ar']] for k, w in enumerate(res) for nn in w['notes'] if nn['rule'] == 'tafkheem_or_taqeeq']
        out.append({'s': s, 'a': a, 'from': x, 'to': y, 'want': want, 'heard': [[g[0], g[3]] for g in heard_sifat], 'notes': notes})
json.dump(out, sys.stdout, ensure_ascii=False, separators=(',', ':'))
