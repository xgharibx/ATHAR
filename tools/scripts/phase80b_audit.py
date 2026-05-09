"""Phase 80b: deeper check of VideoLibrary, Library, QuranPlans for sheets"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(WORKSPACE, 'src')

targets = [
    'pages/VideoLibrary.tsx',
    'pages/Library.tsx',
    'pages/QuranPlans.tsx',
    'pages/Quran.tsx',
    'pages/Search.tsx',
    'pages/Leaderboard.tsx',
    'components/layout/AppShell.tsx',
]

for rel in targets:
    path = os.path.join(src, rel.replace('/', os.sep))
    if not os.path.exists(path):
        continue
    with open(path, encoding='utf-8') as f:
        content = f.read()
    lines = content.splitlines()
    
    print(f'\n=== {rel} ===')
    # Find fixed positioned overlays / bottom sheets
    for i, line in enumerate(lines):
        l = line.strip()
        if (('fixed' in l or 'absolute' in l) and ('inset-0' in l or 'bottom-0' in l or 'z-[' in l)):
            role_check = 'role=' in l
            escape_check = 'Escape' in ''.join(lines[max(0,i-2):min(len(lines),i+5)])
            if not role_check:
                print(f'  L{i+1}: {l[:100]}')
