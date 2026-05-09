import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
with open('src/pages/Search.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
print('=== Quran results map (lines 489-545) ===')
for ln in lines[488:545]:
    print(ln.rstrip())
