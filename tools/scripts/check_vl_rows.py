import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
with open('src/pages/VideoLibrary.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
# Find all VideoListRow occurrences
for i, line in enumerate(lines):
    if 'VideoListRow' in line and '<VideoListRow' in line:
        print(f'=== VideoListRow at line {i+1} ===')
        for ln in lines[max(0,i-5):i+12]:
            print(ln.rstrip())
        print()
