import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
with open('src/pages/Search.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
print('Total lines:', len(lines))
# Print last 30 lines
for ln in lines[-30:]:
    print(ln.rstrip())
