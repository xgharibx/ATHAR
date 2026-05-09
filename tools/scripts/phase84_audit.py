"""Phase 84 audit: tablist keyboard nav, aria-selected on tabs, aria-controls, missing search live regions"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(WORKSPACE, 'src')

# 1. role=tablist files - check for arrow key nav
print("=== role=tablist files - has arrow key nav? ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        if 'role="tablist"' not in content: continue
        has_arrow = 'ArrowLeft' in content or 'ArrowRight' in content
        has_tab_role = 'role="tab"' in content or "role={'tab'}" in content
        has_aria_selected = 'aria-selected' in content
        has_onkeydown = 'onKeyDown' in content and 'tablist' in content
        print(f'  {rel}: tab_role={has_tab_role} aria_selected={has_aria_selected} arrow_nav={has_arrow}')

# 2. role=tab without aria-selected
print("\n=== role=tab without aria-selected ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            lines = f.readlines()
        for i, line in enumerate(lines):
            l = line.strip()
            if 'role="tab"' in l and 'aria-selected' not in l:
                window = ''.join(lines[i:min(len(lines),i+5)])
                if 'aria-selected' not in window:
                    print(f'{rel}:{i+1}: {l[:100]}')

# 3. Pages with search input but NO sr-only aria-live for results
print("\n=== Search inputs without results count aria-live ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        if 'role="search"' not in content and 'type="search"' not in content:
            # Check for filter/search pattern
            if 'placeholder' in content and 'search' in content.lower() and 'filtered' in content:
                if 'aria-live' not in content:
                    print(f'{rel}: has search/filter but NO aria-live')

# 4. QuranVocab aria audit
print("\n=== QuranVocab.tsx ARIA overview ===")
vocab_path = os.path.join(src, 'pages', 'QuranVocab.tsx')
if os.path.exists(vocab_path):
    with open(vocab_path, encoding='utf-8') as f:
        content = f.read()
    print(f'  aria-live: {content.count("aria-live")}')
    print(f'  aria-label: {content.count("aria-label")}')
    print(f'  role=: {content.count("role=")}')
    print(f'  aria-pressed: {content.count("aria-pressed")}')
    print(f'  aria-expanded: {content.count("aria-expanded")}')
    # Check for search/filter patterns
    if 'filtered' in content or 'search' in content.lower():
        print(f'  has search/filter: YES')
        print(f'  has aria-live: {"YES" if "aria-live" in content else "NO -- MISSING"}')

print("\nDone.")
