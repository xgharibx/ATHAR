"""Patch QuranRadioFab stations container with role=group."""

path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\components\layout\QuranRadioFab.tsx'

old = '        {/* Stations */}\n        <div className="space-y-1.5 mb-3">'
new = '        {/* Stations */}\n        <div className="space-y-1.5 mb-3" role="group" aria-label="\u0645\u062d\u0637\u0627\u062a \u0627\u0644\u0631\u0627\u062f\u064a\u0648">'

content = open(path, 'r', encoding='utf-8').read()
if old in content:
    content = content.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(content)
    print('PATCHED: QuranRadioFab stations group')
elif new in content:
    print('ALREADY: QuranRadioFab')
else:
    print('MISS: QuranRadioFab')
    idx = content.find('Stations')
    print(f'  Context: {repr(content[max(0,idx-20):idx+100]) if idx != -1 else "NOT FOUND"}')
