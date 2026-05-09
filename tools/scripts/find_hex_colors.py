import os, re

src = 'src'
results = []

skip_files = {'sharePoster.ts'}

for root, dirs, files in os.walk(src):
    for fname in files:
        if fname.endswith(('.tsx', '.ts')) and fname not in skip_files:
            path = os.path.join(root, fname)
            with open(path, encoding='utf-8') as f:
                lines = f.readlines()
            for i, line in enumerate(lines, 1):
                if re.search(r'#(?:fff|ffffff)\b', line, re.I):
                    results.append((os.path.basename(path), i, line.rstrip()[:120]))

print(f'Found {len(results)} hardcoded #fff/#ffffff references:')
for name, lineno, line in results:
    print(f'  {name} L{lineno}: {line.strip()[:100]}')
