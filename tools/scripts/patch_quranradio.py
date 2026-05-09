"""Patch QuranRadioFab.tsx: add aria-pressed and aria-label to station and play buttons."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\components\layout\QuranRadioFab.tsx'
content = open(path, 'r', encoding='utf-8').read()

patches = [
    # Station buttons: add aria-pressed and aria-label
    (
        '            key={i}\n              onClick={() => playRadio(i)}\n              className={cn(',
        '            key={i}\n              onClick={() => playRadio(i)}\n              aria-pressed={radio.playing && radio.stationIdx === i}\n              aria-label={`\u062a\u0634\u063a\u064a\u0644 \u0645\u062d\u0637\u0629 ${station.label}`}\n              className={cn('
    ),
    # Play/stop button: add aria-label
    (
        '          onClick={() => { toggleRadio(); if (radio.playing) setOpen(false); }}\n          className={cn(',
        '          onClick={() => { toggleRadio(); if (radio.playing) setOpen(false); }}\n          aria-label={radio.playing ? "\u0625\u064a\u0642\u0627\u0641 \u0628\u062b \u0631\u0627\u062f\u064a\u0648 \u0627\u0644\u0642\u0631\u0622\u0646" : "\u062a\u0634\u063a\u064a\u0644 \u0631\u0627\u062f\u064a\u0648 \u0627\u0644\u0642\u0631\u0622\u0646"}\n          className={cn('
    ),
]

for old, new in patches:
    if old in content:
        content = content.replace(old, new, 1)
        print(f'PATCHED: {repr(old[:70])}')
    elif new in content:
        print(f'ALREADY_HAS: {repr(old[:70])}')
    else:
        print(f'NOT_FOUND: {repr(old[:70])}')

open(path, 'w', encoding='utf-8').write(content)
print('Done.')
