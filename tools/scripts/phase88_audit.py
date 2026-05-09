"""Phase 88 audit: autocomplete, aria-describedby on inputs, role=article, dynamic aria-live"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(WORKSPACE, 'src')

print("=== Inputs without autocomplete ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            lines = f.readlines()
        for i, line in enumerate(lines):
            if '<input' in line and 'type="text"' in line or ('<input' in line and 'type="search"' in line):
                window = ''.join(lines[max(0,i-1):min(len(lines),i+4)])
                if 'autocomplete' not in window and 'autoComplete' not in window:
                    print(f'  {rel}:{i+1}: {line.strip()[:80]}')

print("\n=== Inputs without aria-describedby (that have a visible hint/desc nearby) ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            lines = f.readlines()
        for i, line in enumerate(lines):
            if '<input' not in line: continue
            window = ''.join(lines[max(0,i-2):min(len(lines),i+6)])
            if 'aria-label' in window and 'aria-describedby' not in window and 'id=' in window:
                # Only flag if there's a hint text nearby (next 5 lines has text-xs or opacity)
                hint_window = ''.join(lines[min(len(lines),i+3):min(len(lines),i+10)])
                if 'text-xs' in hint_window or 'opacity' in hint_window:
                    print(f'  {rel}:{i+1}: {line.strip()[:80]}')

print("\n=== Pages with many items but no role=article or role=listitem ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        map_count = content.count('.map(')
        article_count = content.count('role="article"') + content.count('role="listitem"')
        if map_count > 5 and article_count == 0:
            # Only flag content pages
            lines = content.count('\n')
            if lines > 100:
                print(f'  {rel}: {map_count} maps, 0 article/listitem roles ({lines} lines)')

print("\nDone.")
