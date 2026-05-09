"""Phase 88b audit: sections without aria-label, dialog landmarks, Leaderboard list structure"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(WORKSPACE, 'src')

print("=== <section> tags without aria-label or aria-labelledby ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            lines = f.readlines()
        for i, line in enumerate(lines):
            if '<section' in line:
                window = line + (lines[i+1] if i+1 < len(lines) else '')
                if 'aria-label' not in window and 'aria-labelledby' not in window:
                    print(f'  {rel}:{i+1}: {line.strip()[:80]}')

print("\n=== role=list containers with 0 listitem children ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        if 'role="list"' in content and 'role="listitem"' not in content:
            count = content.count('role="list"')
            print(f'  {rel}: {count} list, 0 listitem')

print("\n=== Leaderboard.tsx list structure ===")
lb_path = os.path.join(WORKSPACE, 'src', 'pages', 'Leaderboard.tsx')
with open(lb_path, encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    l = line.strip()
    if ('space-y-2' in l or 'space-y-3' in l) and 'div' in l:
        # Check if this is a row container
        window = ''.join(lines[i:min(len(lines),i+5)])
        if '.map(' in window:
            print(f'  L{i+1}: {l[:80]}')

print("\nDone.")
