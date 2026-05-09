"""Phase 85: Deeper audit of Settings, Leaderboard, Home, HadithMemo"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(WORKSPACE, 'src')

# Check for aria-live in specific files
for fname in ['Settings.tsx', 'Leaderboard.tsx', 'HadithMemo.tsx', 'Home.tsx']:
    path = os.path.join(src, 'pages', fname)
    if not os.path.exists(path): continue
    with open(path, encoding='utf-8') as f:
        content = f.read()
    print(f'\n=== {fname} ===')
    print(f'  aria-live: {content.count("aria-live")}')
    print(f'  aria-label: {content.count("aria-label")}')
    print(f'  aria-pressed: {content.count("aria-pressed")}')
    region_count = content.count('role="region"')
    print(f'  role=region: {region_count}')
    print(f'  Loading indicators: {content.count("isLoading") + content.count("loading")}')
    # Find loading-related divs without aria-live
    for i, line in enumerate(content.split('\n')):
        l = line.strip()
        if ('isLoading' in l or 'boardLoadState' in l) and '<div' in l:
            if 'aria-live' not in l and 'role="status"' not in l:
                print(f'  Line {i+1}: {l[:100]}')

# Check for missing aria-label on specific patterns  
print("\n=== Buttons missing aria-label in critical pages ===")
for fname in ['VideoLibrary.tsx', 'Leaderboard.tsx']:
    path = os.path.join(src, 'pages', fname)
    if not os.path.exists(path): continue
    with open(path, encoding='utf-8') as f:
        lines = f.readlines()
    for i, line in enumerate(lines):
        l = line.strip()
        if ('<button' in l or '<Button' in l) and 'aria-label' not in l and 'type="button"' in l:
            # Check window for aria-label
            window = ''.join(lines[i:min(len(lines),i+4)])
            if 'aria-label' not in window and '{...' not in window:
                # Check if has visible text in next few lines
                text_window = ''.join(lines[i+1:min(len(lines),i+4)])
                if len(text_window.strip()) > 0 and '<' not in text_window[:5]:
                    pass  # has visible text, might be OK
                else:
                    print(f'  src/pages/{fname}:{i+1}: {l[:90]}')

# Check role=complementary, role=banner usage  
print("\n=== Landmark roles overview ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        roles = re.findall(r'role="(main|navigation|search|banner|complementary|contentinfo|region|form|application)"', content)
        if roles:
            print(f'  {rel}: {roles}')

print("\nDone.")
