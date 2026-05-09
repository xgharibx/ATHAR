"""Phase 87 audit: 
1. Favorites.tsx remove/delete buttons aria-label
2. Settings.tsx non-Radix toggles
3. VideoLibrary.tsx buttons
4. QuranPlans.tsx aria-live
5. City/country inputs autocomplete
"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def audit_file(rel_path, label=''):
    path = os.path.join(WORKSPACE, rel_path)
    if not os.path.exists(path):
        print(f'NOT FOUND: {rel_path}')
        return
    with open(path, encoding='utf-8') as f:
        lines = f.readlines()
    print(f'\n=== {label or rel_path} ({len(lines)} lines) ===')
    
    # Count ARIA attributes
    content = ''.join(lines)
    aria_count = len(re.findall(r'aria-\w+', content))
    role_count = len(re.findall(r'role=', content))
    button_count = len(re.findall(r'<button\b|<IconButton\b', content))
    live_count = len(re.findall(r'aria-live', content))
    input_count = len(re.findall(r'<input\b', content))
    
    print(f'  aria attrs: {aria_count}, roles: {role_count}, buttons: {button_count}, live regions: {live_count}, inputs: {input_count}')
    
    # Find buttons without aria-label (not IconButton which requires it)
    for i, line in enumerate(lines):
        l = line.strip()
        if '<button' in l and 'type=' in l and 'aria-label' not in l:
            # Check a 3-line window for aria-label
            window = ''.join(lines[max(0,i-1):min(len(lines),i+4)])
            if 'aria-label' not in window:
                print(f'  MISSING aria-label button L{i+1}: {l[:100]}')
    
    # Find inputs without aria-label or aria-labelledby or id
    for i, line in enumerate(lines):
        l = line.strip()
        if '<input' in l:
            window = ''.join(lines[max(0,i-2):min(len(lines),i+3)])
            if 'aria-label' not in window and 'aria-labelledby' not in window and 'id=' not in window:
                print(f'  MISSING input label L{i+1}: {l[:100]}')
    
    # Find autocomplete opportunities on city/country inputs
    for i, line in enumerate(lines):
        l = line.strip()
        if '<input' in l and ('city' in l.lower() or 'country' in l.lower() or 'مدينة' in l or 'بلد' in l):
            if 'autocomplete' not in l:
                window = ''.join(lines[max(0,i-1):min(len(lines),i+3)])
                if 'autocomplete' not in window:
                    print(f'  MISSING autocomplete L{i+1}: {l[:100]}')

audit_file('src/pages/Favorites.tsx', 'Favorites.tsx')
audit_file('src/pages/Settings.tsx', 'Settings.tsx')
audit_file('src/pages/VideoLibrary.tsx', 'VideoLibrary.tsx')
audit_file('src/pages/QuranPlans.tsx', 'QuranPlans.tsx')
audit_file('src/pages/PrayerTimes.tsx', 'PrayerTimes.tsx')

print('\nDone.')
