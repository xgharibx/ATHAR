import os, re

# Find img tags without loading="lazy"
issues = []
for root, dirs, files in os.walk('src'):
    for f in files:
        if not f.endswith('.tsx'):
            continue
        fp = os.path.join(root, f)
        with open(fp, encoding='utf-8') as fh:
            content = fh.read()
        
        # Find all <img tags
        for m in re.finditer(r'<img\b[^>]*>', content, re.DOTALL):
            tag = m.group(0)
            if 'loading=' not in tag:
                # Get the line number
                line = content[:m.start()].count('\n') + 1
                issues.append(f'{fp}:{line}: {tag[:80]}')

print(f'img tags without loading attr:')
for iss in issues:
    print(' ', iss)
