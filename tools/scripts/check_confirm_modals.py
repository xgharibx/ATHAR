import os, re

# Find all confirm/delete/reset modals
patterns = ['confirmReset', 'confirmDelete', 'showConfirm', 'deleteModal', 'showDelete']

results = []
for root, dirs, files in os.walk('src'):
    for f in files:
        if not f.endswith('.tsx'):
            continue
        fp = os.path.join(root, f)
        with open(fp, encoding='utf-8') as fh:
            content = fh.read()
        
        for pat in patterns:
            if pat in content:
                has_dialog = 'role="dialog"' in content
                results.append(f'{fp}: has {pat}, role=dialog: {has_dialog}')
                break

print('Files with confirm modals:')
for r in results[:20]:
    print(' ', r)
