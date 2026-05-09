"""Phase 56a: Add aria-label to all Slider instances in Settings.tsx."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")

f = root / "src/pages/Settings.tsx"
src = f.read_text(encoding="utf-8")

replacements = [
    # 1. Font scale slider
    (
        '''              <Slider
                value={[prefs.fontScale]}
                min={0.9}
                max={1.6}
                step={0.01}
                onValueChange={(v) => setPrefs({ fontScale: clamp(v[0] ?? 1.05, 0.9, 1.6) })}
              />''',
        '''              <Slider
                value={[prefs.fontScale]}
                min={0.9}
                max={1.6}
                step={0.01}
                onValueChange={(v) => setPrefs({ fontScale: clamp(v[0] ?? 1.05, 0.9, 1.6) })}
                aria-label="حجم الخط"
              />''',
        "font scale slider"
    ),
    # 2. Line height slider
    (
        '''              <Slider
                value={[prefs.lineHeight]}
                min={1.6}
                max={2.4}
                step={0.01}
                onValueChange={(v) => setPrefs({ lineHeight: clamp(v[0] ?? 1.95, 1.6, 2.4) })}
              />''',
        '''              <Slider
                value={[prefs.lineHeight]}
                min={1.6}
                max={2.4}
                step={0.01}
                onValueChange={(v) => setPrefs({ lineHeight: clamp(v[0] ?? 1.95, 1.6, 2.4) })}
                aria-label="تباعد السطور"
              />''',
        "line height slider"
    ),
    # 3. Quran font scale slider
    (
        '''              <Slider
                value={[prefs.quranFontScale]}
                min={0.9}
                max={1.6}
                step={0.01}
                onValueChange={(v) => setPrefs({ quranFontScale: clamp(v[0] ?? 1.1, 0.9, 1.6) })}
              />''',
        '''              <Slider
                value={[prefs.quranFontScale]}
                min={0.9}
                max={1.6}
                step={0.01}
                onValueChange={(v) => setPrefs({ quranFontScale: clamp(v[0] ?? 1.1, 0.9, 1.6) })}
                aria-label="حجم خط القرآن"
              />''',
        "quran font scale slider"
    ),
    # 4. Quran line height slider
    (
        '''              <Slider
                value={[prefs.quranLineHeight]}
                min={1.8}
                max={3}
                step={0.01}
                onValueChange={(v) => setPrefs({ quranLineHeight: clamp(v[0] ?? 2.55, 1.8, 3) })}
              />''',
        '''              <Slider
                value={[prefs.quranLineHeight]}
                min={1.8}
                max={3}
                step={0.01}
                onValueChange={(v) => setPrefs({ quranLineHeight: clamp(v[0] ?? 2.55, 1.8, 3) })}
                aria-label="تباعد سطور القرآن"
              />''',
        "quran line height slider"
    ),
    # 5. Letter spacing slider
    (
        '''              <Slider
                value={[prefs.quranLetterSpacing ?? 0]}
                min={0}
                max={0.12}
                step={0.005}
                onValueChange={(v) => setPrefs({ quranLetterSpacing: clamp(v[0] ?? 0, 0, 0.12) })}
              />''',
        '''              <Slider
                value={[prefs.quranLetterSpacing ?? 0]}
                min={0}
                max={0.12}
                step={0.005}
                onValueChange={(v) => setPrefs({ quranLetterSpacing: clamp(v[0] ?? 0, 0, 0.12) })}
                aria-label="تباعد الحروف"
              />''',
        "letter spacing slider"
    ),
    # 6. Word spacing slider
    (
        '''              <Slider
                value={[prefs.quranWordSpacing ?? 0]}
                min={0}
                max={0.25}
                step={0.01}
                onValueChange={(v) => setPrefs({ quranWordSpacing: clamp(v[0] ?? 0, 0, 0.25) })}
              />''',
        '''              <Slider
                value={[prefs.quranWordSpacing ?? 0]}
                min={0}
                max={0.25}
                step={0.01}
                onValueChange={(v) => setPrefs({ quranWordSpacing: clamp(v[0] ?? 0, 0, 0.25) })}
                aria-label="تباعد الكلمات"
              />''',
        "word spacing slider"
    ),
]

for old, new, label in replacements:
    if old in src:
        src = src.replace(old, new, 1)
        print(f"  patched {label}")
    else:
        print(f"SKIP: {label} pattern not found")

f.write_text(src, encoding="utf-8")
print("PATCHED Settings.tsx")
