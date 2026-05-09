"""Phase 78 audit: look for missing aria-describedby, empty state aria improvements, 
and other a11y patterns not yet covered."""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 1. Find input elements that have a visible description nearby but lack aria-describedby
print("=== inputs/textareas without aria-describedby ===")
findings = []
for root, dirs, files in os.walk(os.path.join(WORKSPACE, 'src')):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            lines = f.readlines()
        for i, line in enumerate(lines):
            l = line.strip()
            if ('<input' in l or '<textarea' in l) and 'aria-describedby' not in l:
                # Only collect if it has some meaningful attributes
                if 'type=' in l or 'placeholder=' in l or 'value=' in l:
                    findings.append(f'{rel}:{i+1}: {l[:100]}')
for f in findings[:15]:
    print(f)
print(f'Total: {len(findings)}')

# 2. Find form elements with required/maxLength/minLength without proper ARIA hints
print("\n=== inputs with required/minLength without aria-required ===")
findings2 = []
for root, dirs, files in os.walk(os.path.join(WORKSPACE, 'src')):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        lines = content.splitlines()
        for i, line in enumerate(lines):
            l = line.strip()
            if ('<input' in l or '<textarea' in l) and ('required' in l or 'minLength' in l) and 'aria-required' not in l:
                findings2.append(f'{rel}:{i+1}: {l[:100]}')
for f in findings2[:10]:
    print(f)
print(f'Total: {len(findings2)}')

# 3. Find buttons that use title= attribute (should use aria-label instead)
print("\n=== buttons/icons with title= attribute ===")
findings3 = []
for root, dirs, files in os.walk(os.path.join(WORKSPACE, 'src')):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            lines = f.readlines()
        for i, line in enumerate(lines):
            l = line.strip()
            if 'title=' in l and ('<button' in l or '<Button' in l or '<IconButton' in l):
                findings3.append(f'{rel}:{i+1}: {l[:100]}')
for f in findings3[:10]:
    print(f)
print(f'Total: {len(findings3)}')

# 4. Find dialog/modal elements without aria-modal
print("\n=== divs acting as modals without role/aria-modal ===")
findings4 = []
for root, dirs, files in os.walk(os.path.join(WORKSPACE, 'src')):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        lines = content.splitlines()
        for i, line in enumerate(lines):
            l = line.strip()
            if 'role="dialog"' in l and 'aria-modal' not in l:
                findings4.append(f'{rel}:{i+1}: {l[:100]}')
for f in findings4[:10]:
    print(f)
print(f'Total: {len(findings4)}')

# 5. Find progressbar elements to check they have aria-valuenow etc
print("\n=== progressbar elements ===")
for root, dirs, files in os.walk(os.path.join(WORKSPACE, 'src')):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            lines = f.readlines()
        for i, line in enumerate(lines):
            l = line.strip()
            if 'role="progressbar"' in l:
                # check window of 4 lines for aria-valuenow
                window = ''.join(lines[i:min(len(lines),i+4)])
                has_value = 'aria-valuenow' in window
                print(f'{rel}:{i+1}: {"OK" if has_value else "MISSING valuenow"}: {l[:80]}')
