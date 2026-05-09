"""Scan TSX files for inline style props with hardcoded rgba(255,255,255,...) or color: '#fff'."""
import re
import os

PATTERNS = [
    # inline style= with rgba white
    (r"rgba\(255\s*,\s*255\s*,\s*255\s*,\s*[0-9.]+\)", "rgba(255,255,255,...) in style"),
    # color: white or '#fff' or '#ffffff'  
    (r"""(?:color|background|border)\s*:\s*["']?(?:#fff\b|#ffffff\b|white\b)""", "color:white/fff"),
    # boxShadow with white
    (r"boxShadow\s*:.*rgba\(255\s*,\s*255\s*,\s*255", "boxShadow with white"),
]

SKIP = {'sharePoster.ts', 'LogoMark.tsx', 'pwa.ts'}
results = []

for root, dirs, files in os.walk('src'):
    dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'styles']]
    for fn in files:
        if not fn.endswith(('.tsx', '.ts')) or fn in SKIP:
            continue
        fp = os.path.join(root, fn)
        with open(fp, encoding='utf-8') as f:
            content = f.read()
        lines = content.split('\n')
        for i, line in enumerate(lines):
            for pattern, label in PATTERNS:
                if re.search(pattern, line, re.IGNORECASE):
                    results.append((fp, i+1, label, line.strip()[:90]))

for fp, ln, label, text in results[:30]:
    print(f'{os.path.basename(fp)}:{ln} [{label}]')
    print(f'  {text}')
print(f'\nTotal: {len(results)}')
