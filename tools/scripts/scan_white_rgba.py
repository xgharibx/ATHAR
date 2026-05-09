"""Find rgba(255,255,255,...) patterns in CSS that might be invisible in light mode"""
import re

with open('src/styles/globals.css', encoding='utf-8') as f:
    lines = f.readlines()

# These are OK: inside .light{}, inside .mushaf (parchment), inside transparent-mode
# Specifically look for ones NOT inside media or .light overrides

hits = []
in_light = False
in_mushaf = False
brace_depth = 0

for i, line in enumerate(lines):
    s = line.strip()
    
    # Track context
    if '.light' in s and '{' in s:
        in_light = True
    if '.mushaf' in s and '{' in s:
        in_mushaf = True
        
    opens = line.count('{')
    closes = line.count('}')
    brace_depth += opens - closes
    if brace_depth <= 0:
        in_light = False
        in_mushaf = False
        brace_depth = 0

    # Find rgba(255,255,255,...) with opacity > 0.3 - might look bad in light mode 
    # Skip if in .light{} block, or in .mushaf section, or if it's a known safe pattern
    if in_light or in_mushaf:
        continue
    
    # Find high-opacity white patterns
    m = re.search(r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*(0\.[3-9]|1\.?0?)\)', s)
    if m and not s.startswith('/') and not s.startswith('*'):
        opacity = float(m.group(1))
        if opacity >= 0.3:
            hits.append((i+1, opacity, s[:80]))

print(f'Found {len(hits)} high-opacity white rgba (NOT in .light blocks):')
for lineno, op, text in hits:
    print(f'  L{lineno} (op={op}): {text}')
