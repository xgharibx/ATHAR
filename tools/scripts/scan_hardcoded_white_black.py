import re, glob

all_tsx = sorted(glob.glob('src/**/*.tsx', recursive=True))
issues = []
for fpath in all_tsx:
    with open(fpath, encoding='utf-8') as f:
        lines = f.readlines()
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*'):
            continue
        # Find #fff or #000 used as color values in JSX styles
        matches = re.findall(r'["\']#(fff|000|ffffff|000000)["\']', stripped)
        if matches:
            issues.append((fpath.replace('src\\',''), i+1, stripped[:80]))

print(f'{len(issues)} hardcoded #fff/#000 usages:')
for f, l, t in issues[:20]:
    print(f'{f}:L{l}: {t}')
