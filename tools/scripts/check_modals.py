import os, re

# Check for modal/overlay components that should use role=dialog
issues = []
for root, dirs, files in os.walk('src'):
    for f in files:
        if not f.endswith('.tsx'):
            continue
        fp = os.path.join(root, f)
        with open(fp, encoding='utf-8') as fh:
            content = fh.read()
        
        # Count fixed overlays (potential dialogs)
        fixed_overlays = content.count('fixed inset-0')
        has_aria_modal = 'aria-modal' in content
        has_role_dialog = 'role="dialog"' in content
        
        if fixed_overlays > 0 and not (has_aria_modal or has_role_dialog):
            issues.append(f'{fp}: {fixed_overlays} fixed overlays, no aria-modal/dialog')

print('Files with overlays but no aria-modal:')
for iss in issues[:20]:
    print(' ', iss)
