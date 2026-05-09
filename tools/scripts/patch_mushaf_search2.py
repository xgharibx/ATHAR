"""Patch Mushaf in-page search input with aria-label - using line-based approach."""

path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Mushaf.tsx'

content = open(path, 'r', encoding='utf-8').read()

# Find exact placeholder line
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'placeholder=' in line and 'الصفحة' in line:
        print(f'  Found at line {i+1}: {repr(line)}')
        # Check if aria-label already on next line
        if i+1 < len(lines) and 'aria-label' in lines[i+1]:
            print('  ALREADY has aria-label on next line')
        elif 'aria-label' in line:
            print('  ALREADY has aria-label on same line')
        else:
            # Insert after this line
            indent = len(line) - len(line.lstrip())
            new_line = ' ' * indent + 'aria-label="\u0627\u0644\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629"'
            lines.insert(i+1, new_line)
            content = '\n'.join(lines)
            open(path, 'w', encoding='utf-8').write(content)
            print(f'  PATCHED: inserted {repr(new_line)}')
        break
else:
    print('  NOT FOUND: placeholder with الصفحة')
