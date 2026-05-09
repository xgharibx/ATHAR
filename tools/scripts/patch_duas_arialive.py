"""Patch Duas.tsx with aria-live for filter results."""

path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Duas.tsx'

old = '      {/* Duas list */}\n      <div className="px-4 pt-4 space-y-4">'
new = '      {/* Visually hidden live region for result count */}\n      <div className="sr-only" aria-live="polite" aria-atomic="true">\n        {query ? `\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0628\u062d\u062b: ${displayedDuas.length} \u062f\u0639\u0627\u0621` : null}\n      </div>\n      {/* Duas list */}\n      <div className="px-4 pt-4 space-y-4">'

content = open(path, 'r', encoding='utf-8').read()
if old in content:
    content = content.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(content)
    print('PATCHED: Duas.tsx aria-live')
elif new in content:
    print('ALREADY: Duas.tsx')
else:
    print('MISS: Duas.tsx')
    # Debug
    idx = content.find('{/* Duas list */')
    print(f'  Found "{"{/* Duas list */"}" at index {idx}')
    print(f'  Context: {repr(content[idx:idx+80])}')
