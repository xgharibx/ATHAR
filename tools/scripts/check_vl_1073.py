import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
with open('src/pages/VideoLibrary.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
print('=== lines 1055-1082 ===')
for ln in lines[1054:1082]:
    print(ln.rstrip())
