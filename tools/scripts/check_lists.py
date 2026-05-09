import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
files = ['src/pages/Quran.tsx', 'src/pages/Search.tsx', 'src/pages/WuduGuide.tsx', 'src/pages/Settings.tsx']
pat = 'role="list"'
for f in files:
    with open(f, encoding='utf-8') as fp:
        lines = fp.readlines()
    for i, line in enumerate(lines):
        if pat in line:
            print(f'{f}:{i+1}: {line.strip()[:80]}')
            for j in range(i+1, min(len(lines), i+8)):
                s = lines[j].strip()
                if s:
                    print(f'  L{j+1}: {s[:80]}')
