"""Phase 89 audit: Find remaining high-value ARIA gaps"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(WORKSPACE, 'src')

print("=== role=list without any listitem in same file ===")
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
            print(f'  {rel}: {count} list')

print("\n=== Inputs with id= but no matching aria-describedby anywhere ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            lines = f.readlines()
        content = ''.join(lines)
        for i, line in enumerate(lines):
            if '<input' in line:
                window = ''.join(lines[max(0,i-1):min(len(lines),i+8)])
                # Has aria-label but not aria-describedby
                if 'aria-label' in window and 'aria-describedby' not in window:
                    # Has an id= for the hint element
                    hint_match = re.search(r'id="([^"]+hint[^"]*)"', ''.join(lines[max(0,i-2):min(len(lines),i+15)]))
                    if hint_match:
                        print(f'  {rel}:{i+1}: input near hint id={hint_match.group(1)}')

print("\n=== Buttons inside form-like contexts without aria-label ===")
form_patterns = ['onSubmit', 'form', 'handleSubmit']
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        if not any(p in content for p in form_patterns): continue
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if '<input' in line and 'type="text"' in line:
                window = '\n'.join(lines[max(0,i-2):min(len(lines),i+5)])
                if 'aria-label' not in window and 'aria-labelledby' not in window:
                    label_near = '\n'.join(lines[max(0,i-5):i])
                    if 'label' not in label_near.lower():
                        print(f'  {rel}:{i+1}: {line.strip()[:80]}')

print("\n=== Pages missing aria-live for dynamic result counts ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        # Pages with search state but no aria-live for count
        has_search = 'filter' in content.lower() and ('results' in content.lower() or 'filtered' in content.lower())
        has_live = 'aria-live' in content
        if has_search and not has_live:
            lines = content.count('\n')
            if lines > 50:
                print(f'  {rel}: has filter but no aria-live ({lines} lines)')

print("\nDone.")
