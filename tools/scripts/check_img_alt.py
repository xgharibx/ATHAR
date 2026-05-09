import os, re

# Find img tags with missing or empty alt attributes
issues = []
for root, dirs, files in os.walk('src'):
    for f in files:
        if not f.endswith('.tsx'):
            continue
        fp = os.path.join(root, f)
        with open(fp, encoding='utf-8') as fh:
            content = fh.read()
        
        # Find all <img tags
        for m in re.finditer(r'<img\b[^>]*/>', content, re.DOTALL):
            tag = m.group(0)
            line = content[:m.start()].count('\n') + 1
            
            # Check for missing or empty alt
            if 'alt=' not in tag:
                issues.append(f'MISSING ALT: {fp}:{line}: {tag[:100]}')
            elif re.search(r'alt\s*=\s*["\'](\s*)["\']', tag):
                # Empty alt is OK for decorative images
                pass

print('img tags with missing alt:')
for iss in issues[:20]:
    print(' ', iss)
