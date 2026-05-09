"""Patch multiple tab widgets with keyboard navigation."""
import re

# --- Utility ---
KB_NAV = '''
          onKeyDown={(e) => {
            const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
            const idx = tabs.findIndex(t => t === document.activeElement);
            if (idx === -1) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); const n=(idx-1+tabs.length)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); const n=(idx+1)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'Home') { e.preventDefault(); tabs[0].focus(); tabs[0].click(); }
            else if (e.key === 'End') { e.preventDefault(); tabs[tabs.length-1].focus(); tabs[tabs.length-1].click(); }
          }}'''

def patch_file(path, old, new):
    content = open(path, 'r', encoding='utf-8').read()
    if old in content:
        content = content.replace(old, new, 1)
        open(path, 'w', encoding='utf-8').write(content)
        print(f'PATCHED: {path}')
        return True
    elif new in content:
        print(f'ALREADY_HAS: {path}')
        return True
    else:
        print(f'NOT_FOUND in {path}: {repr(old[:60])}')
        return False

base = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages'

# --- PrayerTimes ---
patch_file(
    base + r'\PrayerTimes.tsx',
    '      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="\u0639\u0631\u0636 \u0645\u0648\u0627\u0642\u064a\u062a \u0627\u0644\u0635\u0644\u0627\u0629">',
    '      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="\u0639\u0631\u0636 \u0645\u0648\u0627\u0642\u064a\u062a \u0627\u0644\u0635\u0644\u0627\u0629"' + KB_NAV + '>'
)

# --- Search ---
pt = base + r'\Search.tsx'
content = open(pt, 'r', encoding='utf-8').read()
# Find the tablist
old = content[content.find('role="tablist"'):content.find('role="tablist"') + 100]
print(f'Search tablist: {repr(old[:80])}')

# --- HadithBooks ---
pt = base + r'\HadithBooks.tsx'
content = open(pt, 'r', encoding='utf-8').read()
idx = content.find('role="tablist"')
print(f'HadithBooks tablist: {repr(content[idx:idx+100])}')

# --- Quran ---
pt = base + r'\Quran.tsx'
content = open(pt, 'r', encoding='utf-8').read()
idx = content.find('role="tablist"')
print(f'Quran tablist: {repr(content[idx:idx+100])}')
