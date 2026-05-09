import re

with open('src/pages/VideoLibrary.tsx', encoding='utf-8') as f:
    lines = f.readlines()

count = 0
for i, line in enumerate(lines[:200]):
    if re.search(r'<button\b', line):
        print('L'+str(i+1)+': '+line.rstrip()[:80])
        for j in range(1, 3):
            if i+j < len(lines):
                print('  L'+str(i+j+1)+': '+lines[i+j].rstrip()[:80])
        print()
        count += 1
        if count > 5:
            break
