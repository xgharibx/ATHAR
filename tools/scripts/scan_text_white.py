import re, os, glob

all_tsx = sorted(glob.glob('src/**/*.tsx', recursive=True))
issues = {}
for fpath in all_tsx:
    with open(fpath, encoding='utf-8') as f:
        lines = f.readlines()
    
    found = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*'):
            continue
        if 'text-white' in line:
            # Skip intentional dark/overlay contexts
            if not any(x in line for x in [
                'rgba(0', 'rgba(7,8', 'bg-black', 'inset-0', '#000',
                'bg-neutral-9', 'bg-zinc-9', 'video', 'thumbnail',
                'gradient', 'bg-[rgba(', 'textShadow', 'bg-[#0'
            ]):
                found.append((i+1, line.strip()[:90]))
    
    if found:
        issues[fpath] = found

for fpath, lst in issues.items():
    print('\n' + fpath + ':')
    for lineno, text in lst[:4]:
        print('  L' + str(lineno) + ': ' + text)
