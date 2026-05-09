import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
target = 'role="list"'
with open('src/pages/Search.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if target in line:
        print('=== Line', i+1, '===')
        for ln in lines[i:i+12]:
            print(ln.rstrip())
        print()
