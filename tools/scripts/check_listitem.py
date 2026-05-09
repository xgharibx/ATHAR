import sys
with open('src/pages/Settings.tsx', 'rb') as f:
    content = f.read()
# Search for all 'listitem' occurrences
idx = 0
while True:
    pos = content.find(b'listitem', idx)
    if pos < 0:
        break
    print(f'Found at {pos}: {content[pos-15:pos+20]}')
    idx = pos + 1
