with open('src/styles/globals.css', encoding='utf-8') as f:
    lines = f.readlines()
    
print(f'Total lines: {len(lines)}')
for i, line in enumerate(lines, 1):
    if 'prefers-contrast' in line or 'High-contrast' in line:
        print(f'L{i}: {line.rstrip()}')
