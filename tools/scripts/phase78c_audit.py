"""Phase 78c: audit landmark elements and missing accessibility patterns"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(WORKSPACE, 'src')

# 1. nav elements without aria-label
print("=== <nav> without aria-label ===")
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
            if '<nav' in l and 'aria-label' not in l:
                window = ''.join(lines[i:min(len(lines),i+3)])
                if 'aria-label' not in window and 'aria-labelledby' not in window:
                    print(f'{rel}:{i+1}: {l[:100]}')

# 2. role=region without accessible name
print("\n=== role=region without aria-label ===")
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
            if 'role="region"' in l and 'aria-label' not in l and 'aria-labelledby' not in l:
                window = ''.join(lines[i:min(len(lines),i+3)])
                if 'aria-label' not in window and 'aria-labelledby' not in window:
                    print(f'{rel}:{i+1}: {l[:100]}')

# 3. <section> elements without accessible name  
print("\n=== <section> without aria-label/labelledby ===")
findings = []
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
            if '<section' in l:
                window = ''.join(lines[i:min(len(lines),i+4)])
                has_label = 'aria-label' in window or 'aria-labelledby' in window
                if not has_label:
                    findings.append(f'{rel}:{i+1}: {l[:100]}')
for f in findings[:15]:
    print(f)
print(f'Total: {len(findings)}')

# 4. <details> elements  
print("\n=== <details> elements ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        if '<details' in content:
            print(f'{rel}: HAS details element')

# 5. Check for filter result counts that could use aria-live
print("\n=== Result count / filter patterns without aria-live ===")
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
            # Look for patterns like "نتيجة", "نتائج", showing result counts dynamically
            if ('نتيجة' in l or 'نتائج' in l or '.length}' in l) and 'aria-live' not in l and '{' in l:
                if not any(skip in l for skip in ['//','/*','aria-label','aria-describedby']):
                    print(f'{rel}:{i+1}: {l[:100]}')

print("\nDone.")
