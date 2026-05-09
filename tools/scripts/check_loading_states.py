import os, re

# Find loading/empty state divs that might benefit from role="status" 
issues = []

for root, dirs, files in os.walk('src'):
    for f in files:
        if not f.endswith('.tsx'):
            continue
        fp = os.path.join(root, f)
        with open(fp, encoding='utf-8') as fh:
            lines = fh.readlines()
        
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            # Look for loading/skeleton patterns without role="status"
            if ('isLoading' in stripped or 'skeleton' in stripped.lower()) and 'role=' not in stripped:
                if '<div' in stripped or 'return' in stripped:
                    issues.append(f'{fp}:{i}: {stripped[:100]}')

print(f'Loading states possibly missing role="status":')
for iss in issues[:30]:
    print(' ', iss)
print(f'\nTotal: {len(issues)}')
