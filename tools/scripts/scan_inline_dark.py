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
        # Look for style={{ background: '#0...' }}
        if re.search(r'background:\s*["\']#0[0-9a-fA-F]{5}', line):
            issues.append((fpath, i+1, stripped[:90]))

print(str(len(issues)) + ' inline dark hex styles:')
for fpath, lineno, text in issues[:20]:
    print(fpath + ':L' + str(lineno) + ': ' + text)
