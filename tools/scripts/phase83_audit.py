"""Phase 83 audit: aria-haspopup, aria-expanded gaps, and form association issues"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(WORKSPACE, 'src')

# 1. Buttons with show/setShow patterns but missing aria-expanded
print("=== Buttons toggling state without aria-expanded ===")
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
            # Look for onClick patterns that toggle boolean state
            if re.search(r'onClick.*setShow|onClick.*toggle|onClick.*=> set\w+(!\w+|true|false)', l):
                if 'aria-expanded' not in l:
                    window = ''.join(lines[max(0,i-1):min(len(lines),i+4)])
                    if 'aria-expanded' not in window:
                        print(f'{rel}:{i+1}: {l[:120]}')

# 2. aria-haspopup audit - buttons opening sheets/dialogs/menus
print("\n=== Buttons opening dialogs without aria-haspopup ===")
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
            # Buttons opening sheets (setShow_Sheet=true, setOpen, etc.)
            if re.search(r'onClick.*setShow\w+Sheet|onClick.*setShowSheet|onClick.*setOpen\(true\)', l):
                if 'aria-haspopup' not in l:
                    window = ''.join(lines[max(0,i-3):min(len(lines),i+3)])
                    if 'aria-haspopup' not in window:
                        print(f'{rel}:{i+1}: {l[:120]}')

# 3. Input elements without labels
print("\n=== Input/textarea without aria-label or id/label association ===")
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
            if re.search(r'<input\b|<textarea\b', l) and 'type="hidden"' not in l:
                window = ''.join(lines[i:min(len(lines),i+8)])
                if 'aria-label' not in window and 'aria-labelledby' not in window and 'htmlFor' not in window:
                    # Check if there's an id that might have a label above
                    if 'id=' not in window and 'aria-describedby' not in window:
                        print(f'{rel}:{i+1}: {l[:100]}')

# 4. iframe without title
print("\n=== iframe without title ===")
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
            if '<iframe' in l and 'title' not in l:
                window = ''.join(lines[i:min(len(lines),i+5)])
                if 'title=' not in window:
                    print(f'{rel}:{i+1}: {l[:100]}')

# 5. Summary stats
print("\n=== Files with most remaining improvement potential ===")
counts = {}
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        aria_count = len(re.findall(r'aria-[a-z]+', content))
        button_count = content.count('<button')
        input_count = len(re.findall(r'<input|<textarea|<select', content))
        # ratio of aria attrs to interactive elements
        total_interactive = button_count + input_count
        if total_interactive > 0:
            ratio = aria_count / total_interactive
            counts[rel] = (aria_count, total_interactive, round(ratio, 1))

sorted_counts = sorted(counts.items(), key=lambda x: x[1][2])
print("(lowest aria/interactive ratios = most work remaining)")
for r, (a, i, ratio) in sorted_counts[:10]:
    print(f'  ratio={ratio:5.1f}  aria={a:3d}  interactive={i:3d}  {r}')

print("\nDone.")
