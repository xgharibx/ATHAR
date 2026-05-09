import os, re

# Find elements with tabIndex={0} but missing role attribute
issues = []
for root, dirs, files in os.walk('src'):
    for f in files:
        if not f.endswith('.tsx'):
            continue
        fp = os.path.join(root, f)
        with open(fp, encoding='utf-8') as fh:
            content = fh.read()
        
        # Find tabIndex={0} without role
        for m in re.finditer(r'<div[^>]*tabIndex=\{0\}[^>]*>', content, re.DOTALL):
            tag = m.group(0)
            if 'role=' not in tag:
                line = content[:m.start()].count('\n') + 1
                issues.append(f'{fp}:{line}: {tag[:100]}')

print('div elements with tabIndex=0 but no role:')
for iss in issues[:20]:
    print(' ', iss)
