import gzip, json, base64, wave, numpy as np
from faster_whisper.feature_extractor import FeatureExtractor
v = json.load(open('vectors.json'))
for x in v:
    if x['probs']: x['probs'] = [round(p, 5) for p in x['probs']]
    if x['times']: x['times'] = [round(t, 5) for t in x['times']]
need = sorted({(x['s'], x['a']) for x in v})
pieces = {}
for s, a in need:
    data = json.load(gzip.open(f'public/data/quran2/tajweed/{s:03d}.json.gz'))
    pieces[f'{s}:{a}'] = data[a - 1]
out = 'tests/fixtures/quran2-tajweed/'
json.dump({'pieces': pieces, 'vectors': v}, open(out + 'vectors.json', 'w'), ensure_ascii=False, separators=(',', ':'))
with wave.open('audio/Alafasy_128kbps_112001.wav') as f:
    raw = f.readframes(f.getnframes())
audio = np.frombuffer(raw, '<i2').astype(np.float32) / 32768
lead = np.zeros(int(16000 * 0.4), np.float32)
x = np.concatenate([lead, audio, lead])
mel = FeatureExtractor(feature_size=80)(x, padding=0)
mel = mel[:, : min(3000, mel.shape[1] // 2 * 2)]
real = [y for y in v if y['s'] == 112 and y['a'] == 1 and y['reciter'] == 'Alafasy_128kbps'][0]
json.dump({'pcm16': base64.b64encode(raw).decode(), 'shape': list(mel.shape),
           'cols': {str(c): [round(float(t), 5) for t in mel[:, c]] for c in (0, 1, 37, 100, mel.shape[1] // 2, mel.shape[1] - 1)},
           'mean': float(mel.mean()), 'max': float(mel.max()), 'heard': real['heard']}, open(out + 'mel-112-1.json', 'w'))
print(len(need), 'ayahs')
