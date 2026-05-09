"""Phase 73 audit: Check which tablist pages have tabpanel elements."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar\src'
pages_to_check = [
    'pages/Duas.tsx',
    'pages/AsmaAlHusna.tsx',
    'pages/Companions.tsx',
    'pages/HadithBooks.tsx',
    'pages/HadithMemo.tsx',
    'pages/Search.tsx',
    'pages/Leaderboard.tsx',
    'pages/Quran.tsx',
]
for rel in pages_to_check:
    path = os.path.join(base, rel)
    with open(path, encoding='utf-8') as f:
        lines = f.readlines()
    has_panel = any('tabpanel' in l for l in lines)
    has_controls = any('aria-controls' in l for l in lines)
    tabs_count = sum(1 for l in lines if 'role="tab"' in l and 'querySelectorAll' not in l)
    print(f'{rel}: tabs={tabs_count} has_panel={has_panel} has_controls={has_controls}')
print('Done.')
