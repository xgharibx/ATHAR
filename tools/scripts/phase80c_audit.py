"""Phase 80c: audit aria-orientation on tablists and sliders, plus other remaining gaps"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(WORKSPACE, 'src')

# 1. role=tablist without aria-orientation
print("=== role=tablist without aria-orientation ===")
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
            if 'role="tablist"' in l and 'aria-orientation' not in l:
                window = ''.join(lines[i:min(len(lines),i+3)])
                if 'aria-orientation' not in window:
                    print(f'{rel}:{i+1}: {l[:100]}')

# 2. input type=range without aria-orientation  
print("\n=== input[type=range] without aria-orientation ===")
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
            if 'type="range"' in l and 'aria-orientation' not in l:
                window = ''.join(lines[i:min(len(lines),i+4)])
                if 'aria-orientation' not in window:
                    print(f'{rel}:{i+1}: {l[:100]}')

# 3. role=listbox without aria-label
print("\n=== role=listbox without aria-label ===")
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
            if 'role="listbox"' in l and 'aria-label' not in l:
                window = ''.join(lines[i:min(len(lines),i+3)])
                if 'aria-label' not in window:
                    print(f'{rel}:{i+1}: {l[:100]}')

# 4. Check for any missing autoFocus on newly opened dialogs
print("\n=== role=dialog without autoFocus inside ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        if 'role="dialog"' in content and 'autoFocus' not in content:
            print(f'{rel}: has dialog but NO autoFocus')

# 5. Count total ARIA attributes for summary
print("\n=== ARIA attribute count by file (top 10) ===")
counts = []
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        count = len(re.findall(r'aria-[a-z]+', content))
        if count > 0:
            counts.append((count, rel))
counts.sort(reverse=True)
for c, r in counts[:15]:
    print(f'  {c:4d}  {r}')

print("\nDone.")
