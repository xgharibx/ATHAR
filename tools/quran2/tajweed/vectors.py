# Usage (in the HisnLabs Tajweed v2 repository, with onnx/model-int8.onnx): python vectors.py
# Writes vectors.json and mel112.json; tools/quran2/tajweed/fixtures.py turns them into tests/fixtures/quran2-tajweed/.
"""Test vectors for the app's port of imam.py: real recitations (everyayah, two reciters) heard by the model, the
passage as recited, and the remarks; plus the same scripts with mistakes put in by hand."""
import json, os, random, subprocess, sys, wave
import numpy as np
sys.path.insert(0, '.')
from inference import hear
import imam
from quran_transcript import Aya

AYAHS = [(1, 1), (1, 2), (1, 4), (1, 6), (1, 7), (2, 2), (2, 4), (2, 5), (2, 255), (3, 8), (12, 4), (18, 1), (18, 10), (18, 23),
         (19, 4), (20, 25), (36, 1), (36, 9), (55, 13), (67, 1), (67, 2), (78, 40), (97, 1), (103, 3), (108, 1), (112, 1),
         (112, 2), (112, 4), (113, 1), (113, 5), (114, 1), (114, 6), (2, 23), (4, 1), (24, 35)]
RECITERS = ['Alafasy_128kbps', 'Husary_128kbps']

def wav16(path):
    out = path.replace('.mp3', '.wav')
    if not os.path.exists(out):
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', path, '-ar', '16000', '-ac', '1', '-sample_fmt', 's16', out], check=True)
    with wave.open(out) as f:
        return np.frombuffer(f.readframes(f.getnframes()), '<i2').astype(np.float32) / 32768

def ref_json(r):
    return {'words': r.words, 'phonemes': r.phonemes, 'spans': [list(x) for x in r.spans], 'index': r.index, 'stops': r.stops,
            'restarts': r.restarts, 'ends': r.ends,
            'units': [[u.s, u.e, u.kind, u.word, u.golden, sorted(u.allowed), u.rule, u.char] for u in r.units]}

def notes_json(ws):
    return [{'word': w['word'], 'index': w['index'], 'stop': w['stop'], 'ok': w['ok'],
             'notes': [{'rule': n['rule'], 'severity': n['severity'], 'pos': n['pos'], 'msg': n['msg']['ar']} for n in w['notes']],
             'madd': [[m['rule'], m['heard']] for m in w['madd']]} for w in ws]

def perturb(heard, rnd):
    h = list(heard)
    for _ in range(rnd.randint(1, 4)):
        if not h: break
        p = rnd.randrange(len(h)); kind = rnd.random()
        if kind < 0.3 and h[p] in 'اۥۦ':  # shorten a madd
            while p < len(h) and h[p] in 'اۥۦ': h.pop(p); break
        elif kind < 0.5: h.insert(p, h[p])          # lengthen a sound
        elif kind < 0.7: h[p] = rnd.choice('بتدذرزسصطعقكلمنهو')  # another letter
        elif kind < 0.85: h.pop(p)
        else: h[p] = rnd.choice('َُِ')
    return ''.join(h)

rnd = random.Random(5)
os.makedirs('audio', exist_ok=True)
out = []
for rec in RECITERS:
    for s, a in AYAHS:
        mp3 = f'audio/{rec}_{s:03d}{a:03d}.mp3'
        if not os.path.exists(mp3):
            subprocess.run(['curl', '-s', '-o', mp3, f'https://everyayah.com/data/{rec}/{s:03d}{a:03d}.mp3'], check=True)
        audio = wav16(mp3)
        if len(audio) > 16000 * 29: continue  # one call: up to 30 s
        heard, probs, times = hear(audio, 'hafs', model='onnx/model-int8.onnx')
        words = Aya(s, a).get().uthmani.split(' ')
        ref = imam.recited(words, heard, riwaya='hafs')
        tempo = []
        ws = imam.listen(ref, heard, heard_probs=probs, min_prob=0.3, min_prob_jali=0.7, langs=('ar',), heard_times=times, tempo=tempo)
        out.append({'s': s, 'a': a, 'reciter': rec, 'heard': heard, 'probs': probs, 'times': times, 'ref': ref_json(ref), 'listen': notes_json(ws)})
        for k in range(3):
            h2 = perturb(heard, rnd)
            ref2 = imam.recited(words, h2, riwaya='hafs')
            ws2 = imam.listen(ref2, h2, langs=('ar',))
            out.append({'s': s, 'a': a, 'reciter': rec + ':perturbed', 'heard': h2, 'probs': None, 'times': None, 'ref': ref_json(ref2), 'listen': notes_json(ws2)})
        print(rec, s, a, len(heard), sum(1 for w in ws if not w['ok']), flush=True)
json.dump(out, open('vectors.json', 'w'), ensure_ascii=False)
# One clip's features, to check the app's log-mel against faster-whisper's.
from faster_whisper.feature_extractor import FeatureExtractor
audio = wav16('audio/Alafasy_128kbps_112001.mp3')
lead = np.zeros(int(16000 * 0.4), np.float32)
x = np.concatenate([lead, audio, lead])
mel = FeatureExtractor(feature_size=80)(x, padding=0)
mel = mel[:, : min(3000, mel.shape[1] // 2 * 2)]
json.dump({'samples': [float(v) for v in audio[:16000 * 3]], 'n': int(len(audio)), 'shape': list(mel.shape),
           'cols': {str(c): [float(v) for v in mel[:, c]] for c in (0, 1, 50, 100, mel.shape[1] // 2, mel.shape[1] - 1)},
           'mean': float(mel.mean()), 'max': float(mel.max())}, open('mel112.json', 'w'))
print('vectors', len(out))
