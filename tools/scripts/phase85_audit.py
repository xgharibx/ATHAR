"""Phase 85 audit: remaining accessibility gaps in lower-density pages"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(WORKSPACE, 'src')

# 1. Check search inputs for role=search wrapper
print("=== Search inputs - role=search present? ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        has_search_input = 'type="search"' in content or ('placeholder' in content and 'search' in content.lower() and '<input' in content)
        has_role_search = 'role="search"' in content
        if has_search_input and not has_role_search:
            print(f'  MISSING role=search: {rel}')
        elif has_search_input and has_role_search:
            print(f'  OK: {rel}')

# 2. Pages list (all pages) with their aria summary
print("\n=== All pages ARIA density ===")
pages_dir = os.path.join(src, 'pages')
for fn in sorted(os.listdir(pages_dir)):
    if not fn.endswith('.tsx'): continue
    path = os.path.join(pages_dir, fn)
    with open(path, encoding='utf-8') as f:
        content = f.read()
    aria = len(re.findall(r'aria-[a-z]+', content))
    role = len(re.findall(r'role="', content))
    buttons = content.count('<button')
    inputs = len(re.findall(r'<input|<textarea|<select', content))
    live = content.count('aria-live')
    print(f'  {fn:35s} aria={aria:3d} role={role:2d} buttons={buttons:3d} inputs={inputs:2d} live={live:2d}')

print("\nDone.")
