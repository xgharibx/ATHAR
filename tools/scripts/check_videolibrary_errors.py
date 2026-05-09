import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
with open('src/pages/VideoLibrary.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
print('Total lines:', len(lines))
# Check around errors at line 1073, 1390
for start, end in [(1068, 1085), (1385, 1420)]:
    print(f'=== lines {start+1}-{end+1} ===')
    for ln in lines[start:end]:
        print(ln.rstrip())
    print()
