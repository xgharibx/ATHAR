"""Check for range inputs without aria-label."""
import sys, os, glob
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/*.tsx')
for f in sorted(files):
    with open(f, encoding='utf-8') as fp:
        lines = fp.readlines()
    for i, line in enumerate(lines, 1):
        l = line.strip()
        if 'range' in l and 'input' in l.lower() and 'aria-label' not in l:
            print(f'{os.path.relpath(f)} L{i}: {l[:120]}')
print('Done.')
