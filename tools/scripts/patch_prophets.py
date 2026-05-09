"""Patch ProphetStories: aria-label on search input + aria-live for filtered count."""

path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\ProphetStories.tsx'

content = open(path, 'r', encoding='utf-8').read()
changed = False

# 1. Add aria-label to search input (line-based)
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'placeholder=' in line and '\u0627\u0644\u0646\u0628\u064a' in line and 'ProphetStories' not in line:
        indent = len(line) - len(line.lstrip())
        aria_line = ' ' * indent + 'aria-label="\u0628\u062d\u062b \u0641\u064a \u0642\u0635\u0635 \u0627\u0644\u0623\u0646\u0628\u064a\u0627\u0621"'
        if i+1 < len(lines) and 'aria-label' not in lines[i+1]:
            lines.insert(i+1, aria_line)
            content = '\n'.join(lines)
            changed = True
            print(f'PATCHED: search input aria-label at line {i+2}')
        else:
            print('ALREADY: search input aria-label')
        break
else:
    print('MISS: search input - not found')

# 2. Add aria-live region for search results
# First check what variable holds filtered results
if 'filteredStories' in content:
    filtered_var = 'filteredStories'
elif 'filtered' in content:
    filtered_var = 'filtered'
else:
    filtered_var = None
    print('MISS: no filtered variable found')

if filtered_var:
    print(f'  Using filtered var: {filtered_var}')
    # Find a good insertion point before the story list
    old2 = '            {/* Story cards */}'
    new2 = f'            {{/* Visually hidden live region for search count */}}\n            <div className="sr-only" aria-live="polite" aria-atomic="true">{{\n              query ? `\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0628\u062d\u062b: ${{{filtered_var}.length}} \u0642\u0635\u0629` : null\n            }}</div>\n            {{/* Story cards */}}'
    
    if old2 in content:
        content = content.replace(old2, new2, 1)
        changed = True
        print('PATCHED: story list aria-live')
    else:
        # Try alternate insertion points
        idx = content.find('filtered.map(')
        if idx != -1:
            print(f'  found filtered.map at {idx}')
        else:
            print(f'  MISS: story cards comment not found')
        print('  Looking for "stories.map" or equivalent...')
        idx2 = content.find('.map((story')
        if idx2 != -1:
            print(f'  found .map((story at {idx2}: {repr(content[max(0,idx2-100):idx2+30])}')

if changed:
    open(path, 'w', encoding='utf-8').write(content)
    print('Saved ProphetStories.tsx')
