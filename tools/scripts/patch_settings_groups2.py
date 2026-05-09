"""Patch Settings prayer sound grid with role=group."""

path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Settings.tsx'

old = '              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">\n                {PRAYER_SOUND_OPTIONS.map((option) => {'
new = '              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2" role="group" aria-label="\u0627\u062e\u062a\u064a\u0627\u0631 \u0635\u0648\u062a \u0627\u0644\u0623\u0630\u0627\u0646">\n                {PRAYER_SOUND_OPTIONS.map((option) => {'

content = open(path, 'r', encoding='utf-8').read()
if old in content:
    content = content.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(content)
    print('PATCHED: prayer sound grid group')
elif new in content:
    print('ALREADY: prayer sound grid')
else:
    print('MISS: prayer sound grid')
    idx = content.find('PRAYER_SOUND_OPTIONS.map')
    if idx != -1:
        print(f'  Context: {repr(content[max(0,idx-150):idx+50])}')
