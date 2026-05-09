import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
with open('src/pages/Search.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for ln in lines[700:750]:
    print(ln.rstrip())
