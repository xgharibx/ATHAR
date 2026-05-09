"""Patch Search, HadithBooks, Quran tab widgets with keyboard navigation."""

KB_NAV = '''\n          onKeyDown={(e) => {
            const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
            const idx = tabs.findIndex(t => t === document.activeElement);
            if (idx === -1) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); const n=(idx-1+tabs.length)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); const n=(idx+1)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'Home') { e.preventDefault(); tabs[0].focus(); tabs[0].click(); }
            else if (e.key === 'End') { e.preventDefault(); tabs[tabs.length-1].focus(); tabs[tabs.length-1].click(); }
          }}'''

base = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages'

patches = [
    # Search.tsx
    (
        base + r'\Search.tsx',
        'role="tablist" aria-label="\u0646\u0648\u0639 \u0627\u0644\u0628\u062d\u062b">',
        'role="tablist" aria-label="\u0646\u0648\u0639 \u0627\u0644\u0628\u062d\u062b"' + KB_NAV + '>'
    ),
    # HadithBooks.tsx
    (
        base + r'\HadithBooks.tsx',
        'role="tablist" aria-label="\u0623\u0642\u0633\u0627\u0645 \u0627\u0644\u062d\u062f\u064a\u062b">',
        'role="tablist" aria-label="\u0623\u0642\u0633\u0627\u0645 \u0627\u0644\u062d\u062f\u064a\u062b"' + KB_NAV + '>'
    ),
    # Quran.tsx
    (
        base + r'\Quran.tsx',
        'role="tablist" aria-label="\u0648\u0636\u0639 \u0627\u0644\u0628\u062d\u062b">',
        'role="tablist" aria-label="\u0648\u0636\u0639 \u0627\u0644\u0628\u062d\u062b"' + KB_NAV + '>'
    ),
]

for path, old, new in patches:
    content = open(path, 'r', encoding='utf-8').read()
    if old in content:
        content = content.replace(old, new, 1)
        open(path, 'w', encoding='utf-8').write(content)
        print(f'PATCHED: {path.split(chr(92))[-1]}')
    elif new in content:
        print(f'ALREADY_HAS: {path.split(chr(92))[-1]}')
    else:
        print(f'NOT_FOUND: {path.split(chr(92))[-1]} -> {repr(old[:60])}')
