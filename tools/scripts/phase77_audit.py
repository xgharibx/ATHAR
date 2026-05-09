import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# 1. tabpanels without aria-labelledby
print("=== tabpanel without aria-labelledby ===")
findings = []
for root, dirs, files in os.walk('src'):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        for m in re.finditer(r'role="tabpanel"[^>]*>', content):
            if 'aria-labelledby' not in m.group(0):
                ln = content[:m.start()].count('\n') + 1
                findings.append(f'{path}:{ln}: {m.group(0)[:100].replace(chr(10)," ")}')
for f in findings:
    print(f)
print(f'Total: {len(findings)}')

# 2. role=status without aria-live
print("\n=== role=status without aria-live ===")
findings2 = []
for root, dirs, files in os.walk('src'):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        for m in re.finditer(r'role="status"[^>]*>', content):
            if 'aria-live' not in m.group(0):
                ln = content[:m.start()].count('\n') + 1
                findings2.append(f'{path}:{ln}: {m.group(0)[:100].replace(chr(10)," ")}')
for f in findings2:
    print(f)
print(f'Total: {len(findings2)}')

# 3. Buttons inside nav/ul without visible text AND without aria-label
print("\n=== aria-live without aria-atomic ===")
findings3 = []
for root, dirs, files in os.walk('src'):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        lines = content.splitlines()
        for i, line in enumerate(lines):
            if 'aria-live=' in line and 'aria-atomic' not in line:
                # Check if it's part of a larger element opening that continues
                findings3.append(f'{path}:{i+1}: {line.strip()[:100]}')
for f in findings3[:20]:
    print(f)
print(f'Total: {len(findings3)}')

# 4. Check for role=tab without aria-selected
print("\n=== role=tab without aria-selected ===")
findings4 = []
for root, dirs, files in os.walk('src'):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        with open(path, encoding='utf-8') as f:
            lines = f.readlines()
        for i, line in enumerate(lines):
            l = line.strip()
            if 'role="tab"' in l and 'aria-selected' not in l:
                findings4.append(f'{path}:{i+1}: {l[:100]}')
for f in findings4[:20]:
    print(f)
print(f'Total role=tab without aria-selected: {len(findings4)}')
