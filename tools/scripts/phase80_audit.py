"""Phase 80 audit: comprehensive check for remaining a11y gaps"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(WORKSPACE, 'src')

# 1. Check remaining <nav> structures (looking at FloatingNav and AppShell more deeply)
print("=== All nav elements and their aria-labels ===")
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
            if '<nav' in l:
                window = ' '.join(x.strip() for x in lines[i:min(len(lines),i+4)])
                label = re.search(r'aria-label="([^"]+)"', window)
                print(f'{rel}:{i+1}: label="{label.group(1) if label else "NONE"}"')

# 2. Check if there are any sheets in other pages with role=dialog but missing Escape
print("\n=== Other pages with sheets/drawers missing Escape ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        # Look for patterns that suggest a bottom sheet without Escape handling
        has_sheet = ('fixed inset-0' in content or 'backdrop-blur' in content or 'glass-strong' in content)
        has_overlay = 'bg-black/4' in content or 'bg-black/3' in content or 'bg-black/5' in content or 'bg-black/6' in content
        has_role_dialog = 'role="dialog"' in content
        if has_sheet and not has_role_dialog and has_overlay:
            print(f'{rel}: potential sheet without role=dialog')

# 3. Check for VideoLibrary sheets/modals
print("\n=== VideoLibrary dialog/sheet patterns ===")
vl_path = os.path.join(src, 'pages', 'VideoLibrary.tsx')
with open(vl_path, encoding='utf-8') as f:
    content = f.read()
lines = content.splitlines()
for i, line in enumerate(lines):
    l = line.strip()
    if 'role="dialog"' in l or 'fixed inset-0' in l or ('z-[' in l and 'fixed' in l and ('backdrop' in l or 'overlay' in l)):
        print(f'Line {i+1}: {l[:100]}')

# 4. Check for Library/LibraryItem sheets  
print("\n=== Library.tsx dialog/sheet patterns ===")
lib_path = os.path.join(src, 'pages', 'Library.tsx')
with open(lib_path, encoding='utf-8') as f:
    content = f.read()
for m in re.finditer(r'role="dialog"[^>]*>', content):
    ln = content[:m.start()].count('\n') + 1
    print(f'Line {ln}: {m.group(0)[:120]}')
if 'role="dialog"' not in content:
    print('Library.tsx: NO dialog role')

# 5. Check Settings.tsx for any remaining a11y patterns
print("\n=== Settings.tsx - any sheets/dialogs ===")
settings_path = os.path.join(src, 'pages', 'Settings.tsx')
with open(settings_path, encoding='utf-8') as f:
    content = f.read()
for m in re.finditer(r'role="dialog"[^>]*>', content):
    ln = content[:m.start()].count('\n') + 1
    print(f'Line {ln}: {m.group(0)[:100]}')
if 'role="dialog"' not in content:
    print('Settings.tsx: NO dialog role (uses Radix/direct forms)')

print("\nDone.")
