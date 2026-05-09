"""Phase 70b: Final sweep for img without alt and a without text/aria-label."""
import sys, os, glob, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/*.tsx')

img_issues = []
link_issues = []

for f in sorted(files):
    with open(f, encoding='utf-8') as fp:
        lines = fp.readlines()
    for i, line in enumerate(lines, 1):
        l = line.strip()
        # img without alt on same line (multi-line img checked differently)
        if re.search(r'<img\b', l) and 'alt=' not in l:
            # Check if it's a single-line img
            if '/>' in l or ('>' in l and 'alt=' not in l):
                img_issues.append((os.path.relpath(f), i, l[:100]))
        # <a href without any label (no aria-label, no visible text checked by heuristic)
        if re.search(r'<a\s', l) and 'href' in l and 'aria-label' not in l and 'aria-labelledby' not in l:
            # might have text children - flag only self-closing or empty-looking
            if '/>' in l:
                link_issues.append((os.path.relpath(f), i, l[:100]))

print(f'Images possibly missing alt ({len(img_issues)}):')
for f, i, l in img_issues[:20]:
    print(f'  {f} L{i}: {l}')

print(f'\nSelf-closing links missing label ({len(link_issues)}):')
for f, i, l in link_issues[:20]:
    print(f'  {f} L{i}: {l}')
print('Done.')
