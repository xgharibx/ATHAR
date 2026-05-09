import os, re

issues = []
for root, dirs, files in os.walk('src/pages'):
    for fname in files:
        if not fname.endswith('.tsx'):
            continue
        path = os.path.join(root, fname)
        with open(path, encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        for i, line in enumerate(lines):
            if 'text-white' not in line:
                continue
            # Skip option elements, hardcoded dark backgrounds, select options
            if any(x in line for x in ['bg-gray', 'option', 'bg-[#', 'select', '//']):
                continue
            issues.append((os.path.basename(path), i+1, line.strip()[:90]))

print('text-white occurrences needing review:')
for fname, lineno, text in issues[:25]:
    print('  ' + fname + ':' + str(lineno) + ': ' + text)
print('Total: ' + str(len(issues)))
