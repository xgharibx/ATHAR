"""Patch Quran.tsx: add id to mode tab buttons and role=tabpanel to panels."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Quran.tsx'
content = open(path, 'r', encoding='utf-8').read()

patches = [
    # Tab button: surahs
    (
        '<button type="button" role="tab" aria-selected={mode === "surahs"} onClick={() => setMode("surahs")}',
        '<button type="button" id="quran-tab-surahs" role="tab" aria-selected={mode === "surahs"} onClick={() => setMode("surahs")}'
    ),
    # Tab button: ayahs
    (
        '<button type="button" role="tab" aria-selected={mode === "ayahs"} onClick={() => setMode("ayahs")}',
        '<button type="button" id="quran-tab-ayahs" role="tab" aria-selected={mode === "ayahs"} onClick={() => setMode("ayahs")}'
    ),
    # Surahs panel Card
    (
        '      {mode === "surahs" ? (\n        <Card className="p-0 quran-surface overflow-hidden">',
        '      {mode === "surahs" ? (\n        <Card className="p-0 quran-surface overflow-hidden" role="tabpanel" id="quran-panel-surahs" aria-labelledby="quran-tab-surahs" tabIndex={0}>'
    ),
    # Ayahs panel Card
    (
        '      ) : (\n        <Card className="p-5 quran-surface">\n          <div className="flex items-center justify-between gap-3">\n            <div className="text-sm font-semibold quran-title">\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0628\u062d\u062b</div>',
        '      ) : (\n        <Card className="p-5 quran-surface" role="tabpanel" id="quran-panel-ayahs" aria-labelledby="quran-tab-ayahs" tabIndex={0}>\n          <div className="flex items-center justify-between gap-3">\n            <div className="text-sm font-semibold quran-title">\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0628\u062d\u062b</div>'
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
