"""Phase 73g: Duas.tsx - add aria-controls to category tabs + id to list panel."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src', 'pages', 'Duas.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    # Add aria-controls to mapped category tabs
    (
        '                  role="tab"\n                  aria-selected={activeTab === cat.id}',
        '                  role="tab"\n                  aria-controls="duas-list-panel"\n                  aria-selected={activeTab === cat.id}',
        'Duas category tabs aria-controls'
    ),
    # Add aria-controls to favorites tab
    (
        '                role="tab"\n                aria-selected={activeTab === "__favorites__"}',
        '                role="tab"\n                aria-controls="duas-list-panel"\n                aria-selected={activeTab === "__favorites__"}',
        'Duas favorites tab aria-controls'
    ),
    # Add id to the list container
    (
        '      <div className="px-4 pt-4 space-y-4" role="list" aria-label="قائمة الأدعية">',
        '      <div id="duas-list-panel" className="px-4 pt-4 space-y-4" role="list" aria-label="قائمة الأدعية">',
        'Duas list panel id'
    ),
]

for old, new, label in patches:
    if old in c:
        c = c.replace(old, new)
        print(f'  OK  [{label}]')
    else:
        print(f'  MISS[{label}]')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('Done.')
