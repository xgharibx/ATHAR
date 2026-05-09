"""Patch ProphetStories: add aria-live for filtered results count."""

path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\ProphetStories.tsx'

old = '      {/* Stories */}\n      <div className="px-4 pt-4 space-y-3">'
new = '      {/* Visually hidden live region for search count */}\n      <div className="sr-only" aria-live="polite" aria-atomic="true">\n        {query ? `\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0628\u062d\u062b: ${filtered.length} \u0642\u0635\u0629` : null}\n      </div>\n      {/* Stories */}\n      <div className="px-4 pt-4 space-y-3">'

content = open(path, 'r', encoding='utf-8').read()
if old in content:
    content = content.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(content)
    print('PATCHED: ProphetStories aria-live')
elif new in content:
    print('ALREADY: ProphetStories')
else:
    print('MISS: ProphetStories')
    idx = content.find('{/* Stories */')
    print(f'  Found "{"{/* Stories */"}" at {idx}')
    print(f'  Context: {repr(content[idx:idx+100]) if idx != -1 else "NOT FOUND"}')
