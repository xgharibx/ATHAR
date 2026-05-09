import os, re

# Find all dialog-like patterns in the codebase that are missing role=dialog
issues = []
for root, dirs, files in os.walk('src'):
    for f in files:
        if not f.endswith('.tsx'):
            continue
        fp = os.path.join(root, f)
        with open(fp, encoding='utf-8') as fh:
            content = fh.read()
        
        # Find all fixed inset-0 divs
        for m in re.finditer(r'<div[^>]*fixed inset-0[^>]*>', content, re.DOTALL):
            tag = m.group(0)
            line = content[:m.start()].count('\n') + 1
            
            # Look for a nearby inner dialog content div (within next 1000 chars)
            context = content[m.start():m.start() + 2000]
            
            has_role_dialog = 'role="dialog"' in context or "role='dialog'" in context
            has_aria_modal = 'aria-modal' in context
            has_aria_hidden = 'aria-hidden="true"' in tag  # background overlay
            
            if not has_aria_hidden and not (has_role_dialog or has_aria_modal):
                issues.append(f'{fp}:{line}: missing role=dialog/aria-modal')

print('Fixed overlays missing dialog ARIA:')
for iss in issues[:20]:
    print(' ', iss)
