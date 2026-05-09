"""Phase 79 audit: keyboard navigation patterns, focus traps, tab key handling"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(WORKSPACE, 'src')

# 1. Look for Escape key handling in sheets/drawers
print("=== Components with dialog/sheet that lack Escape handler ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        if 'role="dialog"' in content:
            has_escape = 'Escape' in content or 'escape' in content.lower()
            has_keydown = 'onKeyDown' in content or 'keydown' in content.lower()
            print(f'{rel}: escape={has_escape}, onKeyDown={has_keydown}')

# 2. Look for remaining patterns where forms have inputs
print("\n=== Forms/fieldsets patterns ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        if '<form' in content or '<Form' in content:
            lines = content.splitlines()
            for i, line in enumerate(lines):
                l = line.strip()
                if ('<form' in l.lower()) and 'aria-label' not in l:
                    window = ''.join(lines[i:min(len(lines),i+4)])
                    if 'aria-label' not in window and 'aria-labelledby' not in window:
                        print(f'{rel}:{i+1}: {l[:100]}')

# 3. Check for group elements without labels
print("\n=== role=group without aria-label ===")
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
            if 'role="group"' in l and 'aria-label' not in l:
                window = ''.join(lines[i:min(len(lines),i+4)])
                if 'aria-label' not in window and 'aria-labelledby' not in window:
                    print(f'{rel}:{i+1}: {l[:100]}')

# 4. Check for Mushaf sheets - do they have Escape handlers?
print("\n=== Mushaf sheets Escape handling ===")
mushaf = os.path.join(src, 'pages', 'Mushaf.tsx')
with open(mushaf, encoding='utf-8') as f:
    content = f.read()
lines = content.splitlines()
for i, line in enumerate(lines):
    l = line.strip()
    if 'mushaf-jump-sheet' in l or 'mushaf-note-sheet' in l:
        window = ''.join(lines[max(0,i-2):i+6])
        has_esc = 'Escape' in window or 'onKeyDown' in window
        print(f'line {i+1}: {l[:80]} | escape={has_esc}')

print("\nDone.")
