import re, glob

all_tsx = sorted(glob.glob('src/**/*.tsx', recursive=True))
issues = []

for fpath in all_tsx:
    with open(fpath, encoding='utf-8') as f:
        content = f.read()
        lines = content.splitlines()
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*'):
            continue
        
        # Check for <img without alt
        if re.search(r'<img\b(?![^>]*\balt=)', line):
            issues.append((fpath, i+1, 'img missing alt', stripped[:80]))
        
        # Check for <a without rel="noopener" (for external links)
        if re.search(r'href=["\']https?://', line) and 'target="_blank"' in line:
            if 'noopener' not in line and 'noreferrer' not in line:
                issues.append((fpath, i+1, 'external link missing noopener', stripped[:80]))

print(f'{len(issues)} accessibility issues found')
for fpath, lineno, kind, text in issues[:20]:
    print(f'{fpath}:L{lineno} [{kind}]: {text}')
