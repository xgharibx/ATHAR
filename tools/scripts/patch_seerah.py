"""Patch SeerahTimeline: aria-label on search input + aria-live for results."""

path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\SeerahTimeline.tsx'

content = open(path, 'r', encoding='utf-8').read()
changed = False

# 1. Add aria-label to search input
old1 = '              placeholder="\u0627\u0628\u062d\u062b \u0641\u064a \u0623\u062d\u062f\u0627\u062b \u0627\u0644\u0633\u064a\u0631\u0629\u2026"'
new1 = '              placeholder="\u0627\u0628\u062d\u062b \u0641\u064a \u0623\u062d\u062f\u0627\u062b \u0627\u0644\u0633\u064a\u0631\u0629\u2026"\n              aria-label="\u0628\u062d\u062b \u0641\u064a \u0623\u062d\u062f\u0627\u062b \u0627\u0644\u0633\u064a\u0631\u0629 \u0627\u0644\u0646\u0628\u0648\u064a\u0629"'
if old1 in content:
    content = content.replace(old1, new1, 1)
    changed = True
    print('PATCHED: search input aria-label')
elif new1 in content:
    print('ALREADY: search input aria-label')
else:
    # Try line-by-line
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'placeholder=' in line and '\u0627\u0644\u0633\u064a\u0631\u0629' in line:
            indent = len(line) - len(line.lstrip())
            aria_line = ' ' * indent + 'aria-label="\u0628\u062d\u062b \u0641\u064a \u0623\u062d\u062f\u0627\u062b \u0627\u0644\u0633\u064a\u0631\u0629 \u0627\u0644\u0646\u0628\u0648\u064a\u0629"'
            if i+1 < len(lines) and 'aria-label' not in lines[i+1]:
                lines.insert(i+1, aria_line)
                content = '\n'.join(lines)
                changed = True
                print(f'PATCHED (line insert): search input aria-label at line {i+1}')
            else:
                print('ALREADY (next line has aria-label)')
            break

# 2. Add sr-only aria-live before timeline items
old2 = '      {/* Timeline */}\n      <div className="relative z-10 px-4 pt-4">'
new2 = '      {/* Visually hidden live region for filtered count */}\n      <div className="sr-only" aria-live="polite" aria-atomic="true">\n        {query || activeCategory !== "all" ? `\u0646\u062a\u0627\u0626\u062c: ${filtered.length} \u062d\u062f\u062b \u0645\u0646 \u0623\u062d\u062f\u0627\u062b \u0627\u0644\u0633\u064a\u0631\u0629` : null}\n      </div>\n      {/* Timeline */}\n      <div className="relative z-10 px-4 pt-4">'
if old2 in content:
    content = content.replace(old2, new2, 1)
    changed = True
    print('PATCHED: timeline aria-live')
elif new2 in content:
    print('ALREADY: timeline aria-live')
else:
    print('MISS: timeline aria-live')

if changed:
    open(path, 'w', encoding='utf-8').write(content)
    print('Saved SeerahTimeline.tsx')
