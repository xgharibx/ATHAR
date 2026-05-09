import os, re

# Find SVG elements that are purely decorative but missing aria-hidden
# These are SVGs rendered inline in buttons with aria-label - they should have aria-hidden
issues = []

for root, dirs, files in os.walk('src'):
    for f in files:
        if not f.endswith('.tsx'):
            continue
        fp = os.path.join(root, f)
        with open(fp, encoding='utf-8') as fh:
            content = fh.read()
        
        # Find svg elements that don't have aria-hidden or aria-label or role=img
        for m in re.finditer(r'<svg\b[^>]*>', content, re.DOTALL):
            tag = m.group(0)
            if len(tag) > 500:
                continue
            line = content[:m.start()].count('\n') + 1
            
            has_aria_hidden = 'aria-hidden' in tag
            has_aria_label = 'aria-label' in tag
            has_role = 'role=' in tag
            
            if not has_aria_hidden and not has_aria_label and not has_role:
                issues.append(f'{fp}:{line}: {tag[:80]}')

print(f'SVGs without aria attributes: {len(issues)} total')
print('\nFirst 20:')
for iss in issues[:20]:
    print(' ', iss)
