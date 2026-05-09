import re

with open('src/styles/globals.css', encoding='utf-8') as f:
    content = f.read()
    lines = content.splitlines()

# Find all class definitions and check if they use hardcoded dark colors
# without a corresponding .light override
issues = []

i = 0
while i < len(lines):
    line = lines[i]
    # Find class definitions at root level (not inside .light or @media)
    m = re.match(r'^(\.[a-zA-Z][\w-]*)\s*\{', line)
    if m:
        cls = m.group(1)
        # Skip if this already IS a light class
        if cls.startswith('.light'):
            i += 1
            continue
        # Collect the block
        block_lines = [line]
        j = i + 1
        depth = 1
        while j < len(lines) and depth > 0:
            if '{' in lines[j]: depth += lines[j].count('{')
            if '}' in lines[j]: depth -= lines[j].count('}')
            block_lines.append(lines[j])
            j += 1
        block = '\n'.join(block_lines)
        
        # Check for hardcoded dark colors in the block
        dark_patterns = [
            r'#0a0c12', r'#07080b', r'#0d0f18', r'#0f1325',
            r'rgba\(0,\s*0,\s*0,', r'rgba\(7,\s*8,\s*11,',
            r'rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)',  # rgba whites
        ]
        
        for pat in dark_patterns:
            if re.search(pat, block, re.IGNORECASE):
                # Check if .light version exists
                light_cls = '.light ' + cls
                if light_cls not in content:
                    issues.append((i+1, cls, pat[:30]))
                break
    i += 1

print(f'{len(issues)} potential missing .light overrides')
for lineno, cls, pattern in issues[:20]:
    print(f'  L{lineno}: {cls} (uses {pattern})')
