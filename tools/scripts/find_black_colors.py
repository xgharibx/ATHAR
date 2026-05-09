import re, os

src = 'src'
results = []

skip = {'sharePoster.ts', 'globals.css'}
pat = re.compile(r'(?:color|background|fill|stroke)[^"]*"#000(?:000)?"', re.I)

for root, dirs, files in os.walk(src):
    for fname in files:
        if fname.endswith(('.tsx', '.ts')) and fname not in skip:
            path = os.path.join(root, fname)
            with open(path, encoding='utf-8') as f:
                lines = f.readlines()
            for i, line in enumerate(lines, 1):
                if pat.search(line):
                    results.append((fname, i, line.rstrip()[:110]))

print(f'Found {len(results)} hardcoded #000 references in inline styles:')
for name, lineno, line in results:
    print(f'  {name} L{lineno}: {line.strip()[:100]}')
