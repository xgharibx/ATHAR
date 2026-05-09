"""Patch VideoLibrary: aria-label on search input + Companions/HadithBooks search missing labels."""

path_vl = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\VideoLibrary.tsx'

# VideoLibrary: add aria-label and type="search" to search input
content = open(path_vl, 'r', encoding='utf-8').read()
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'placeholder=' in line and '\u0634\u064a\u062e\u060c \u062f\u0648\u0631\u0629' in line:
        indent = len(line) - len(line.lstrip())
        # Check if aria-label already present nearby
        next_lines = ''.join(lines[i:i+3])
        if 'aria-label' in next_lines:
            print('ALREADY: VideoLibrary search input aria-label')
        else:
            aria_line = ' ' * indent + 'aria-label="\u0628\u062d\u062b \u0641\u064a \u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u062f\u0631\u0648\u0633"'
            lines.insert(i+1, aria_line)
            content = '\n'.join(lines)
            open(path_vl, 'w', encoding='utf-8').write(content)
            print(f'PATCHED: VideoLibrary search input aria-label at line {i+2}')
        break
else:
    print('MISS: VideoLibrary search input')

print('Done.')
