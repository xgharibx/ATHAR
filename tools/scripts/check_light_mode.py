"""Scan TSX files for patterns that may break light mode."""
import os
import re

# Patterns that indicate potential light-mode issues
PATTERNS = [
    # Hardcoded near-white backgrounds  
    (r'bg-white/[5-9]\d|bg-white/100', 'bg-white/high (opaque on light mode)'),
    # Dark background classes that might not have light override
    (r"bg-\[rgba\(0,0,0", 'dark bg-rgba'),
    # bg-[#xxx] where xxx looks very dark
    (r"bg-\[#[012]\w{4}\]", 'dark bg-hex'),
    # text-white without any conditional
    (r'className="[^"]*\btext-white\b(?!\s+(?:md:|lg:|dark:))', 'text-white class'),
]

issues = []
skip_files = {'sharePoster.ts', 'LogoMark.tsx'}

for root, dirs, files in os.walk('src'):
    dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'assets', 'styles']]
    for fn in files:
        if not fn.endswith(('.tsx', '.ts')) or fn in skip_files:
            continue
        fp = os.path.join(root, fn)
        with open(fp, encoding='utf-8', errors='replace') as f:
            content = f.read()
        
        for pattern, label in PATTERNS:
            matches = list(re.finditer(pattern, content))
            for m in matches:
                line_num = content[:m.start()].count('\n') + 1
                line_text = content.split('\n')[line_num - 1].strip()
                issues.append((fp, line_num, label, line_text[:80]))

for fp, ln, label, text in issues[:30]:
    print(f'{os.path.basename(fp)}:{ln} [{label}] {text}')
print(f'\nTotal issues: {len(issues)}')
