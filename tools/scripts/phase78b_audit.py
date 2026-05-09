"""Phase 78 deeper audit: clickable non-button divs, aria-haspopup, SVG titles"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(WORKSPACE, 'src')

# 1. Divs/spans with onClick that lack role/tabIndex (potential keyboard trap)
print("=== Clickable divs/spans without role or tabIndex ===")
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
            # Skip if it's a button/input/select/a/label already
            skip_tags = ['<button', '<input', '<select', '<a ', '<label', '<textarea', '<link']
            if any(t in l for t in skip_tags):
                continue
            # Check for onClick= on div/span/Card/li that doesn't have role=
            if 'onClick=' in l and ('role=' not in l):
                tag_match = re.match(r'<(div|span|Card|li|article|section|p)\s', l)
                if tag_match:
                    # Check surrounding 3 lines for role/tabIndex
                    window = ''.join(lines[i:min(len(lines),i+4)])
                    if 'role=' not in window and 'tabIndex' not in window:
                        findings.append(f'{rel}:{i+1}: {l[:100]}')
for f in findings[:20]:
    print(f)
print(f'Total: {len(findings)}')

# 2. Buttons opening menus/dropdowns -- check for aria-haspopup
print("\n=== Buttons opening menus/dropdowns without aria-haspopup ===")
findings2 = []
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
            if ('<button' in l or '<Button' in l or '<IconButton' in l) and 'aria-haspopup' not in l:
                # Check if it opens a menu/dropdown/popover
                window = ''.join(lines[i:min(len(lines),i+3)])
                keywords = ['setMenu', 'setDropdown', 'setPopover', 'toggleMenu', 'showMenu']
                if any(k in window for k in keywords):
                    findings2.append(f'{rel}:{i+1}: {l[:100]}')
for f in findings2[:15]:
    print(f)
print(f'Total: {len(findings2)}')

# 3. SVG elements that might need aria-hidden
print("\n=== SVG without aria-hidden (not inside aria-hidden parent) ===")
findings3 = []
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
            if '<svg' in l and 'aria-hidden' not in l and 'aria-label' not in l and 'role=' not in l:
                # Only report if it seems like a standalone decorative icon
                if 'viewBox=' in l and 'className=' in l:
                    findings3.append(f'{rel}:{i+1}: {l[:100]}')
for f in findings3[:15]:
    print(f)
print(f'Total: {len(findings3)}')

# 4. Find any img tags without alt attribute
print("\n=== img without alt ===")
findings4 = []
for root, dirs, files in os.walk(src):
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
            if '<img' in l and 'alt=' not in l:
                # Check next 3 lines
                window = ''.join(lines[i:min(len(lines),i+4)])
                if 'alt=' not in window:
                    findings4.append(f'{rel}:{i+1}: {l[:100]}')
for f in findings4[:10]:
    print(f)
print(f'Total: {len(findings4)}')
