import re, glob
from collections import Counter

all_tsx = sorted(glob.glob('src/**/*.tsx', recursive=True))
by_file = Counter()

for fpath in all_tsx:
    with open(fpath, encoding='utf-8') as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*'):
            continue
        # Find <button without type= (either on same line or multi-line start)
        if re.search(r'<button\b(?![^>]*\btype=)', line):
            by_file[fpath] += 1

print('Files with buttons missing type=:')
for fpath, count in by_file.most_common():
    print(f'  {count:3d}  {fpath}')
