"""Fix Mushaf.tsx aria-label on bookmark button using line-index approach"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
path = os.path.join(WORKSPACE, 'src', 'pages', 'Mushaf.tsx')

with open(path, encoding='utf-8') as f:
    lines = f.readlines()

# Find the aria-label="علامة" line
target = '\u0639\u0644\u0627\u0645\u0629'  # علامة
for i, line in enumerate(lines):
    if 'aria-label' in line and target in line and 'isSelBookmarked' not in line:
        print(f"Line {i+1}: {line.rstrip()}")
        # Replace this line with dynamic aria-label + aria-pressed
        indent = line[:len(line) - len(line.lstrip())]
        lines[i] = (
            indent + 'aria-label={isSelBookmarked ? "\u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0639\u0644\u0627\u0645\u0629" : "\u0625\u0636\u0627\u0641\u0629 \u0639\u0644\u0627\u0645\u0629"}\n'
            + indent + 'aria-pressed={isSelBookmarked}\n'
        )
        print(f'Patched line {i+1}')
        break
else:
    print('FAIL: aria-label="علامة" line not found')

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Done.')
