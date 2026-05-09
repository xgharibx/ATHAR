import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
with open('src/pages/Mushaf.tsx', encoding='utf-8') as f:
    content = f.read()

target = '<div className="mushaf-jump-sheet" role="dialog" aria-modal="true" aria-label="اختر القارئ" onClick={(e) => e.stopPropagation()} dir="rtl">'
print('Target found:', target in content)

lines = content.splitlines()
# Print lines 1528-1540
for i in range(1527, 1540):
    print(f'Line {i+1}: {repr(lines[i][:150])}')
